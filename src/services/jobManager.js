const db = require('../database');
const workerQueue = require('./workerQueue');

class JobManager {
  static createJob({ keyword, location, target }) {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO jobs (id, keyword, location, target, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'queued', ?, ?)
    `);
    
    stmt.run(id, keyword, location, target, now, now);
    
    db.prepare('INSERT INTO job_events (jobId, eventType, createdAt) VALUES (?, ?, ?)').run(id, 'job_queued', now);
    
    return id;
  }

  static getJob(id) {
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  }

  static getJobs() {
    return db.prepare('SELECT * FROM jobs ORDER BY createdAt DESC').all();
  }

  static pauseJob(id) {
    const worker = workerQueue.getWorker(id);
    if (worker) {
      worker.pause();
      return true;
    }
    // If job is 'queued', we can't pause the worker, just update DB
    const job = this.getJob(id);
    if (job && job.status === 'queued') {
      db.prepare("UPDATE jobs SET status = 'paused', updatedAt = ? WHERE id = ?").run(new Date().toISOString(), id);
      return true;
    }
    return false;
  }

  static resumeJob(id) {
    const worker = workerQueue.getWorker(id);
    if (worker) {
      worker.resume();
      return true;
    }
    
    const job = this.getJob(id);
    if (job && job.status === 'paused') {
      db.prepare("UPDATE jobs SET status = 'queued', updatedAt = ? WHERE id = ?").run(new Date().toISOString(), id);
      return true;
    }
    return false;
  }

  static cancelJob(id) {
    const worker = workerQueue.getWorker(id);
    const now = new Date().toISOString();
    if (worker) {
      worker.cancel();
      return true;
    }
    
    const job = this.getJob(id);
    if (job && ['queued', 'paused'].includes(job.status)) {
      db.prepare("UPDATE jobs SET status = 'cancelled', finishedAt = ?, updatedAt = ? WHERE id = ?").run(now, now, id);
      return true;
    }
    return false;
  }

  static deleteJob(id) {
    // Delete cascading will handle leads and events
    db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  }

  static getLeads(jobId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const leads = db.prepare('SELECT * FROM leads WHERE jobId = ? ORDER BY scrapedAt DESC LIMIT ? OFFSET ?').all(jobId, limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM leads WHERE jobId = ?').get(jobId).count;
    return { leads, total, page, limit };
  }
}

module.exports = JobManager;
