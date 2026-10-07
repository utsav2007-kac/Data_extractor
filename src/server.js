const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const workerQueue = require('./services/workerQueue');

// Import routes
const jobsRouter = require('./routes/jobs');
const exportsRouter = require('./routes/exports');
const healthRouter = require('./routes/health');

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts in our simple vanilla JS frontend for ease, can be tightened for real prod
}));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static frontend
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/jobs', exportsRouter); // /api/jobs/:jobId/export.*

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Server Error', { error: err.stack });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } });
});

// Start server
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Server running on port ${config.port} in ${config.env} mode`);
  workerQueue.start();
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Graceful shutdown initiated...');
  
  workerQueue.stop();
  
  server.close(() => {
    logger.info('HTTP server closed.');
    
    // Close DB
    const db = require('./database');
    if (db) db.close();
    
    process.exit(0);
  });
  
  // Force exit if taking too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
