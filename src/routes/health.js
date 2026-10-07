const express = require('express');
const db = require('../database');
const workerQueue = require('../services/workerQueue');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const activeJobs = workerQueue.activeWorkers.size;
    const queuedJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'queued'").get().count;
    
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      activeJobs,
      queuedJobs,
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      database: 'disconnected'
    });
  }
});

module.exports = router;
