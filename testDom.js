const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/search/plumbers+in+New+York', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  const hasFeedRole = await page.$('div[role="feed"]') !== null;
  console.log('Has role=feed:', hasFeedRole);
  
  const cards = await page.$$('a[href*="/maps/place/"]');
  console.log('Place Links found:', cards.length);

  await browser.close();
})();
