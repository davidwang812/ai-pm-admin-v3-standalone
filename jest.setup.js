/**
 * Jest Setup File
 * 测试环境初始化
 */

// Import test utilities
require('./__tests__/setup/test-utils.js');

// Mock localStorage
const localStorageMock = createMockLocalStorage();
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = createMockSessionStorage();

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers()
  })
);

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock Chart.js is already done in test-utils
// Just ensure Chart is available
if (!global.Chart) {
  mockChart();
}

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost',
  hash: '',
  pathname: '/',
  search: '',
  assign: jest.fn(),
  reload: jest.fn()
};

// Mock DOM methods
HTMLElement.prototype.scrollIntoView = jest.fn();
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  translate: jest.fn(),
  transform: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  arc: jest.fn(),
  arcTo: jest.fn(),
  rect: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  clip: jest.fn(),
  isPointInPath: jest.fn(),
  isPointInStroke: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  fillText: jest.fn(),
  strokeText: jest.fn()
}));

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Helper function to create DOM element
global.createTestElement = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstChild || div;
};

// The createTestApp function is already defined in test-utils.js
// No need to redefine it here

// Clear all mocks before each test
beforeEach(() => {
  clearAllMocks();
});

// Add requestIdleCallback mock
window.requestIdleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
window.cancelIdleCallback = window.cancelIdleCallback || clearTimeout;