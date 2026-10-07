const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const config = require('../config');
const ProxyManager = require('./proxyManager');
const logger = require('../utils/logger');

// chromium.use(stealth);

class BrowserManager {
  static async launch() {
    const proxy = ProxyManager.getProxyConfig();
    const launchOptions = {
      headless: config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ],
      proxy
    };

    logger.info('Launching Playwright browser...', { headless: launchOptions.headless, proxyEnabled: !!proxy });
    const browser = await chromium.launch(launchOptions);
    
    const context = await browser.newContext({
      viewport: {
        width: config.browser.viewportWidth,
        height: config.browser.viewportHeight
      },
      // userAgent: config.browser.userAgent,
      geolocation: undefined,
      permissions: ['geolocation']
    });

    const page = await context.newPage();

    return { browser, context, page };
  }

  static async close(browser, context, page) {
    try {
      if (page && !page.isClosed()) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
      logger.info('Browser resources cleaned up successfully.');
    } catch (err) {
      logger.error('Error during browser cleanup', { error: err.message });
    }
  }
}

module.exports = BrowserManager;
