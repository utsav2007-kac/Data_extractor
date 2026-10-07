const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/search/plumbers+in+New+York', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  const link = await page.$('a[href*="/maps/place/"]');
  if (link) {
    await link.click();
    await page.waitForTimeout(5000); 
    
    // Find ALL h1 tags
    const h1s = await page.$$eval('h1', els => els.map(e => ({ text: e.textContent, className: e.className })));
    console.log('All H1s:', h1s);
  }
  await browser.close();
})();
