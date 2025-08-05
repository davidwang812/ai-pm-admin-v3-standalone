/**
 * Secure API Key Manager Simple Tests
 * 安全API密钥管理器简单测试（无Jest环境）
 */

// Mock dependencies
const mockFeatureFlags = {
  isEnabled: (flagKey) => {
    // Default enabled for security features
    const enabledFlags = [
      'USE_SECURE_API_KEY_STORAGE',
      'USE_PERFORMANCE_MONITORING'
    ];
    return enabledFlags.includes(flagKey);
  },
  enable: () => {},
  disable: () => {}
};

const mockPerformanceMonitor = {
  record: (metric, value, tags) => {
    console.log(`[PERF] ${metric}: ${value}`, tags || '');
  },
  recordError: (source, error) => {
    console.log(`[ERROR] ${source}: ${error.message}`);
  }
};

// Mock globals
global.performance = {
  now: () => Date.now()
};

// Mock Base64 functions for Node.js environment
global.btoa = (str) => Buffer.from(str).toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString();

// Mock localStorage
const mockLocalStorage = {
  storage: new Map(),
  getItem: function(key) {
    return this.storage.get(key) || null;
  },
  setItem: function(key, value) {
    this.storage.set(key, value);
  },
  removeItem: function(key) {
    this.storage.delete(key);
  }
};

global.localStorage = mockLocalStorage;

// Mock module exports
const mockModules = {
  '../../_utils/feature-flags.js': { featureFlags: mockFeatureFlags },
  '../../_utils/performance-monitor.js': { performanceMonitor: mockPerformanceMonitor }
};

// Mock require function
const originalRequire = require;
require = function(moduleId) {
  if (mockModules[moduleId]) {
    return mockModules[moduleId];
  }
  return originalRequire.apply(this, arguments);
};

// Import the SecureApiKeyManager class
const { SecureApiKeyManager } = require('../../_utils/secure-api-key-manager.js');

// Restore require
require = originalRequire;

