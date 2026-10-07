const db = require('../database');
const GoogleMapsScraper = require('../scraper/googleMapsScraper');
const logger = require('../utils/logger');
const config = require('../config');

class WorkerQueue {
  constructor() {
    this.activeWorkers = new Map();
    this.interval = null;
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.processQueue(), 2000);
    
    // Clean up interrupted jobs on startup
    const interrupted = db.prepare("SELECT id FROM jobs WHERE status IN ('starting', 'running', 'paused')").all();
    for (const job of interrupted) {
      db.prepare("UPDATE jobs SET status = 'failed', errorCode = 'SERVER_RESTART', errorMessage = 'Server was restarted' WHERE id = ?").run(job.id);
      logger.info(`Marked job ${job.id} as failed due to server restart.`);
    }
  }

  async processQueue() {
    if (this.activeWorkers.size >= config.maxConcurrentJobs) {
      return;
    }

    const nextJob = db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY createdAt ASC LIMIT 1").get();
    
    if (nextJob) {
      this.runJob(nextJob);
    }
  }

  async runJob(jobRecord) {
    if (this.activeWorkers.has(jobRecord.id)) return;
    
    const scraper = new GoogleMapsScraper(jobRecord);
    this.activeWorkers.set(jobRecord.id, scraper);
    
    logger.info(`Starting worker for job ${jobRecord.id}`);
    
    try {
      await scraper.start();
    } catch (err) {
      logger.error(`Worker threw error for job ${jobRecord.id}`, { error: err.message });
    } finally {
      this.activeWorkers.delete(jobRecord.id);
    }
  }

  getWorker(jobId) {
    return this.activeWorkers.get(jobId);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    // Attempt to cancel all active workers gracefully
    for (const [jobId, worker] of this.activeWorkers.entries()) {
      worker.cancel();
    }
  }
}

const workerQueue = new WorkerQueue();
module.exports = workerQueue;
