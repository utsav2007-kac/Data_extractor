const { DatabaseSync } = require('node:sqlite');
const config = require('./config');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

// Ensure DB directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(config.dbPath);

// Better-sqlite3 transaction wrapper for compatibility
db.transaction = function(fn) {
  return function(...args) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (

      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      location TEXT NOT NULL,
      target INTEGER NOT NULL,
      processed INTEGER DEFAULT 0,
      saved INTEGER DEFAULT 0,
      duplicates INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      progress REAL DEFAULT 0.0,
      startedAt TEXT,
      finishedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      errorCode TEXT,
      errorMessage TEXT,
      blockedReason TEXT
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      jobId TEXT NOT NULL,
      placeId TEXT,
      businessName TEXT NOT NULL,
      category TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      region TEXT,
      postalCode TEXT,
      country TEXT,
      rating REAL,
      reviewCount INTEGER,
      website TEXT,
      mapsUrl TEXT,
      latitude REAL,
      longitude REAL,
      scrapedAt TEXT NOT NULL,
      source TEXT NOT NULL,
      extractionStatus TEXT NOT NULL,
      firstSeenAt TEXT NOT NULL,
      FOREIGN KEY (jobId) REFERENCES jobs (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jobId TEXT NOT NULL,
      eventType TEXT NOT NULL,
      eventData TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (jobId) REFERENCES jobs (id) ON DELETE CASCADE
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_leads_jobId ON leads(jobId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_placeId ON leads(jobId, placeId) WHERE placeId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_mapsUrl ON leads(jobId, mapsUrl) WHERE mapsUrl IS NOT NULL;
    -- Note: Additional app-level deduplication is needed for nulls
  `);
  logger.info('Database initialized successfully.');
}

initDb();

module.exports = db;
