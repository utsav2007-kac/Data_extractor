const { chromium } = require('playwright');
const selectors = require('./src/scraper/selectors');
const Parser = require('./src/scraper/parser');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/search/plumbers+in+New+York', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  const link = await page.$('a[href*="/maps/place/"]');
  if (link) {
    console.log('Clicking link...');
    await link.click();
    await page.waitForTimeout(5000); // wait for pane to load
    
    console.log('Checking businessName selector:', selectors.businessName);
    const nameEl = await page.$(selectors.businessName);
    console.log('Found h1.fontHeadlineLarge?', !!nameEl);
    
    if (!nameEl) {
       console.log('Checking fallbackName selector:', selectors.fallbackName);
       const fbNameEl = await page.$(selectors.fallbackName);
       console.log('Found fallbackName?', !!fbNameEl);
       if (fbNameEl) {
           console.log('Text:', await fbNameEl.innerText());
       }
    }
    
    const lead = await Parser.parseBusinessPage(page, page.url());
    console.log('Parsed lead:', lead);
  } else {
    console.log('No links found');
  }

  await browser.close();
})();
