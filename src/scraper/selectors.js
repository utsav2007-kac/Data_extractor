module.exports = {
  // Search box and generic inputs
  searchBox: '#searchboxinput',
  searchButton: '#searchbox-searchbutton',

  // Result container & feed
  feedContainer: 'div[role="feed"]',
  resultCard: 'div[role="feed"] > div > div',
  resultLink: 'a[href*="/maps/place/"]',

  // Business detail specific elements (when a card is clicked)
  businessName: 'h1.DUwDvf',
  category: 'button[jsaction="pane.rating.category"]',
  
  // Rating and review count
  rating: 'div.fontBodyMedium > span[role="img"]', // The aria-label usually contains the rating and reviews, e.g. "4.5 stars 120 Reviews"
  
  // Contact & Address
  addressButton: 'button[data-item-id="address"]',
  websiteButton: 'a[data-item-id="authority"]',
  phoneButton: 'button[data-item-id^="phone:tel:"]',

  // Fallbacks
  fallbackName: 'h1.DUwDvf',
  fallbackAddress: 'button[aria-label*="Address"]',
  fallbackWebsite: 'a[aria-label*="Website"]',
  fallbackPhone: 'button[aria-label*="Phone"]',
  
  // End of list detection
  endOfListMarker: "p.fontBodyMedium:has-text(\"You've reached the end of the list.\")",
  
  // Challenges & consent
  consentForm: 'form[action*="consent.google.com"]',
  captcha: '#captcha-form, iframe[src*="recaptcha"]'
};
