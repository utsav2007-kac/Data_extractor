const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/search/plumbers+in+New+York', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const cards = await page.$$('div[role="feed"] > div > div');
  let count = 0;
  for(let card of cards) {
    const link = await card.$('a[href*="/maps/place/"]');
    if(link) count++;
  }
  console.log('Cards with link:', count);
  await browser.close();
})();
