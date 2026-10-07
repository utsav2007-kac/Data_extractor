const selectors = require('./selectors');
const logger = require('../utils/logger');

class ChallengeDetector {
  static async detect(page) {
    if (!page || page.isClosed()) {
      return { detected: false };
    }

    try {
      // 1. Check for Consent Page
      const isConsent = await page.$(selectors.consentForm).catch(() => null);
      if (isConsent) {
        return {
          detected: true,
          type: 'consent',
          confidence: 'high',
          reason: 'Google consent page intercepted the request.'
        };
      }

      // 2. Check for CAPTCHA
      const isCaptcha = await page.$(selectors.captcha).catch(() => null);
      if (isCaptcha) {
        return {
          detected: true,
          type: 'captcha',
          confidence: 'high',
          reason: 'Google Maps presented a CAPTCHA challenge.'
        };
      }

      // 3. Check for 403 / 429 style text
      const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
      if (bodyText.includes('Our systems have detected unusual traffic')) {
        return {
          detected: true,
          type: 'unusual_traffic',
          confidence: 'high',
          reason: 'Google detected unusual traffic.'
        };
      }

      return { detected: false };
    } catch (error) {
      logger.warn('Error during challenge detection', { error: error.message });
      return { detected: false };
    }
  }
}

module.exports = ChallengeDetector;
