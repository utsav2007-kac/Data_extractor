const BrowserManager = require('./browser');
const ChallengeDetector = require('./challengeDetector');
const selectors = require('./selectors');
const Parser = require('./parser');
const Validator = require('./validator');
const Deduplicator = require('./deduplicator');
const logger = require('../utils/logger');
const db = require('../database');
const eventBus = require('../services/eventBus');
const config = require('../config');
const { sleep, randomDelay } = require('../utils/retry');

class GoogleMapsScraper {
  constructor(job) {
    this.job = job;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.deduplicator = new Deduplicator(job.id);
    this.isPaused = false;
    this.isCancelled = false;
  }

  async start() {
    try {
      this.updateJobStatus('starting');
      const { browser, context, page } = await BrowserManager.launch();
      this.browser = browser;
      this.context = context;
      this.page = page;

      // Navigate to Maps
      this.updateJobStatus('running');
      const query = encodeURIComponent(`${this.job.keyword} in ${this.job.location}`);
      const url = `https://www.google.com/maps/search/${query}`;
      
      logger.info(`Job ${this.job.id} navigating to ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.navigationTimeout });
      
      await this.checkChallenge();

      // Ensure we hit the feed
      await this.page.waitForSelector(selectors.feedContainer, { timeout: config.selectorTimeout }).catch(() => null);
      await this.checkChallenge();

      await this.extractLoop();
      
    } catch (error) {
      if (this.isCancelled) return;
      logger.error(`Job ${this.job.id} failed`, { error: error.message, stack: error.stack });
      this.updateJobStatus('failed', { errorCode: 'SCRAPER_ERROR', errorMessage: error.message });
    } finally {
      await this.cleanup();
    }
  }

  async checkChallenge() {
    const challenge = await ChallengeDetector.detect(this.page);
    if (challenge.detected) {
      logger.warn(`Challenge detected for job ${this.job.id}: ${challenge.reason}`);
      this.updateJobStatus('blocked', { blockedReason: challenge.reason });
      throw new Error(`MAPS_CHALLENGE: ${challenge.reason}`);
    }
  }

  async extractLoop() {
    let scrollAttempts = 0;
    const maxScrollAttempts = 1000; // safety bound
    let lastResultCount = 0;

    while (scrollAttempts < maxScrollAttempts) {
      if (this.isCancelled) break;
      while (this.isPaused && !this.isCancelled) {
        await sleep(1000); // Wait while paused
      }

      await this.checkChallenge();

      const resultCards = await this.page.$$(selectors.resultCard);
      
      // We iterate over the ones we haven't processed in this pass (or we just iterate all and dedupe handles it)
      for (let i = 0; i < resultCards.length; i++) {
        if (this.isCancelled || this.isPaused) break;
        if (this.job.saved >= this.job.target) break;

        const card = resultCards[i];
        
        try {
          // Scroll card into view
          await card.scrollIntoViewIfNeeded().catch(() => null);
          
          // Click the link inside the card to open details
          const link = await card.$(selectors.resultLink);
          if (!link) continue;
          
          const href = await link.getAttribute('href');
          
          // Quick pre-dedupe check by URL if possible
          if (href && this.deduplicator.isDuplicate({ mapsUrl: href })) {
            continue; 
          }

          // Need to process this one
          db.prepare('UPDATE jobs SET processed = processed + 1 WHERE id = ?').run(this.job.id);
          this.job.processed++;

          // Click it
          await link.click().catch(() => null);
          await randomDelay(config.minDelayMs, config.maxDelayMs); // Human-like delay
          await this.checkChallenge();

          // Wait for business name to appear to ensure detail pane is loaded
          await this.page.waitForSelector(selectors.businessName, { timeout: config.selectorTimeout }).catch(() => null);
          
          // Extract
          const pageUrl = this.page.url();
          const lead = await Parser.parseBusinessPage(this.page, pageUrl);
          
          if (Validator.validate(lead)) {
            lead.jobId = this.job.id;
            lead.scrapedAt = new Date().toISOString();
            lead.source = 'google_maps';
            lead.extractionStatus = 'success';
            lead.firstSeenAt = new Date().toISOString();

            if (this.deduplicator.isDuplicate(lead)) {
              this.incrementCounter('duplicates');
              eventBus.emitEvent(this.job.id, 'duplicate_skipped');
            } else {
              this.saveLead(lead);
            }
          } else {
             this.incrementCounter('failed');
             eventBus.emitEvent(this.job.id, 'record_failed');
          }

        } catch (err) {
          logger.error(`Error processing card for job ${this.job.id}`, { error: err.message });
          this.incrementCounter('failed');
          eventBus.emitEvent(this.job.id, 'record_failed');
        }
      }

      if (this.job.saved >= this.job.target) {
        this.updateJobStatus('completed');
        break;
      }

      // Check if end of list
      const endMarker = await this.page.$(selectors.endOfListMarker).catch(() => null);
      if (endMarker) {
        logger.info(`End of list reached for job ${this.job.id}`);
        this.updateJobStatus(this.job.saved > 0 ? 'completed_partial' : 'completed');
        break;
      }

      // Try scrolling the feed to load more
      if (resultCards.length === lastResultCount) {
        // Scroll the feed container itself
        await this.page.evaluate((sel) => {
          const feed = document.querySelector(sel);
          if (feed) feed.scrollTop = feed.scrollHeight;
        }, selectors.feedContainer).catch(() => null);
        await sleep(config.scrollDelayMs);
      }
      
      lastResultCount = resultCards.length;
      scrollAttempts++;
    }
  }

  saveLead(lead) {
    const insert = db.prepare(`
      INSERT INTO leads (
        id, jobId, placeId, businessName, category, phone, address, 
        city, region, postalCode, country, rating, reviewCount, 
        website, mapsUrl, latitude, longitude, scrapedAt, source, extractionStatus, firstSeenAt
      ) VALUES (
        @id, @jobId, @placeId, @businessName, @category, @phone, @address,
        @city, @region, @postalCode, @country, @rating, @reviewCount,
        @website, @mapsUrl, @latitude, @longitude, @scrapedAt, @source, @extractionStatus, @firstSeenAt
      )
    `);

    lead.id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction = db.transaction((l) => {
      insert.run(l);
      db.prepare('UPDATE jobs SET saved = saved + 1, progress = MIN((saved + 1) * 100.0 / target, 100) WHERE id = ?').run(l.jobId);
    });

    try {
      transaction(lead);
      this.job.saved++;
      this.job.progress = Math.min((this.job.saved * 100.0) / this.job.target, 100);
      this.deduplicator.markSeen(lead);
      eventBus.emitEvent(this.job.id, 'business_saved', { lead });
      eventBus.emitEvent(this.job.id, 'progress', { saved: this.job.saved, target: this.job.target, progress: this.job.progress });
    } catch (error) {
      // e.g. UNIQUE constraint failure
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        this.incrementCounter('duplicates');
        eventBus.emitEvent(this.job.id, 'duplicate_skipped');
      } else {
        logger.error(`Database error saving lead for job ${this.job.id}`, { error: error.message });
        this.incrementCounter('failed');
      }
    }
  }

  incrementCounter(counter) {
    if (['failed', 'duplicates'].includes(counter)) {
      db.prepare(`UPDATE jobs SET ${counter} = ${counter} + 1 WHERE id = ?`).run(this.job.id);
      this.job[counter]++;
    }
  }

  updateJobStatus(status, extra = {}) {
    // Only update if we aren't overriding a blocked or cancelled state incorrectly
    if (this.job.status === 'blocked' && status !== 'blocked') return;
    if (this.job.status === 'cancelled' && status !== 'cancelled') return;

    this.job.status = status;
    const updates = ['status = @status'];
    const params = { id: this.job.id, status };

    if (extra.errorCode) { updates.push('errorCode = @errorCode'); params.errorCode = extra.errorCode; }
    if (extra.errorMessage) { updates.push('errorMessage = @errorMessage'); params.errorMessage = extra.errorMessage; }
    if (extra.blockedReason) { updates.push('blockedReason = @blockedReason'); params.blockedReason = extra.blockedReason; }
    if (['completed', 'completed_partial', 'failed', 'blocked', 'cancelled'].includes(status)) {
      updates.push('finishedAt = @finishedAt');
      params.finishedAt = new Date().toISOString();
    }
    updates.push('updatedAt = @updatedAt');
    params.updatedAt = new Date().toISOString();

    db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = @id`).run(params);
    eventBus.emitEvent(this.job.id, status, extra);
    
    // Log event in DB
    db.prepare('INSERT INTO job_events (jobId, eventType, eventData, createdAt) VALUES (?, ?, ?, ?)').run(
      this.job.id, status, JSON.stringify(extra), new Date().toISOString()
    );
  }

  pause() {
    this.isPaused = true;
    this.updateJobStatus('paused');
  }

  resume() {
    this.isPaused = false;
    this.updateJobStatus('running');
    eventBus.emitEvent(this.job.id, 'resumed');
  }

  cancel() {
    this.isCancelled = true;
    this.updateJobStatus('cancelled');
  }

  async cleanup() {
    await BrowserManager.close(this.browser, this.context, this.page);
  }
}

module.exports = GoogleMapsScraper;
