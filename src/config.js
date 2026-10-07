require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  dbPath: process.env.DATABASE_PATH || './data/database.sqlite',
  maxLeadLimit: parseInt(process.env.MAX_LEAD_LIMIT, 10) || 5000,
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS, 10) || 2,
  navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT, 10) || 30000,
  selectorTimeout: parseInt(process.env.SELECTOR_TIMEOUT, 10) || 10000,
  jobTimeout: parseInt(process.env.JOB_TIMEOUT, 10) || 3600000,
  retryLimit: parseInt(process.env.RETRY_LIMIT, 10) || 3,
  retryBaseDelay: parseInt(process.env.RETRY_BASE_DELAY, 10) || 1000,
  minDelayMs: parseInt(process.env.MIN_DELAY_MS, 10) || 500,
  maxDelayMs: parseInt(process.env.MAX_DELAY_MS, 10) || 2000,
  scrollDelayMs: parseInt(process.env.SCROLL_DELAY_MS, 10) || 1500,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  proxy: {
    enabled: process.env.PROXY_ENABLED === 'true',
    server: process.env.PROXY_SERVER || '',
    username: process.env.PROXY_USERNAME || '',
    password: process.env.PROXY_PASSWORD || '',
  },
  browser: {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    viewportWidth: parseInt(process.env.VIEWPORT_WIDTH, 10) || 1280,
    viewportHeight: parseInt(process.env.VIEWPORT_HEIGHT, 10) || 720,
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  }
};
