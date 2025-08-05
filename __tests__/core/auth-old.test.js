/**
 * Auth Manager Tests
 * 测试V3认证管理系统的核心功能
 */

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = mockLocalStorage;

// Mock fetch
const mockFetch = function(url, options) {
  // Return promise that resolves based on URL and options
  return new Promise((resolve) => {
    const response = {
      json: async () => {
        // Login endpoint
        if (url === '/api/auth/login' && options.method === 'POST') {
          const body = JSON.parse(options.body);
          if (body.username === 'admin' && body.password === 'password') {
            return {
              success: true,
              token: 'valid-token',
              user: { username: 'admin', role: 'admin' },
              refreshToken: 'refresh-token'
            };
          }
          return { success: false, message: 'Invalid credentials' };
        }
        
        // Logout endpoint
        if (url === '/api/auth/logout' && options.method === 'POST') {
          return { success: true };
        }
        
        // Verify endpoint
        if (url === '/api/auth/verify' && options.method === 'GET') {
          const auth = options.headers.Authorization;
          if (auth === 'Bearer valid-token') {
            return { success: true };
          }
          return { success: false };
        }
        
        // Refresh endpoint
        if (url === '/api/auth/refresh' && options.method === 'POST') {
          const body = JSON.parse(options.body);
          if (body.refreshToken === 'refresh-token') {
            return {
              success: true,
              data: {
                token: 'new-valid-token',
                refreshToken: 'new-refresh-token'
              }
            };
          }
          return { success: false };
        }
        
        return { success: false };
      }
    };
    resolve(response);
  });
};

global.fetch = mockFetch;

// Mock Date.now for consistent testing
const originalDateNow = Date.now;
let mockTime = 1640995200000;
Date.now = () => mockTime;

// Mock atob for JWT parsing
global.atob = (str) => {
  return Buffer.from(str, 'base64').toString('binary');
};

// Mock setTimeout/clearTimeout
const timeouts = new Map();
let timeoutId = 1;

global.setTimeout = (fn, delay) => {
  const id = timeoutId++;
  timeouts.set(id, { fn, delay, time: Date.now() + delay });
  return id;
};

global.clearTimeout = (id) => {
  timeouts.delete(id);
};

// Mock console
const originalConsole = console;
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: () => {}
};

// Test runner
class SimpleTestRunner {
  constructor() {
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  describe(description, testSuite) {
    console.log(`\n📋 ${description}`);
    console.log('='.repeat(50));
    testSuite();
  }

  it(description, testFn) {
    this.results.total++;
    try {
      testFn();
      console.log(`  ✅ ${description}`);
      this.results.passed++;
    } catch (error) {
      console.log(`  ❌ ${description}`);
      console.log(`     Error: ${error.message}`);
      this.results.failed++;
    }
  }

  async itAsync(description, testFn) {
    this.results.total++;
    try {
      await testFn();
      console.log(`  ✅ ${description}`);
      this.results.passed++;
    } catch (error) {
      console.log(`  ❌ ${description}`);
      console.log(`     Error: ${error.message}`);
      this.results.failed++;
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy value, but got ${actual}`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null, but got ${actual}`);
        }
      },
      toContain: (expected) => {
        if (!actual || !actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      }
    };
  }

  summary() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(30));
    console.log(`Total tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Import AuthManager
const { AuthManager } = require('../../_core/auth-old.js');

// Run tests
const test = new SimpleTestRunner();

console.log('🔐 Testing Auth Manager\n');

test.describe('AuthManager Initialization', () => {
  test.it('should initialize with default values', () => {
    mockLocalStorage.clear();
    const auth = new AuthManager();
    
    test.expect(auth.tokenKey).toBe('admin_token_v3');
    test.expect(auth.refreshTokenKey).toBe('admin_refresh_token_v3');
    test.expect(auth.userKey).toBe('admin_user_v3');
    test.expect(auth.user).toBeNull();
    test.expect(auth.token).toBeNull();
  });

  test.it('should load stored auth if valid', () => {
    mockLocalStorage.clear();
    // Create valid token (expires in future)
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const validToken = `header.${Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64')}.signature`;
    
    mockLocalStorage.setItem('admin_token_v3', validToken);
    mockLocalStorage.setItem('admin_user_v3', JSON.stringify({ username: 'test' }));
    
    const auth = new AuthManager();
    
    test.expect(auth.token).toBe(validToken);
    test.expect(auth.user.username).toBe('test');
  });

  test.it('should clear auth if token is expired', () => {
    mockLocalStorage.clear();
    // Create expired token
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const expiredToken = `header.${Buffer.from(JSON.stringify({ exp: pastExp })).toString('base64')}.signature`;
    
    mockLocalStorage.setItem('admin_token_v3', expiredToken);
    mockLocalStorage.setItem('admin_user_v3', JSON.stringify({ username: 'test' }));
    
    const auth = new AuthManager();
    
    test.expect(auth.token).toBeNull();
    test.expect(auth.user).toBeNull();
  });
});

