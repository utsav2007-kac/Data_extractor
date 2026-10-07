const db = require('../database');

class Deduplicator {
  constructor(jobId) {
    this.jobId = jobId;
    this.seenPlaceIds = new Set();
    this.seenUrls = new Set();
    this.seenNameAddress = new Set();
  }

  isDuplicate(lead) {
    if (lead.placeId) {
      if (this.seenPlaceIds.has(lead.placeId)) return true;
      const exists = db.prepare('SELECT 1 FROM leads WHERE jobId = ? AND placeId = ?').get(this.jobId, lead.placeId);
      if (exists) {
        this.seenPlaceIds.add(lead.placeId);
        return true;
      }
    }

    if (lead.mapsUrl) {
      if (this.seenUrls.has(lead.mapsUrl)) return true;
      const exists = db.prepare('SELECT 1 FROM leads WHERE jobId = ? AND mapsUrl = ?').get(this.jobId, lead.mapsUrl);
      if (exists) {
        this.seenUrls.add(lead.mapsUrl);
        return true;
      }
    }

    if (lead.businessName && lead.address) {
      const key = `${lead.businessName.toLowerCase()}|${lead.address.toLowerCase()}`;
      if (this.seenNameAddress.has(key)) return true;
      const exists = db.prepare('SELECT 1 FROM leads WHERE jobId = ? AND LOWER(businessName) = LOWER(?) AND LOWER(address) = LOWER(?)').get(this.jobId, lead.businessName, lead.address);
      if (exists) {
        this.seenNameAddress.add(key);
        return true;
      }
    }

    return false;
  }

  markSeen(lead) {
    if (lead.placeId) this.seenPlaceIds.add(lead.placeId);
    if (lead.mapsUrl) this.seenUrls.add(lead.mapsUrl);
    if (lead.businessName && lead.address) {
      this.seenNameAddress.add(`${lead.businessName.toLowerCase()}|${lead.address.toLowerCase()}`);
    }
  }
}

module.exports = Deduplicator;
