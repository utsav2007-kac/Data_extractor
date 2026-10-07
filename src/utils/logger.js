const config = require('../config');

const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ level: 'info', msg, timestamp: new Date().toISOString(), ...meta }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({ level: 'warn', msg, timestamp: new Date().toISOString(), ...meta }));
  },
  error: (msg, meta = {}) => {
    console.error(JSON.stringify({ level: 'error', msg, timestamp: new Date().toISOString(), ...meta }));
  },
  debug: (msg, meta = {}) => {
    if (config.env === 'development') {
      console.log(JSON.stringify({ level: 'debug', msg, timestamp: new Date().toISOString(), ...meta }));
    }
  }
};

module.exports = logger;