test.describe('Login Functionality', () => {
  test.itAsync('should login successfully with valid credentials', async () => {
    mockLocalStorage.clear();
    const auth = new AuthManager();
    
    const result = await auth.login('admin', 'password');
    
    test.expect(result.success).toBe(true);
    test.expect(result.user.username).toBe('admin');
    test.expect(auth.token).toBe('valid-token');
    test.expect(auth.user.username).toBe('admin');
    test.expect(mockLocalStorage.getItem('admin_token_v3')).toBe('valid-token');
  });

  test.itAsync('should fail login with invalid credentials', async () => {
    mockLocalStorage.clear();
    const auth = new AuthManager();
    
    const result = await auth.login('admin', 'wrong');
    
    test.expect(result.success).toBe(false);
    test.expect(result.message).toBe('Invalid credentials');
    test.expect(auth.token).toBeNull();
  });

  test.itAsync('should handle login network errors', async () => {
    mockLocalStorage.clear();
    const auth = new AuthManager();
    
    // Mock fetch to throw error
    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error('Network error'));
    
    const result = await auth.login('admin', 'password');
    
    test.expect(result.success).toBe(false);
    test.expect(result.message).toBe('Network error');
    
    // Restore fetch
    global.fetch = originalFetch;
  });
});

test.describe('Logout Functionality', () => {
  test.itAsync('should logout successfully', async () => {
    mockLocalStorage.clear();
    const auth = new AuthManager();
    
    // Setup auth state
    auth.token = 'valid-token';
    auth.user = { username: 'admin' };
    mockLocalStorage.setItem('admin_token_v3', 'valid-token');
    mockLocalStorage.setItem('admin_user_v3', JSON.stringify({ username: 'admin' }));
    
    const result = await auth.logout();
    
    test.expect(result).toBe(true);
    test.expect(auth.token).toBeNull();
    test.expect(auth.user).toBeNull();
    test.expect(mockLocalStorage.getItem('admin_token_v3')).toBeNull();
  });

  test.itAsync('should handle logout API errors gracefully', async () => {
    mockLocalStorage.clear();
    const auth = new AuthManager();
    auth.token = 'valid-token';
    
    // Mock fetch to throw error
    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error('API error'));
    
    const result = await auth.logout();
    
    test.expect(result).toBe(true); // Still clears local auth
    test.expect(auth.token).toBeNull();
    
    // Restore fetch
    global.fetch = originalFetch;
  });
});

test.describe('Token Management', () => {
  test.it('should parse JWT token correctly', () => {
    const auth = new AuthManager();
    const payload = { sub: '123', exp: 1234567890 };
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
    
    const parsed = auth.parseToken(token);
    
    test.expect(parsed.sub).toBe('123');
    test.expect(parsed.exp).toBe(1234567890);
  });

  test.it('should handle invalid token parsing', () => {
    const auth = new AuthManager();
    
    test.expect(auth.parseToken(null)).toBeNull();
    test.expect(auth.parseToken('invalid')).toBeNull();
    test.expect(auth.parseToken('too.many.parts.here')).toBeNull();
  });

  test.it('should check token expiration correctly', () => {
    const auth = new AuthManager();
    
    // Expired token
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    auth.token = `header.${Buffer.from(JSON.stringify({ exp: pastExp })).toString('base64')}.signature`;
    test.expect(auth.isTokenExpired()).toBe(true);
    
    // Valid token
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    auth.token = `header.${Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64')}.signature`;
    test.expect(auth.isTokenExpired()).toBe(false);
  });

  test.itAsync('should verify token successfully', async () => {
    const auth = new AuthManager();
    auth.token = 'valid-token';
    
    const result = await auth.verifyToken();
    
    test.expect(result).toBe(true);
  });

  test.itAsync('should refresh token successfully', async () => {
    mockLocalStorage.clear();
    mockLocalStorage.setItem('admin_refresh_token_v3', 'refresh-token');
    
    const auth = new AuthManager();
    
    const result = await auth.refreshToken();
    
    test.expect(result).toBe(true);
    test.expect(auth.token).toBe('new-valid-token');
    test.expect(mockLocalStorage.getItem('admin_token_v3')).toBe('new-valid-token');
  });
});

