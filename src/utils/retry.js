const config = require('../config');
const logger = require('./logger');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, options = {}) {
  const limit = options.limit || config.retryLimit;
  const baseDelay = options.baseDelay || config.retryBaseDelay;
  
  for (let attempt = 1; attempt <= limit; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === limit || options.shouldAbort && options.shouldAbort(error)) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      logger.warn(`Retry attempt ${attempt} failed, waiting ${Math.round(delay)}ms...`, { error: error.message });
      await sleep(delay);
    }
  }
}

function randomDelay(min = config.minDelayMs, max = config.maxDelayMs) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(ms);
}

module.exports = {
  sleep,
  withRetry,
  randomDelay
};
