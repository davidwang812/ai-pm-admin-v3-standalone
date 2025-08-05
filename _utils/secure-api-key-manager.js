/**
 * Secure API Key Manager
 * 安全API密钥管理器 - 使用装饰器模式增强现有API密钥处理
 */

import { featureFlags } from './feature-flags.js';
import { performanceMonitor } from './performance-monitor.js';

class SecureApiKeyManager {
  constructor() {
    this.keyCache = new Map();
    this.encryptionKey = this.getEncryptionKey();
    this.auditLog = [];
    this.keyRotationSchedule = new Map();
    
    // 清理过期缓存的定时器
    this.cleanupInterval = setInterval(() => this.cleanupExpiredKeys(), 5 * 60 * 1000); // 5分钟
  }

  /**
   * 获取加密密钥
   */
  getEncryptionKey() {
    // 在生产环境中，这应该从安全的密钥管理服务获取
    if (typeof process !== 'undefined' && process.env.ENCRYPTION_KEY) {
      return process.env.ENCRYPTION_KEY;
    }
    
    // 开发环境默认密钥（不应该在生产中使用）
    if (typeof window !== 'undefined') {
      let devKey = localStorage.getItem('dev_encryption_key');
      if (!devKey) {
        devKey = this.generateRandomKey();
        localStorage.setItem('dev_encryption_key', devKey);
        console.warn('⚠️ Using development encryption key. Do not use in production!');
      }
      return devKey;
    }
    
    return 'dev-key-' + Date.now(); // 最后的fallback
  }

