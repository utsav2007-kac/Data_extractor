const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const Parser = require('./src/scraper/parser');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/search/restaurant+in+rajkot', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const cards = await page.$$('div[role="feed"] > div > div');
  console.log('Cards:', cards.length);
  for(let card of cards) {
    const link = await card.$('a[href*="/maps/place/"]');
    if(link) {
      console.log('Clicking link...');
      await link.click();
      await page.waitForTimeout(5000);
      const url = page.url();
      const lead = await Parser.parseBusinessPage(page, url);
      console.log(lead);
      break;
    }
  }
  await browser.close();
})();
