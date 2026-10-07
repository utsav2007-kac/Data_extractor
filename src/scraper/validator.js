class Validator {
  static validate(lead) {
    if (!lead) return false;
    
    // A lead MUST have a business name extracted from the live page
    if (!lead.businessName || typeof lead.businessName !== 'string' || lead.businessName.trim() === '') {
      return false;
    }

    // Rating validation
    if (lead.rating !== null) {
      if (typeof lead.rating !== 'number' || lead.rating < 0 || lead.rating > 5) {
        lead.rating = null;
      }
    }

    // Review count validation
    if (lead.reviewCount !== null) {
      if (typeof lead.reviewCount !== 'number' || lead.reviewCount < 0) {
        lead.reviewCount = null;
      }
    }

    // Coordinates validation
    if (lead.latitude !== null && lead.longitude !== null) {
      if (typeof lead.latitude !== 'number' || lead.latitude < -90 || lead.latitude > 90 ||
          typeof lead.longitude !== 'number' || lead.longitude < -180 || lead.longitude > 180) {
        lead.latitude = null;
        lead.longitude = null;
      }
    }

    return true;
  }
}

module.exports = Validator;
