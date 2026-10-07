const express = require('express');
const { z } = require('zod');
const JobManager = require('../services/jobManager');
const eventBus = require('../services/eventBus');

const router = express.Router();

const createJobSchema = z.object({
  keyword: z.string().min(1).max(1000),
  location: z.string().min(1).max(1000),
  leadLimit: z.number().int().positive()
});

router.post('/', (req, res) => {
  try {
    const validated = createJobSchema.parse(req.body);
    
    // Check against global max lead limit
    const config = require('../config');
    const target = Math.min(validated.leadLimit, config.maxLeadLimit);

    const jobId = JobManager.createJob({
      keyword: validated.keyword,
      location: validated.location,
      target
    });

    res.json({ success: true, jobId, status: 'queued' });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.errors ? err.errors : err.message } });
  }
});

router.get('/', (req, res) => {
  const jobs = JobManager.getJobs();
  res.json({ success: true, jobs });
});

router.get('/:jobId', (req, res) => {
  const job = JobManager.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
  res.json({ success: true, job });
});

router.post('/:jobId/pause', (req, res) => {
  const success = JobManager.pauseJob(req.params.jobId);
  res.json({ success });
});

router.post('/:jobId/resume', (req, res) => {
  const success = JobManager.resumeJob(req.params.jobId);
  res.json({ success });
});

router.post('/:jobId/cancel', (req, res) => {
  const success = JobManager.cancelJob(req.params.jobId);
  res.json({ success });
});

router.delete('/:jobId', (req, res) => {
  JobManager.deleteJob(req.params.jobId);
  res.json({ success: true });
});

router.get('/:jobId/leads', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const data = JobManager.getLeads(req.params.jobId, page, limit);
  res.json({ success: true, ...data });
});

// SSE endpoint
router.get('/:jobId/events', (req, res) => {
  const jobId = req.params.jobId;
  const job = JobManager.getJob(jobId);
  
  if (!job) {
    return res.status(404).send('Job not found');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onEvent = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  eventBus.on(`job:${jobId}`, onEvent);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    eventBus.off(`job:${jobId}`, onEvent);
    clearInterval(heartbeat);
  });
});

module.exports = router;
