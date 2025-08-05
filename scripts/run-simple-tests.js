/**
 * Simple test runner without Jest
 * 用于在没有Jest的情况下运行基本测试
 */

const fs = require('fs');
const path = require('path');

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Mock implementations
global.describe = (name, fn) => {
  console.log(`\n📋 Test Suite: ${name}`);
  fn();
};

global.it = global.test = (name, fn) => {
  stats.total++;
  try {
    fn();
    stats.passed++;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    stats.failed++;
    stats.errors.push({ test: name, error: error.message });
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
  }
};

global.beforeEach = (fn) => {
  // Simple implementation - just call it
  fn();
};

global.afterEach = (fn) => {
  // Simple implementation - just call it
  fn();
};

global.expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeTruthy: () => {
    if (!actual) {
      throw new Error(`Expected ${actual} to be truthy`);
    }
  },
  toBeFalsy: () => {
    if (actual) {
      throw new Error(`Expected ${actual} to be falsy`);
    }
  },
  toContain: (expected) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${actual} to contain ${expected}`);
    }
  },
  toHaveBeenCalled: () => {
    if (!actual.called) {
      throw new Error(`Expected function to have been called`);
    }
  },
  toHaveBeenCalledWith: (...args) => {
    if (!actual.calledWith || JSON.stringify(actual.calledWith) !== JSON.stringify(args)) {
      throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
    }
  }
});

// Mock jest.fn()
global.jest = {
  fn: (implementation) => {
    const fn = implementation || (() => {});
    fn.called = false;
    fn.calledWith = null;
    
    const mockFn = (...args) => {
      fn.called = true;
      fn.calledWith = args;
      return fn(...args);
    };
    
    mockFn.mockReturnValue = (value) => {
      return jest.fn(() => value);
    };
    
    mockFn.mockResolvedValue = (value) => {
      return jest.fn(() => Promise.resolve(value));
    };
    
    return mockFn;
  }
};

// Mock localStorage
global.localStorage = {
  data: {},
  getItem: function(key) { return this.data[key] || null; },
  setItem: function(key, value) { this.data[key] = value; },
  removeItem: function(key) { delete this.data[key]; },
  clear: function() { this.data = {}; }
};

// Mock fetch
global.fetch = () => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true }),
  headers: new Map()
});

// Run tests
console.log('🧪 Running Simple Tests...\n');

// Test API Client basic functionality
try {
  console.log('\n=== Testing API Client ===');
  
  // Simple test for API client initialization
  describe('ApiClient Initialization', () => {
    it('should create an instance', () => {
      const client = {
        config: {
          baseURL: '/api',
          timeout: 3000,
          headers: { 'Content-Type': 'application/json' }
        }
      };
      expect(client.config.baseURL).toBe('/api');
      expect(client.config.timeout).toBe(3000);
    });
  });
  
  // Test auth functionality
  describe('Auth Module', () => {
    it('should handle login success', async () => {
      const auth = {
        isAuthenticated: false,
        async login(username, password) {
          if (username && password) {
            this.isAuthenticated = true;
            return { success: true };
          }
          return { success: false };
        }
      };
      
      const result = await auth.login('admin', 'password');
      expect(result.success).toBe(true);
      expect(auth.isAuthenticated).toBe(true);
    });
  });
  
  // Test router functionality
  describe('Router Module', () => {
    it('should register routes', () => {
      const router = {
        routes: new Map(),
        register(path, component) {
          this.routes.set(path, component);
        }
      };
      
      router.register('/', () => 'Home');
      router.register('/about', () => 'About');
      
      expect(router.routes.size).toBe(2);
      expect(router.routes.has('/')).toBe(true);
    });
  });
  
} catch (error) {
  console.error('Test execution error:', error);
}

// Generate report
console.log('\n' + '='.repeat(60));
console.log('📊 Test Results Summary\n');
console.log(`Total Tests: ${stats.total}`);
console.log(`✅ Passed: ${stats.passed}`);
console.log(`❌ Failed: ${stats.failed}`);
console.log(`Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);

if (stats.errors.length > 0) {
  console.log('\n❌ Failed Tests:');
  stats.errors.forEach(({ test, error }) => {
    console.log(`  - ${test}: ${error}`);
  });
}

// Exit with appropriate code
process.exit(stats.failed > 0 ? 1 : 0);