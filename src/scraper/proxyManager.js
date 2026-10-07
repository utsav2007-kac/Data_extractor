const config = require('../config');

class ProxyManager {
  static getProxyConfig() {
    if (!config.proxy.enabled || !config.proxy.server) {
      return undefined;
    }
    const proxy = {
      server: config.proxy.server
    };
    if (config.proxy.username && config.proxy.password) {
      proxy.username = config.proxy.username;
      proxy.password = config.proxy.password;
    }
    return proxy;
  }
}

module.exports = ProxyManager;
