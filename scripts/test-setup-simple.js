/**
 * Simple Test Setup
 * Minimal setup for running tests
 */

// Mock DOM globals
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ 
    style: {},
    classList: { add: () => {}, remove: () => {} }
  })
};

global.window = {
  location: { href: '', hostname: 'localhost' },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  }
};

// Mock fetch
global.fetch = () => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({})
});

// Mock Chart
global.Chart = function() {};