  /**
   * 生成随机密钥
   */
  generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 加密API密钥
   */
  encrypt(plaintext) {
    if (!featureFlags.isEnabled('USE_SECURE_API_KEY_STORAGE')) {
      return plaintext; // 如果功能未启用，返回原文
    }

    try {
      // 简单的XOR加密（生产环境应该使用更强的加密）
      const key = this.encryptionKey;
      let encrypted = '';
      
      for (let i = 0; i < plaintext.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const textChar = plaintext.charCodeAt(i);
        encrypted += String.fromCharCode(textChar ^ keyChar);
      }
      
      // Base64编码
      const base64 = typeof btoa !== 'undefined' 
        ? btoa(encrypted)
        : Buffer.from(encrypted).toString('base64');
      
      return `enc:${base64}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      performanceMonitor.recordError('api_key_encryption', error);
      return plaintext; // 加密失败时返回原文
    }
  }

  /**
   * 解密API密钥
   */
  decrypt(ciphertext) {
    if (!ciphertext || !ciphertext.startsWith('enc:')) {
      return ciphertext; // 未加密的文本直接返回
    }

    if (!featureFlags.isEnabled('USE_SECURE_API_KEY_STORAGE')) {
      return ciphertext; // 功能未启用时不解密
    }

    try {
      const base64 = ciphertext.substring(4); // 移除 'enc:' 前缀
      
      // Base64解码
      const encrypted = typeof atob !== 'undefined'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString();
      
      // XOR解密
      const key = this.encryptionKey;
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encChar ^ keyChar);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      performanceMonitor.recordError('api_key_decryption', error);
      return null;
    }
  }

  /**
   * 安全存储API密钥
   */
  storeKey(keyId, apiKey, metadata = {}) {
    const startTime = performance.now();
    
    try {
      const encryptedKey = this.encrypt(apiKey);
      const keyData = {
        id: keyId,
        encrypted: encryptedKey,
        metadata: {
          ...metadata,
          createdAt: new Date(),
          lastUsed: null,
          usageCount: 0,
          expiresAt: metadata.expiresAt || null
        }
      };

      this.keyCache.set(keyId, keyData);
      
      // 审计日志
      this.logAuditEvent('key_stored', keyId, { metadata });
      
      const duration = performance.now() - startTime;
      performanceMonitor.record('api_key.store_time', duration);
      
      return true;
    } catch (error) {
      console.error('Failed to store API key:', error);
      performanceMonitor.recordError('api_key_storage', error);
      return false;
    }
  }

  /**
   * 安全获取API密钥
   */
  getKey(keyId, context = {}) {
    const startTime = performance.now();
    
    try {
      const keyData = this.keyCache.get(keyId);
      if (!keyData) {
        this.logAuditEvent('key_not_found', keyId, context);
        return null;
      }

      // 检查是否过期
      if (keyData.metadata.expiresAt && new Date() > keyData.metadata.expiresAt) {
        this.logAuditEvent('key_expired', keyId, context);
        this.keyCache.delete(keyId);
        return null;
      }

      // 更新使用统计
      keyData.metadata.lastUsed = new Date();
      keyData.metadata.usageCount++;

      // 解密密钥
      const plainKey = this.decrypt(keyData.encrypted);
      
      // 审计日志
      this.logAuditEvent('key_accessed', keyId, {
        ...context,
        usageCount: keyData.metadata.usageCount
      });

      const duration = performance.now() - startTime;
      performanceMonitor.record('api_key.retrieve_time', duration);
      
      return plainKey;
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
      performanceMonitor.recordError('api_key_retrieval', error);
      return null;
    }
  }

  /**
   * 掩码显示API密钥
   */
  maskKey(apiKey) {
    if (!apiKey) return '未配置';
    
    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }
    
    const start = apiKey.slice(0, 4);
    const end = apiKey.slice(-4);
    const middleLength = apiKey.length - 8;
    return start + '*'.repeat(middleLength) + end;
  }

  /**
   * 验证API密钥格式
   */
  validateKeyFormat(apiKey, provider) {
    if (!apiKey) return { valid: false, error: 'API密钥不能为空' };

    const patterns = {
      openai: /^sk-[a-zA-Z0-9]{32,}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9-]{40,}$/,
      google: /^AIza[a-zA-Z0-9_-]{30,}$/,
      azure: /^[a-f0-9]{32}$/,
      moonshot: /^sk-[a-zA-Z0-9]{32,}$/
    };

    const pattern = patterns[provider];
    if (!pattern) {
      return { valid: true, warning: '未知服务商，无法验证密钥格式' };
    }

    if (!pattern.test(apiKey)) {
      return { 
        valid: false, 
        error: `${provider} API密钥格式不正确` 
      };
    }

    return { valid: true };
  }

  /**
   * 轮换API密钥
   */
  async rotateKey(keyId, newApiKey, options = {}) {
    const startTime = performance.now();
    
    try {
      const oldKeyData = this.keyCache.get(keyId);
      if (!oldKeyData) {
        throw new Error(`Key ${keyId} not found`);
      }

      // 验证新密钥
      const validation = this.validateKeyFormat(newApiKey, options.provider);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 存储新密钥
      const rotated = this.storeKey(keyId, newApiKey, {
        ...oldKeyData.metadata,
        rotatedAt: new Date(),
        rotationReason: options.reason || 'manual'
      });

      if (!rotated) {
        throw new Error('Failed to store rotated key');
      }

      // 记录轮换事件
      this.logAuditEvent('key_rotated', keyId, {
        reason: options.reason,
        oldKeyMask: this.maskKey(this.decrypt(oldKeyData.encrypted))
      });

      const duration = performance.now() - startTime;
      performanceMonitor.record('api_key.rotation_time', duration);

      return true;
    } catch (error) {
      console.error('Key rotation failed:', error);
      performanceMonitor.recordError('api_key_rotation', error);
      throw error;
    }
  }

  /**
   * 删除API密钥
   */
  deleteKey(keyId, reason = 'manual') {
    try {
      const keyData = this.keyCache.get(keyId);
      if (!keyData) {
        return false;
      }

      this.keyCache.delete(keyId);
      
      // 审计日志
      this.logAuditEvent('key_deleted', keyId, { reason });
      
      return true;
    } catch (error) {
      console.error('Failed to delete API key:', error);
      performanceMonitor.recordError('api_key_deletion', error);
      return false;
    }
  }

  /**
   * 获取密钥统计信息
   */
  getKeyStats(keyId) {
    const keyData = this.keyCache.get(keyId);
    if (!keyData) return null;

    return {
      id: keyId,
      createdAt: keyData.metadata.createdAt,
      lastUsed: keyData.metadata.lastUsed,
      usageCount: keyData.metadata.usageCount,
      expiresAt: keyData.metadata.expiresAt,
      isExpired: keyData.metadata.expiresAt && new Date() > keyData.metadata.expiresAt
    };
  }

  /**
   * 获取所有密钥列表（不包含实际密钥值）
   */
  listKeys() {
    const keys = [];
    for (const [keyId, keyData] of this.keyCache) {
      keys.push({
        id: keyId,
        masked: this.maskKey(this.decrypt(keyData.encrypted)),
        metadata: keyData.metadata
      });
    }
    return keys;
  }

  /**
   * 记录审计事件
   */
  logAuditEvent(action, keyId, details = {}) {
    const event = {
      timestamp: new Date(),
      action,
      keyId,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      ipAddress: 'unknown' // 在实际应用中应该获取真实IP
    };

    this.auditLog.push(event);
    
    // 保持最近1000条审计日志
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    // 记录到性能监控
    performanceMonitor.record('api_key.audit_event', 1, { action });
  }

  /**
   * 获取审计日志
   */
  getAuditLog(keyId = null, limit = 100) {
    let logs = this.auditLog;
    
    if (keyId) {
      logs = logs.filter(log => log.keyId === keyId);
    }
    
    return logs.slice(-limit).reverse(); // 最新的在前
  }

  /**
   * 清理过期密钥
   */
  cleanupExpiredKeys() {
    const now = new Date();
    const expiredKeys = [];
    
    for (const [keyId, keyData] of this.keyCache) {
      if (keyData.metadata.expiresAt && now > keyData.metadata.expiresAt) {
        expiredKeys.push(keyId);
      }
    }
    
    expiredKeys.forEach(keyId => {
      this.keyCache.delete(keyId);
      this.logAuditEvent('key_expired_cleanup', keyId, {});
    });
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired API keys`);
      performanceMonitor.record('api_key.cleanup_count', expiredKeys.length);
    }
  }

  /**
   * 检查密钥健康状态
   */
  async checkKeyHealth(keyId, testEndpoint) {
    const startTime = performance.now();
    
    try {
      const apiKey = this.getKey(keyId);
      if (!apiKey) {
        return { healthy: false, error: 'Key not found' };
      }

      // 这里应该实际调用API测试密钥有效性
      // 为了演示，我们模拟一个测试
      const testResult = await this.testApiKey(apiKey, testEndpoint);
      
      const duration = performance.now() - startTime;
      performanceMonitor.record('api_key.health_check_time', duration);
      
      return testResult;
    } catch (error) {
      performanceMonitor.recordError('api_key_health_check', error);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * 测试API密钥（模拟）
   */
  async testApiKey(apiKey, endpoint) {
    // 这是一个模拟的测试函数
    // 在实际应用中，这里应该调用相应的API进行测试
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          healthy: true,
          latency: Math.random() * 200 + 100,
          timestamp: new Date()
        });
      }, 100);
    });
  }

  /**
   * 销毁管理器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.keyCache.clear();
    this.auditLog = [];
    console.log('SecureApiKeyManager destroyed');
  }

  /**
   * 装饰现有的API密钥处理函数
   */
  decorateExistingManager(originalManager) {
    const secureManager = this;
    
    return new Proxy(originalManager, {
      get(target, prop) {
        switch (prop) {
          case 'getApiKey':
            return function(keyId, ...args) {
              if (featureFlags.isEnabled('USE_SECURE_API_KEY_STORAGE')) {
                return secureManager.getKey(keyId, { source: 'decorated_call' });
              }
              return target[prop].apply(target, [keyId, ...args]);
            };
            
          case 'setApiKey':
            return function(keyId, apiKey, ...args) {
              if (featureFlags.isEnabled('USE_SECURE_API_KEY_STORAGE')) {
                return secureManager.storeKey(keyId, apiKey, { source: 'decorated_call' });
              }
              return target[prop].apply(target, [keyId, apiKey, ...args]);
            };
            
          case 'maskApiKey':
            return function(apiKey, ...args) {
              return secureManager.maskKey(apiKey);
            };
            
          default:
            return target[prop];
        }
      }
    });
  }
}

// 创建全局实例
const secureApiKeyManager = new SecureApiKeyManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureApiKeyManager, secureApiKeyManager };
}

export { SecureApiKeyManager, secureApiKeyManager };