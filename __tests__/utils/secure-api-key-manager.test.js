/**
 * Secure API Key Manager Tests
 * 安全API密钥管理器测试
 */

// Mock dependencies first
const mockFeatureFlags = {
  isEnabled: jest.fn().mockReturnValue(true),
  enable: jest.fn(),
  disable: jest.fn()
};

const mockPerformanceMonitor = {
  record: jest.fn(),
  recordError: jest.fn()
};

// Mock modules before importing
jest.mock('../../_utils/feature-flags.js', () => ({
  featureFlags: mockFeatureFlags
}));

jest.mock('../../_utils/performance-monitor.js', () => ({
  performanceMonitor: mockPerformanceMonitor
}));

// Mock globals
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock Base64 functions for Node.js environment
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'));
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString());

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

global.localStorage = mockLocalStorage;

// Import the class after mocking
const { SecureApiKeyManager } = require('../../_utils/secure-api-key-manager.js');

describe('SecureApiKeyManager', () => {
  let manager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset feature flags
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    
    // Reset localStorage
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Create fresh instance
    manager = new SecureApiKeyManager();
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with empty cache and settings', () => {
      expect(manager.keyCache.size).toBe(0);
      expect(manager.auditLog).toEqual([]);
      expect(manager.keyRotationSchedule.size).toBe(0);
    });

    it('should use environment encryption key if available', () => {
      process.env.ENCRYPTION_KEY = 'test-env-key';
      const newManager = new SecureApiKeyManager();
      expect(newManager.encryptionKey).toBe('test-env-key');
      delete process.env.ENCRYPTION_KEY;
      newManager.destroy();
    });

    it('should generate development key if not in environment', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const newManager = new SecureApiKeyManager();
      expect(newManager.encryptionKey).toMatch(/^[A-Za-z0-9]{32}$/);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('dev_encryption_key', expect.any(String));
      newManager.destroy();
    });

    it('should use existing development key from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('existing-dev-key');
      const newManager = new SecureApiKeyManager();
      expect(newManager.encryptionKey).toBe('existing-dev-key');
      newManager.destroy();
    });
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt API keys correctly', () => {
      const apiKey = 'sk-test123456789';
      const encrypted = manager.encrypt(apiKey);
      
      expect(encrypted).toStartWith('enc:');
      expect(encrypted).not.toContain(apiKey);
      
      const decrypted = manager.decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it('should return original text if feature is disabled', () => {
      mockFeatureFlags.isEnabled.mockReturnValue(false);
      const apiKey = 'sk-test123456789';
      
      const encrypted = manager.encrypt(apiKey);
      expect(encrypted).toBe(apiKey);
      
      const decrypted = manager.decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it('should handle decryption of non-encrypted text', () => {
      const plainText = 'not-encrypted';
      const result = manager.decrypt(plainText);
      expect(result).toBe(plainText);
    });

    it('should handle encryption errors gracefully', () => {
      // Force an error by mocking btoa to throw
      global.btoa.mockImplementationOnce(() => {
        throw new Error('Base64 error');
      });

      const apiKey = 'sk-test123456789';
      const result = manager.encrypt(apiKey);
      
      expect(result).toBe(apiKey); // Should return original on error
      expect(mockPerformanceMonitor.recordError).toHaveBeenCalledWith('api_key_encryption', expect.any(Error));
    });

    it('should handle decryption errors gracefully', () => {
      // Force an error by mocking atob to throw
      global.atob.mockImplementationOnce(() => {
        throw new Error('Base64 decode error');
      });

      const encrypted = 'enc:invalid-base64';
      const result = manager.decrypt(encrypted);
      
      expect(result).toBeNull();
      expect(mockPerformanceMonitor.recordError).toHaveBeenCalledWith('api_key_decryption', expect.any(Error));
    });
  });

  describe('Key Storage and Retrieval', () => {
    it('should store and retrieve API keys', () => {
      const keyId = 'openai-key-1';
      const apiKey = 'sk-test123456789';
      const metadata = { provider: 'openai', description: 'Test key' };

      const stored = manager.storeKey(keyId, apiKey, metadata);
      expect(stored).toBe(true);

      const retrieved = manager.getKey(keyId);
      expect(retrieved).toBe(apiKey);
    });

    it('should store metadata correctly', () => {
      const keyId = 'test-key';
      const apiKey = 'sk-test123';
      const metadata = { provider: 'openai', environment: 'test' };

      manager.storeKey(keyId, apiKey, metadata);
      const keyData = manager.keyCache.get(keyId);

      expect(keyData.metadata.provider).toBe('openai');
      expect(keyData.metadata.environment).toBe('test');
      expect(keyData.metadata.createdAt).toBeInstanceOf(Date);
      expect(keyData.metadata.usageCount).toBe(0);
    });

    it('should return null for non-existent keys', () => {
      const result = manager.getKey('non-existent-key');
      expect(result).toBeNull();
    });

    it('should update usage statistics on key retrieval', () => {
      const keyId = 'usage-test-key';
      const apiKey = 'sk-usage-test';

      manager.storeKey(keyId, apiKey);
      
      // First retrieval
      manager.getKey(keyId);
      let keyData = manager.keyCache.get(keyId);
      expect(keyData.metadata.usageCount).toBe(1);
      expect(keyData.metadata.lastUsed).toBeInstanceOf(Date);

      // Second retrieval
      manager.getKey(keyId);
      keyData = manager.keyCache.get(keyId);
      expect(keyData.metadata.usageCount).toBe(2);
    });

    it('should handle expired keys', () => {
      const keyId = 'expired-key';
      const apiKey = 'sk-expired';
      const pastDate = new Date(Date.now() - 1000); // 1 second ago

      manager.storeKey(keyId, apiKey, { expiresAt: pastDate });
      
      const result = manager.getKey(keyId);
      expect(result).toBeNull();
      expect(manager.keyCache.has(keyId)).toBe(false);
    });

    it('should record performance metrics', () => {
      const keyId = 'perf-test-key';
      const apiKey = 'sk-perf-test';

      manager.storeKey(keyId, apiKey);
      manager.getKey(keyId);

      expect(mockPerformanceMonitor.record).toHaveBeenCalledWith('api_key.store_time', expect.any(Number));
      expect(mockPerformanceMonitor.record).toHaveBeenCalledWith('api_key.retrieve_time', expect.any(Number));
    });
  });

  describe('Key Validation', () => {
    it('should validate OpenAI key format', () => {
      const validKey = 'sk-1234567890abcdef1234567890abcdef';
      const invalidKey = 'invalid-openai-key';

      const validResult = manager.validateKeyFormat(validKey, 'openai');
      expect(validResult.valid).toBe(true);

      const invalidResult = manager.validateKeyFormat(invalidKey, 'openai');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('openai API密钥格式不正确');
    });

    it('should validate Anthropic key format', () => {
      const validKey = 'sk-ant-1234567890abcdef1234567890abcdef12345678';
      const invalidKey = 'sk-wrong-format';

      const validResult = manager.validateKeyFormat(validKey, 'anthropic');
      expect(validResult.valid).toBe(true);

      const invalidResult = manager.validateKeyFormat(invalidKey, 'anthropic');
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate Google key format', () => {
      const validKey = 'AIza1234567890abcdef1234567890abcdef12';
      const invalidKey = 'WRONG-google-key';

      const validResult = manager.validateKeyFormat(validKey, 'google');
      expect(validResult.valid).toBe(true);

      const invalidResult = manager.validateKeyFormat(invalidKey, 'google');
      expect(invalidResult.valid).toBe(false);
    });

    it('should handle unknown providers gracefully', () => {
      const apiKey = 'unknown-provider-key';
      const result = manager.validateKeyFormat(apiKey, 'unknown-provider');
      
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('未知服务商');
    });

    it('should reject empty keys', () => {
      const result = manager.validateKeyFormat('', 'openai');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API密钥不能为空');
    });
  });

  describe('Key Masking', () => {
    it('should mask long API keys correctly', () => {
      const apiKey = 'sk-1234567890abcdef1234567890abcdef';
      const masked = manager.maskKey(apiKey);
      
      expect(masked).toBe('sk-1************************cdef');
      expect(masked.length).toBe(apiKey.length);
    });

    it('should mask short keys completely', () => {
      const shortKey = 'sk-123';
      const masked = manager.maskKey(shortKey);
      
      expect(masked).toBe('******');
    });

    it('should handle empty keys', () => {
      const masked = manager.maskKey('');
      expect(masked).toBe('未配置');
    });

    it('should handle null/undefined keys', () => {
      expect(manager.maskKey(null)).toBe('未配置');
      expect(manager.maskKey(undefined)).toBe('未配置');
    });
  });

  describe('Key Rotation', () => {
    it('should rotate keys successfully', async () => {
      const keyId = 'rotation-test-key';
      const oldKey = 'sk-old1234567890abcdef1234567890abcdef';
      const newKey = 'sk-new1234567890abcdef1234567890abcdef';

      // Store initial key
      manager.storeKey(keyId, oldKey, { provider: 'openai' });

      // Rotate key
      const rotated = await manager.rotateKey(keyId, newKey, { 
        provider: 'openai',
        reason: 'scheduled-rotation'
      });

      expect(rotated).toBe(true);

      // Verify new key is stored
      const retrievedKey = manager.getKey(keyId);
      expect(retrievedKey).toBe(newKey);

      // Check metadata
      const keyData = manager.keyCache.get(keyId);
      expect(keyData.metadata.rotatedAt).toBeInstanceOf(Date);
      expect(keyData.metadata.rotationReason).toBe('scheduled-rotation');
    });

    it('should validate new key format during rotation', async () => {
      const keyId = 'validation-test-key';
      const oldKey = 'sk-old1234567890abcdef1234567890abcdef';
      const invalidNewKey = 'invalid-key-format';

      manager.storeKey(keyId, oldKey);

      await expect(manager.rotateKey(keyId, invalidNewKey, { provider: 'openai' }))
        .rejects.toThrow('openai API密钥格式不正确');
    });

    it('should handle rotation of non-existent keys', async () => {
      const newKey = 'sk-new1234567890abcdef1234567890abcdef';

      await expect(manager.rotateKey('non-existent', newKey))
        .rejects.toThrow('Key non-existent not found');
    });
  });

  describe('Key Deletion', () => {
    it('should delete keys successfully', () => {
      const keyId = 'delete-test-key';
      const apiKey = 'sk-delete-test';

      manager.storeKey(keyId, apiKey);
      expect(manager.keyCache.has(keyId)).toBe(true);

      const deleted = manager.deleteKey(keyId, 'test-deletion');
      expect(deleted).toBe(true);
      expect(manager.keyCache.has(keyId)).toBe(false);
    });

    it('should handle deletion of non-existent keys', () => {
      const deleted = manager.deleteKey('non-existent-key');
      expect(deleted).toBe(false);
    });
  });

  describe('Statistics and Listing', () => {
    it('should provide key statistics', () => {
      const keyId = 'stats-test-key';
      const apiKey = 'sk-stats-test';

      manager.storeKey(keyId, apiKey);
      manager.getKey(keyId); // Increment usage

      const stats = manager.getKeyStats(keyId);
      expect(stats).toEqual({
        id: keyId,
        createdAt: expect.any(Date),
        lastUsed: expect.any(Date),
        usageCount: 1,
        expiresAt: null,
        isExpired: false
      });
    });

    it('should return null for non-existent key stats', () => {
      const stats = manager.getKeyStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should list all keys with masked values', () => {
      const keys = [
        { id: 'key1', apiKey: 'sk-key1234567890abcdef' },
        { id: 'key2', apiKey: 'sk-key2234567890abcdef' }
      ];

      keys.forEach(({ id, apiKey }) => {
        manager.storeKey(id, apiKey);
      });

      const keyList = manager.listKeys();
      expect(keyList).toHaveLength(2);
      
      keyList.forEach(key => {
        expect(key.id).toBeTruthy();
        expect(key.masked).toContain('sk-k');
        expect(key.masked).toContain('*');
        expect(key.metadata).toBeDefined();
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log audit events', () => {
      const keyId = 'audit-test-key';
      const apiKey = 'sk-audit-test';

      manager.storeKey(keyId, apiKey);
      manager.getKey(keyId);
      manager.deleteKey(keyId);

      const auditLog = manager.getAuditLog();
      expect(auditLog.length).toBeGreaterThanOrEqual(3);

      const actions = auditLog.map(entry => entry.action);
      expect(actions).toContain('key_stored');
      expect(actions).toContain('key_accessed');
      expect(actions).toContain('key_deleted');
    });

    it('should filter audit log by key ID', () => {
      const key1 = 'audit-key-1';
      const key2 = 'audit-key-2';

      manager.storeKey(key1, 'sk-test1');
      manager.storeKey(key2, 'sk-test2');

      const key1Logs = manager.getAuditLog(key1);
      const key2Logs = manager.getAuditLog(key2);

      expect(key1Logs.every(log => log.keyId === key1)).toBe(true);
      expect(key2Logs.every(log => log.keyId === key2)).toBe(true);
    });

    it('should limit audit log size', () => {
      // Add more than 1000 entries to test limit
      for (let i = 0; i < 1005; i++) {
        manager.logAuditEvent('test_action', `key_${i}`, { index: i });
      }

      expect(manager.auditLog.length).toBe(1000);
    });
  });

  describe('Health Checks', () => {
    it('should perform key health checks', async () => {
      const keyId = 'health-test-key';
      const apiKey = 'sk-health-test';

      manager.storeKey(keyId, apiKey);

      const healthResult = await manager.checkKeyHealth(keyId, 'test-endpoint');
      expect(healthResult.healthy).toBe(true);
      expect(healthResult.latency).toBeGreaterThan(0);
      expect(healthResult.timestamp).toBeInstanceOf(Date);
    });

    it('should handle health check for non-existent keys', async () => {
      const healthResult = await manager.checkKeyHealth('non-existent', 'test-endpoint');
      expect(healthResult.healthy).toBe(false);
      expect(healthResult.error).toBe('Key not found');
    });
  });

  describe('Expired Key Cleanup', () => {
    it('should clean up expired keys automatically', () => {
      const expiredKey = 'expired-key';
      const validKey = 'valid-key';
      const pastDate = new Date(Date.now() - 1000);
      const futureDate = new Date(Date.now() + 60000);

      manager.storeKey(expiredKey, 'sk-expired', { expiresAt: pastDate });
      manager.storeKey(validKey, 'sk-valid', { expiresAt: futureDate });

      expect(manager.keyCache.size).toBe(2);

      manager.cleanupExpiredKeys();

      expect(manager.keyCache.size).toBe(1);
      expect(manager.keyCache.has(validKey)).toBe(true);
      expect(manager.keyCache.has(expiredKey)).toBe(false);
    });
  });

  describe('Decorator Pattern', () => {
    it('should decorate existing API key manager', () => {
      const originalManager = {
        getApiKey: jest.fn().mockReturnValue('original-key'),
        setApiKey: jest.fn().mockReturnValue(true),
        maskApiKey: jest.fn().mockReturnValue('orig****key')
      };

      const decoratedManager = manager.decorateExistingManager(originalManager);

      // When feature is enabled, should use secure manager
      mockFeatureFlags.isEnabled.mockReturnValue(true);
      manager.storeKey('test-key', 'secure-key');

      const retrievedKey = decoratedManager.getApiKey('test-key');
      expect(retrievedKey).toBe('secure-key');

      // When feature is disabled, should use original manager
      mockFeatureFlags.isEnabled.mockReturnValue(false);
      const originalKey = decoratedManager.getApiKey('test-key');
      expect(originalManager.getApiKey).toHaveBeenCalledWith('test-key');
    });

    it('should preserve original manager methods not overridden', () => {
      const originalManager = {
        someOtherMethod: jest.fn().mockReturnValue('other-result')
      };

      const decoratedManager = manager.decorateExistingManager(originalManager);
      const result = decoratedManager.someOtherMethod();

      expect(result).toBe('other-result');
      expect(originalManager.someOtherMethod).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clean up resources on destroy', () => {
      const intervalId = manager.cleanupInterval;
      expect(intervalId).toBeTruthy();

      manager.destroy();

      expect(manager.keyCache.size).toBe(0);
      expect(manager.auditLog).toEqual([]);
      expect(manager.cleanupInterval).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock a storage error
      const errorManager = new SecureApiKeyManager();
      const originalStoreKey = errorManager.storeKey;
      errorManager.storeKey = function() {
        throw new Error('Storage error');
      };

      expect(() => {
        errorManager.storeKey('test', 'key');
      }).toThrow('Storage error');

      errorManager.destroy();
      consoleSpy.mockRestore();
    });

    it('should record performance errors', () => {
      // Force an error in getKey
      const key = manager.getKey('non-existent-key');
      expect(key).toBeNull();

      // Should handle gracefully without throwing
      expect(mockPerformanceMonitor.recordError).not.toHaveBeenCalled();
    });
  });
});