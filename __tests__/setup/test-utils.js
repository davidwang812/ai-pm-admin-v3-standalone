/**
 * Test Utilities
 * 共享的测试工具函数
 */

// Create mock app context
global.createTestApp = () => {
  return {
    api: {
      // Provider APIs
      getProviders: jest.fn().mockResolvedValue({ success: true, providers: {} }),
      saveProvider: jest.fn().mockResolvedValue({ success: true }),
      deleteProvider: jest.fn().mockResolvedValue({ success: true }),
      testProvider: jest.fn().mockResolvedValue({ success: true }),
      
      // Unified Config APIs
      getUnifiedConfig: jest.fn().mockResolvedValue({ success: true, config: {} }),
      saveUnifiedConfig: jest.fn().mockResolvedValue({ success: true }),
      
      // Cost Analysis APIs
      getCostAnalysis: jest.fn().mockResolvedValue({ 
        success: true, 
        totalCost: 0,
        totalRequests: 0,
        avgCost: 0,
        topService: 'N/A',
        trends: [],
        providers: [],
        details: []
      }),
      
      // Contract Compliance APIs
      getContractStatus: jest.fn().mockResolvedValue({ success: true, status: {} }),
      runContractValidation: jest.fn().mockResolvedValue({ success: true }),
      
      // Load Balancing APIs
      getLoadBalancingConfig: jest.fn().mockResolvedValue({ success: true, config: {} }),
      saveLoadBalancingConfig: jest.fn().mockResolvedValue({ success: true }),
      
      // Service Status APIs
      getServiceStatus: jest.fn().mockResolvedValue({ success: true, services: {} }),
      
      // General request method
      request: jest.fn().mockResolvedValue({ success: true }),
      get: jest.fn().mockResolvedValue({ success: true }),
      post: jest.fn().mockResolvedValue({ success: true }),
      put: jest.fn().mockResolvedValue({ success: true }),
      delete: jest.fn().mockResolvedValue({ success: true })
    },
    
    router: {
      navigate: jest.fn(),
      getCurrentPath: jest.fn().mockReturnValue('/'),
      beforeEach: jest.fn(),
      afterEach: jest.fn()
    },
    
    showToast: jest.fn(),
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    
    utils: {
      formatDate: jest.fn(date => new Date(date).toISOString()),
      formatCurrency: jest.fn(amount => `¥${amount.toFixed(2)}`),
      debounce: jest.fn(fn => fn),
      throttle: jest.fn(fn => fn)
    },
    
    config: {
      apiBaseUrl: 'http://test.api',
      version: '3.0.0'
    }
  };
};

// Create DOM element with properties
global.createElement = (tag, props = {}, children = []) => {
  const element = document.createElement(tag);
  
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key.startsWith('data')) {
      element.dataset[key.slice(4).toLowerCase()] = value;
    } else {
      element[key] = value;
    }
  });
  
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });
  
  return element;
};

// Wait for async operations
global.waitFor = (condition, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
};

// Simulate user events
global.simulateEvent = (element, eventName, eventData = {}) => {
  const event = new Event(eventName, { bubbles: true, cancelable: true });
  Object.assign(event, eventData);
  element.dispatchEvent(event);
};

// Mock Chart.js
global.mockChart = () => {
  const chartInstances = new Map();
  
  global.Chart = jest.fn((ctx, config) => {
    const chart = {
      data: config.data,
      options: config.options,
      update: jest.fn(),
      destroy: jest.fn(),
      resize: jest.fn(),
      reset: jest.fn(),
      render: jest.fn(),
      stop: jest.fn(),
      ctx: ctx
    };
    
    chartInstances.set(ctx.id || ctx, chart);
    return chart;
  });
  
  global.Chart.getChart = jest.fn((id) => {
    return chartInstances.get(id);
  });
  
  global.Chart.register = jest.fn();
  global.Chart.defaults = {};
  
  return chartInstances;
};

// Mock fetch responses
global.mockFetchResponse = (response, options = {}) => {
  const { status = 200, headers = {}, delay = 0 } = options;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: new Headers(headers),
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
        blob: () => Promise.resolve(new Blob([JSON.stringify(response)]))
      });
    }, delay);
  });
};

// Create mock localStorage
global.createMockLocalStorage = () => {
  let store = {};
  
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn(index => Object.keys(store)[index] || null)
  };
};

// Create mock sessionStorage
global.createMockSessionStorage = () => {
  return createMockLocalStorage();
};

// Assert element visibility
global.assertVisible = (element) => {
  expect(element).toBeTruthy();
  expect(element.style.display).not.toBe('none');
  expect(element.style.visibility).not.toBe('hidden');
};

global.assertHidden = (element) => {
  expect(
    !element || 
    element.style.display === 'none' || 
    element.style.visibility === 'hidden'
  ).toBe(true);
};

// Wait for element to appear
global.waitForElement = (selector, container = document, timeout = 1000) => {
  return waitFor(() => container.querySelector(selector), timeout);
};

// Mock module loader
global.mockModuleLoader = () => {
  const modules = new Map();
  
  return {
    register: (path, module) => {
      modules.set(path, module);
    },
    load: jest.fn(async (path) => {
      if (modules.has(path)) {
        return modules.get(path);
      }
      throw new Error(`Module not found: ${path}`);
    }),
    clear: () => {
      modules.clear();
    }
  };
};

// Create mock WebSocket
global.createMockWebSocket = () => {
  const events = {};
  
  return {
    readyState: 1, // OPEN
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn((event, handler) => {
      if (!events[event]) events[event] = [];
      events[event].push(handler);
    }),
    removeEventListener: jest.fn((event, handler) => {
      if (events[event]) {
        events[event] = events[event].filter(h => h !== handler);
      }
    }),
    dispatchEvent: jest.fn((event) => {
      if (events[event.type]) {
        events[event.type].forEach(handler => handler(event));
      }
    }),
    // Helper to trigger events in tests
    _trigger: (eventName, data) => {
      if (events[eventName]) {
        events[eventName].forEach(handler => handler(data));
      }
    }
  };
};

// Assert toast was shown
global.assertToast = (mockApp, type, messagePattern) => {
  expect(mockApp.showToast).toHaveBeenCalledWith(
    type,
    expect.stringMatching(messagePattern)
  );
};

// Clear all mocks
global.clearAllMocks = () => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  if (global.localStorage) {
    global.localStorage.clear();
  }
  if (global.sessionStorage) {
    global.sessionStorage.clear();
  }
};

// Mock date/time
global.mockDate = (dateString) => {
  const RealDate = Date;
  const mockDate = new Date(dateString);
  
  global.Date = jest.fn((...args) => {
    if (args.length === 0) {
      return mockDate;
    }
    return new RealDate(...args);
  });
  
  global.Date.now = jest.fn(() => mockDate.getTime());
  global.Date.parse = RealDate.parse;
  global.Date.UTC = RealDate.UTC;
  
  return () => {
    global.Date = RealDate;
  };
};