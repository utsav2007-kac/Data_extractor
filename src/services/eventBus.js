const { EventEmitter } = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Allow more listeners for SSE
    this.setMaxListeners(100);
  }

  emitEvent(jobId, eventType, data = {}) {
    const payload = {
      jobId,
      type: eventType,
      timestamp: new Date().toISOString(),
      data
    };
    this.emit(`job:${jobId}`, payload);
  }
}

const eventBus = new EventBus();
module.exports = eventBus;