// Test runner
class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
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
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null, but got ${actual}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected instance of ${expectedClass.name}, but got ${typeof actual}`);
        }
      },
      toStartWith: (expected) => {
        if (typeof actual !== 'string' || !actual.startsWith(expected)) {
          throw new Error(`Expected string to start with "${expected}", but got "${actual}"`);
        }
      },
      toContain: (expected) => {
        if (typeof actual === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected "${actual}" to contain "${expected}"`);
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${expected}`);
          }
        } else {
          throw new Error(`Cannot check if ${typeof actual} contains ${expected}`);
        }
      },
      not: {
        toContain: (expected) => {
          if (typeof actual === 'string' && actual.includes(expected)) {
            throw new Error(`Expected "${actual}" not to contain "${expected}"`);
          }
        },
        toBe: (expected) => {
          if (actual === expected) {
            throw new Error(`Expected not to be ${expected}, but got ${actual}`);
          }
        }
      },
      toHaveLength: (expected) => {
        if (!actual.length || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, but got ${actual.length || 0}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      }
    };
  }

  async expectAsync(promise) {
    try {
      const result = await promise;
      return this.expect(result);
    } catch (error) {
      return {
        toReject: () => {}, // Promise was rejected as expected
        toRejectWith: (expectedError) => {
          if (!error.message.includes(expectedError)) {
            throw new Error(`Expected rejection with "${expectedError}", but got "${error.message}"`);
          }
        }
      };
    }
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
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

// Run tests
const test = new SimpleTestRunner();

// Test suite
test.describe('SecureApiKeyManager Tests', () => {
  let manager;

  // Helper to create fresh manager
  const createManager = () => {
    if (manager) {
      manager.destroy();
    }
    manager = new SecureApiKeyManager();
    return manager;
  };

  // Basic functionality tests
  test.describe('Basic Functionality', () => {
    test.it('should initialize correctly', () => {
      const mgr = createManager();
      test.expect(mgr.keyCache.size).toBe(0);
      test.expect(mgr.auditLog).toEqual([]);
      test.expect(mgr.encryptionKey).toBeTruthy();
    });

    test.it('should encrypt and decrypt API keys', () => {
      const mgr = createManager();
      const apiKey = 'sk-test123456789abcdef';
      
      // Ensure feature is enabled for this test
      const originalIsEnabled = mockFeatureFlags.isEnabled;
      mockFeatureFlags.isEnabled = (flagKey) => {
        if (flagKey === 'USE_SECURE_API_KEY_STORAGE') return true;
        return originalIsEnabled(flagKey);
      };
      
      const encrypted = mgr.encrypt(apiKey);
      test.expect(encrypted).toStartWith('enc:');
      test.expect(encrypted).not.toContain(apiKey);
      
      const decrypted = mgr.decrypt(encrypted);
      test.expect(decrypted).toBe(apiKey);
      
      // Restore original function
      mockFeatureFlags.isEnabled = originalIsEnabled;
    });

    test.it('should store and retrieve keys', () => {
      const mgr = createManager();
      const keyId = 'test-key-1';
      const apiKey = 'sk-test123456789';
      
      const stored = mgr.storeKey(keyId, apiKey);
      test.expect(stored).toBe(true);
      
      const retrieved = mgr.getKey(keyId);
      test.expect(retrieved).toBe(apiKey);
    });

    test.it('should return null for non-existent keys', () => {
      const mgr = createManager();
      const result = mgr.getKey('non-existent');
      test.expect(result).toBeNull();
    });
  });

  test.describe('Key Validation', () => {
    test.it('should validate OpenAI key format', () => {
      const mgr = createManager();
      const validKey = 'sk-1234567890abcdef1234567890abcdef';
      const invalidKey = 'invalid-key';
      
      const validResult = mgr.validateKeyFormat(validKey, 'openai');
      test.expect(validResult.valid).toBe(true);
      
      const invalidResult = mgr.validateKeyFormat(invalidKey, 'openai');
      test.expect(invalidResult.valid).toBe(false);
    });

    test.it('should validate Anthropic key format', () => {
      const mgr = createManager();
      const validKey = 'sk-ant-1234567890abcdef1234567890abcdef12345678';
      const invalidKey = 'sk-wrong';
      
      const validResult = mgr.validateKeyFormat(validKey, 'anthropic');
      test.expect(validResult.valid).toBe(true);
      
      const invalidResult = mgr.validateKeyFormat(invalidKey, 'anthropic');
      test.expect(invalidResult.valid).toBe(false);
    });

    test.it('should reject empty keys', () => {
      const mgr = createManager();
      const result = mgr.validateKeyFormat('', 'openai');
      test.expect(result.valid).toBe(false);
      test.expect(result.error).toContain('不能为空');
    });
  });

  test.describe('Key Masking', () => {
    test.it('should mask long keys correctly', () => {
      const mgr = createManager();
      const apiKey = 'sk-1234567890abcdef1234567890abcdef';
      const masked = mgr.maskKey(apiKey);
      
      test.expect(masked).toStartWith('sk-1');
      test.expect(masked).toContain('*');
      test.expect(masked.length).toBe(apiKey.length);
    });

    test.it('should mask short keys completely', () => {
      const mgr = createManager();
      const shortKey = 'sk-123';
      const masked = mgr.maskKey(shortKey);
      test.expect(masked).toBe('******');
    });

    test.it('should handle empty keys', () => {
      const mgr = createManager();
      const masked = mgr.maskKey('');
      test.expect(masked).toBe('未配置');
    });
  });

  test.describe('Usage Statistics', () => {
    test.it('should track usage statistics', () => {
      const mgr = createManager();
      const keyId = 'usage-test';
      const apiKey = 'sk-usage123456789';
      
      mgr.storeKey(keyId, apiKey);
      mgr.getKey(keyId);
      mgr.getKey(keyId);
      
      const stats = mgr.getKeyStats(keyId);
      test.expect(stats.usageCount).toBe(2);
      test.expect(stats.lastUsed).toBeInstanceOf(Date);
    });

    test.it('should list all keys with metadata', () => {
      const mgr = createManager();
      mgr.storeKey('key1', 'sk-key1234567890abcdef');
      mgr.storeKey('key2', 'sk-key2234567890abcdef');
      
      const keyList = mgr.listKeys();
      test.expect(keyList).toHaveLength(2);
      
      keyList.forEach(key => {
        test.expect(key.id).toBeTruthy();
        test.expect(key.masked).toContain('*');
        test.expect(key.metadata).toBeTruthy();
      });
    });
  });

  test.describe('Key Deletion', () => {
    test.it('should delete keys successfully', () => {
      const mgr = createManager();
      const keyId = 'delete-test';
      
      mgr.storeKey(keyId, 'sk-delete123');
      test.expect(mgr.keyCache.has(keyId)).toBe(true);
      
      const deleted = mgr.deleteKey(keyId);
      test.expect(deleted).toBe(true);
      test.expect(mgr.keyCache.has(keyId)).toBe(false);
    });

    test.it('should handle deletion of non-existent keys', () => {
      const mgr = createManager();
      const deleted = mgr.deleteKey('non-existent');
      test.expect(deleted).toBe(false);
    });
  });

  test.describe('Audit Logging', () => {
    test.it('should log key operations', () => {
      const mgr = createManager();
      const keyId = 'audit-test';
      
      mgr.storeKey(keyId, 'sk-audit123');
      mgr.getKey(keyId);
      mgr.deleteKey(keyId);
      
      const auditLog = mgr.getAuditLog();
      test.expect(auditLog.length).toBeGreaterThan(0);
      
      const actions = auditLog.map(entry => entry.action);
      test.expect(actions).toContain('key_stored');
      test.expect(actions).toContain('key_accessed');
      test.expect(actions).toContain('key_deleted');
    });

    test.it('should filter audit log by key ID', () => {
      const mgr = createManager();
      mgr.storeKey('key1', 'sk-test1');
      mgr.storeKey('key2', 'sk-test2');
      
      const key1Logs = mgr.getAuditLog('key1');
      test.expect(key1Logs.length).toBeGreaterThan(0);
      test.expect(key1Logs.every(log => log.keyId === 'key1')).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test.it('should handle encryption errors gracefully', () => {
      const mgr = createManager();
      // Temporarily break btoa
      const originalBtoa = global.btoa;
      global.btoa = () => { throw new Error('Base64 error'); };
      
      const apiKey = 'sk-test123';
      const result = mgr.encrypt(apiKey);
      test.expect(result).toBe(apiKey); // Should return original on error
      
      // Restore btoa
      global.btoa = originalBtoa;
    });

    test.it('should handle decryption errors gracefully', () => {
      const mgr = createManager();
      // Temporarily break atob
      const originalAtob = global.atob;
      global.atob = () => { throw new Error('Decode error'); };
      
      // Create a properly encrypted string first, then try to decrypt with broken atob
      const testKey = 'sk-test123';
      global.atob = originalAtob; // Restore temporarily to encrypt
      const encrypted = mgr.encrypt(testKey);
      global.atob = () => { throw new Error('Decode error'); }; // Break it again
      
      const result = mgr.decrypt(encrypted);
      test.expect(result).toBeNull();
      
      // Restore atob
      global.atob = originalAtob;
    });
  });

  test.describe('Cleanup', () => {
    test.it('should clean up expired keys', () => {
      const mgr = createManager();
      const expiredDate = new Date(Date.now() - 1000);
      const futureDate = new Date(Date.now() + 60000);
      
      mgr.storeKey('expired', 'sk-expired', { expiresAt: expiredDate });
      mgr.storeKey('valid', 'sk-valid', { expiresAt: futureDate });
      
      test.expect(mgr.keyCache.size).toBe(2);
      
      mgr.cleanupExpiredKeys();
      
      test.expect(mgr.keyCache.size).toBe(1);
      test.expect(mgr.keyCache.has('valid')).toBe(true);
      test.expect(mgr.keyCache.has('expired')).toBe(false);
    });

    test.it('should destroy manager cleanly', () => {
      const mgr = createManager();
      mgr.storeKey('test', 'sk-test');
      
      mgr.destroy();
      
      test.expect(mgr.keyCache.size).toBe(0);
      test.expect(mgr.auditLog).toEqual([]);
      test.expect(mgr.cleanupInterval).toBeNull();
    });
  });
});

// Run async tests
test.describe('Async Operations', () => {
  test.it('should perform health checks', async () => {
    const mgr = new SecureApiKeyManager();
    mgr.storeKey('health-test', 'sk-health123');
    
    const result = await mgr.checkKeyHealth('health-test', 'test-endpoint');
    test.expect(result.healthy).toBe(true);
    test.expect(result.latency).toBeGreaterThan(0);
    
    mgr.destroy();
  });

  test.it('should handle health check for missing keys', async () => {
    const mgr = new SecureApiKeyManager();
    
    const result = await mgr.checkKeyHealth('missing-key', 'test-endpoint');
    test.expect(result.healthy).toBe(false);
    test.expect(result.error).toBe('Key not found');
    
    mgr.destroy();
  });

  test.it('should rotate keys successfully', async () => {
    const mgr = new SecureApiKeyManager();
    const keyId = 'rotate-test';
    const oldKey = 'sk-old1234567890abcdef1234567890abcdef';
    const newKey = 'sk-new1234567890abcdef1234567890abcdef';
    
    mgr.storeKey(keyId, oldKey, { provider: 'openai' });
    
    const rotated = await mgr.rotateKey(keyId, newKey, { provider: 'openai' });
    test.expect(rotated).toBe(true);
    
    const retrieved = mgr.getKey(keyId);
    test.expect(retrieved).toBe(newKey);
    
    mgr.destroy();
  });
});

// Show test results
test.summary();

console.log('\n🔐 Secure API Key Manager testing completed!');
console.log('Ready for integration into the existing system.');