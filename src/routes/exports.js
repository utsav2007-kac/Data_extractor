const express = require('express');
const { stringify } = require('csv-stringify/sync');
const xlsx = require('xlsx');
const db = require('../database');
const JobManager = require('../services/jobManager');

const router = express.Router();

function getJobLeads(jobId) {
  return db.prepare('SELECT * FROM leads WHERE jobId = ? ORDER BY scrapedAt ASC').all(jobId);
}

function sanitizeForCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Prevent spreadsheet injection
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

router.get('/:jobId/export.csv', (req, res) => {
  const job = JobManager.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const leads = getJobLeads(job.id);
  
  const sanitizedLeads = leads.map(l => ({
    BusinessName: sanitizeForCsv(l.businessName),
    Category: sanitizeForCsv(l.category),
    Phone: sanitizeForCsv(l.phone),
    Address: sanitizeForCsv(l.address),
    Website: sanitizeForCsv(l.website),
    Rating: sanitizeForCsv(l.rating),
    ReviewCount: sanitizeForCsv(l.reviewCount),
    MapsUrl: sanitizeForCsv(l.mapsUrl),
    ScrapedAt: sanitizeForCsv(l.scrapedAt)
  }));

  try {
    const csvData = stringify(sanitizedLeads, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="job_${job.id}_leads.csv"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate CSV' });
  }
});

router.get('/:jobId/export.json', (req, res) => {
  const job = JobManager.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const leads = getJobLeads(job.id);
  
  res.json({
    jobId: job.id,
    exportedAt: new Date().toISOString(),
    count: leads.length,
    leads: leads.map(l => {
      // Remove internal DB ids if necessary, or keep them. We'll keep them as per requested fields.
      const { id, jobId, ...rest } = l;
      return rest;
    })
  });
});

router.get('/:jobId/export.xlsx', (req, res) => {
  const job = JobManager.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const leads = getJobLeads(job.id);
  
  const sanitizedLeads = leads.map(l => ({
    BusinessName: sanitizeForCsv(l.businessName),
    Category: sanitizeForCsv(l.category),
    Phone: sanitizeForCsv(l.phone),
    Address: sanitizeForCsv(l.address),
    Website: sanitizeForCsv(l.website),
    Rating: l.rating,
    ReviewCount: l.reviewCount,
    MapsUrl: sanitizeForCsv(l.mapsUrl),
    ScrapedAt: sanitizeForCsv(l.scrapedAt)
  }));

  try {
    const ws = xlsx.utils.json_to_sheet(sanitizedLeads);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Leads');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="job_${job.id}_leads.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate XLSX' });
  }
});

module.exports = router;
