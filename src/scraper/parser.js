const selectors = require('./selectors');
const Normalizer = require('./normalizer');

class Parser {
  static extractPlaceId(url) {
    if (!url) return null;
    try {
      // e.g. https://www.google.com/maps/place/.../data=!4m5!3m4!1s0x0:0xabcdef1234567890
      const match = url.match(/1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
      if (match) return match[1];
      
      const cidMatch = url.match(/cid=([0-9]+)/i);
      if (cidMatch) return cidMatch[1];
    } catch {
      // Ignore
    }
    return null;
  }

  static extractCoordinates(url) {
    if (!url) return { latitude: null, longitude: null };
    try {
      const match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (match) {
        return {
          latitude: parseFloat(match[1]),
          longitude: parseFloat(match[2])
        };
      }
      
      const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        return {
          latitude: parseFloat(atMatch[1]),
          longitude: parseFloat(atMatch[2])
        };
      }
    } catch {
      // Ignore
    }
    return { latitude: null, longitude: null };
  }

  static parseRatingAndReviews(ariaLabel) {
    let rating = null;
    let reviewCount = null;
    
    if (!ariaLabel) return { rating, reviewCount };
    
    try {
      // "4.5 stars 120 Reviews"
      const ratingMatch = ariaLabel.match(/([\d.]+)\s*stars?/i);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      
      const reviewMatch = ariaLabel.match(/([\d,]+)\s*Reviews?/i);
      if (reviewMatch) reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''), 10);
    } catch {
      // Ignore
    }
    return { rating, reviewCount };
  }

  static async parseBusinessPage(page, mapsUrl) {
    // We assume the page is already at the business details context
    const businessName = await page.evaluate((sel) => {
      const el = document.querySelector(sel.businessName) || document.querySelector(sel.fallbackName);
      return el ? el.textContent : null;
    }, selectors).catch(() => null);

    if (!businessName) return null;

    const category = await page.evaluate((sel) => {
      const el = document.querySelector(sel.category);
      return el ? el.textContent : null;
    }, selectors).catch(() => null);

    const address = await page.evaluate((sel) => {
      const el = document.querySelector(sel.addressButton) || document.querySelector(sel.fallbackAddress);
      return el ? el.getAttribute('aria-label') || el.textContent : null;
    }, selectors).catch(() => null);
    
    // Address format is usually "Address: Full address here"
    const cleanedAddress = address ? address.replace(/^Address:\s*/i, '') : null;

    const website = await page.evaluate((sel) => {
      const el = document.querySelector(sel.websiteButton) || document.querySelector(sel.fallbackWebsite);
      return el ? el.getAttribute('href') : null;
    }, selectors).catch(() => null);

    const phone = await page.evaluate((sel) => {
      const el = document.querySelector(sel.phoneButton) || document.querySelector(sel.fallbackPhone);
      // aria-label usually "Phone: 0123456789"
      return el ? el.getAttribute('aria-label') || el.textContent : null;
    }, selectors).catch(() => null);
    
    const cleanedPhone = phone ? phone.replace(/^Phone:\s*/i, '') : null;

    const ratingAria = await page.evaluate((sel) => {
      const el = document.querySelector(sel.rating);
      return el ? el.getAttribute('aria-label') : null;
    }, selectors).catch(() => null);

    const { rating, reviewCount } = this.parseRatingAndReviews(ratingAria);

    const placeId = this.extractPlaceId(mapsUrl);
    const { latitude, longitude } = this.extractCoordinates(mapsUrl);

    const rawLead = {
      businessName,
      category,
      phone: cleanedPhone,
      address: cleanedAddress,
      city: null, // Hard to extract cleanly without geocoding, keeping null if not explicitly splittable safely
      region: null,
      postalCode: null,
      country: null,
      rating,
      reviewCount,
      website,
      mapsUrl,
      placeId,
      latitude,
      longitude
    };

    return Normalizer.normalizeLead(rawLead);
  }
}

module.exports = Parser;