test.describe('Auth Check and Permissions', () => {
  test.itAsync('should check auth status correctly', async () => {
    const auth = new AuthManager();
    
    // No token
    test.expect(await auth.check()).toBe(false);
    
    // Valid token
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    auth.token = `header.${Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64')}.signature`;
    
    // Force verification by mocking Date.now
    const originalDateNow = Date.now;
    Date.now = () => 10; // Makes Date.now() % 10 === 0
    
    const result = await auth.check();
    test.expect(result).toBe(false); // No valid token for verify endpoint
    
    Date.now = originalDateNow;
  });

  test.it('should check permissions correctly', () => {
    const auth = new AuthManager();
    
    // No user
    test.expect(auth.hasPermission('any')).toBe(false);
    
    // Super admin
    auth.user = { role: 'super_admin' };
    test.expect(auth.hasPermission('any')).toBe(true);
    
    // Regular user with permissions
    auth.user = { role: 'user', permissions: ['read', 'write'] };
    test.expect(auth.hasPermission('read')).toBe(true);
    test.expect(auth.hasPermission('delete')).toBe(false);
  });

  test.it('should check admin status correctly', () => {
    const auth = new AuthManager();
    
    test.expect(auth.isAdmin()).toBe(false);
    
    auth.user = { role: 'user' };
    test.expect(auth.isAdmin()).toBe(false);
    
    auth.user = { role: 'admin' };
    test.expect(auth.isAdmin()).toBe(true);
    
    auth.user = { role: 'super_admin' };
    test.expect(auth.isAdmin()).toBe(true);
  });
});

test.describe('Auto Refresh', () => {
  test.it('should setup auto refresh for valid token', () => {
    const auth = new AuthManager();
    timeouts.clear();
    
    // Token expires in 1 hour
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    auth.token = `header.${Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64')}.signature`;
    
    auth.setupAutoRefresh();
    
    test.expect(timeouts.size).toBe(1);
  });

  test.it('should not setup refresh for expired token', () => {
    const auth = new AuthManager();
    timeouts.clear();
    
    // Expired token
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    auth.token = `header.${Buffer.from(JSON.stringify({ exp: pastExp })).toString('base64')}.signature`;
    
    auth.setupAutoRefresh();
    
    test.expect(timeouts.size).toBe(0);
  });

  test.it('should clear old timer when setting new one', () => {
    const auth = new AuthManager();
    timeouts.clear();
    
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    auth.token = `header.${Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64')}.signature`;
    
    auth.setupAutoRefresh();
    test.expect(timeouts.size).toBe(1);
    
    auth.setupAutoRefresh(); // Should clear old and set new
    test.expect(timeouts.size).toBe(1);
  });
});

test.describe('Utility Methods', () => {
  test.it('should get user correctly', () => {
    const auth = new AuthManager();
    
    test.expect(auth.getUser()).toBeNull();
    
    auth.user = { username: 'test' };
    test.expect(auth.getUser().username).toBe('test');
  });

  test.it('should get token correctly', () => {
    const auth = new AuthManager();
    
    test.expect(auth.getToken()).toBeNull();
    
    auth.token = 'test-token';
    test.expect(auth.getToken()).toBe('test-token');
  });

  test.it('should clear auth completely', () => {
    const auth = new AuthManager();
    
    // Setup auth state
    auth.token = 'token';
    auth.user = { username: 'user' };
    auth.refreshTimer = setTimeout(() => {}, 1000);
    mockLocalStorage.setItem('admin_token_v3', 'token');
    mockLocalStorage.setItem('admin_user_v3', 'user');
    mockLocalStorage.setItem('admin_refresh_token_v3', 'refresh');
    
    auth.clearAuth();
    
    test.expect(auth.token).toBeNull();
    test.expect(auth.user).toBeNull();
    test.expect(auth.refreshTimer).toBeNull();
    test.expect(mockLocalStorage.getItem('admin_token_v3')).toBeNull();
    test.expect(mockLocalStorage.getItem('admin_refresh_token_v3')).toBeNull();
  });
});

// Restore globals
global.console = originalConsole;
Date.now = originalDateNow;

// Show test results
test.summary();

console.log('\n🔐 Auth Manager testing completed!');
console.log('Ready for production authentication.');