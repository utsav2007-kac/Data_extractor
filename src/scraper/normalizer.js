class Normalizer {
  static normalizeString(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.replace(/\s+/g, ' ').trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  static normalizePhone(phone) {
    const norm = this.normalizeString(phone);
    if (!norm) return null;
    // Just trim and clean unusual characters, but do NOT fabricate or heavily alter
    // Keep it as extracted, just cleaned up visually.
    const cleaned = norm.replace(/[^\d+()\-\s]/g, '').trim();
    return cleaned.length >= 5 ? cleaned : null;
  }

  static normalizeUrl(url) {
    const norm = this.normalizeString(url);
    if (!norm) return null;
    try {
      new URL(norm); // validate it's a real URL
      return norm;
    } catch {
      return null;
    }
  }

  static normalizeLead(rawLead) {
    return {
      businessName: this.normalizeString(rawLead.businessName),
      category: this.normalizeString(rawLead.category),
      phone: this.normalizePhone(rawLead.phone),
      address: this.normalizeString(rawLead.address),
      city: this.normalizeString(rawLead.city),
      region: this.normalizeString(rawLead.region),
      postalCode: this.normalizeString(rawLead.postalCode),
      country: this.normalizeString(rawLead.country),
      rating: typeof rawLead.rating === 'number' ? rawLead.rating : null,
      reviewCount: typeof rawLead.reviewCount === 'number' ? rawLead.reviewCount : null,
      website: this.normalizeUrl(rawLead.website),
      mapsUrl: this.normalizeUrl(rawLead.mapsUrl),
      placeId: this.normalizeString(rawLead.placeId),
      latitude: typeof rawLead.latitude === 'number' ? rawLead.latitude : null,
      longitude: typeof rawLead.longitude === 'number' ? rawLead.longitude : null,
    };
  }
}

module.exports = Normalizer;
