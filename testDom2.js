const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/search/plumbers+in+New+York', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  const cards = await page.$$('div[role="feed"] > div > div');
  console.log('Original resultCard found:', cards.length);

  // If 0, let's look at the parent of the links
  const links = await page.$$('a[href*="/maps/place/"]');
  console.log('Links found:', links.length);

  // Alternative selectors for result cards
  const altCards = await page.$$('a[href*="/maps/place/"]');
  console.log('Using a tag directly as resultCard?', altCards.length > 0);

  await browser.close();
})();
