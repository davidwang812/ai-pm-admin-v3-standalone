/**
 * Feature Flags System
 * 功能开关系统 - 用于安全地启用/禁用新功能
 */

class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.listeners = new Map();
    this.storage = this.getStorage();
    
    // 加载默认配置
    this.loadDefaultFlags();
    
    // 从存储加载配置
    this.loadFromStorage();
  }

  /**
   * 获取存储实例
   */
  getStorage() {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    // Node.js环境下的fallback
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };
  }

  /**
   * 加载默认功能开关配置
   */
  loadDefaultFlags() {
    const defaultFlags = {
      // 安全改进相关
      USE_ENHANCED_ERROR_HANDLING: false,
      USE_SECURE_API_KEY_STORAGE: false,
      USE_PERFORMANCE_MONITORING: false,
      USE_AUTO_ROLLBACK: false,
      
      // 功能改进相关
      USE_NEW_PRICE_STANDARDIZER: false,
      USE_UNIFIED_CONFIG_MANAGER: false,
      USE_ENHANCED_LOGGER: false,
      USE_IMPROVED_UI_RENDERER: false,
      
      // 测试和调试相关
      ENABLE_DEBUG_MODE: false,
      ENABLE_PERFORMANCE_LOGS: false,
      ENABLE_SAFETY_CHECKS: true,
      
      // 实验性功能
      ENABLE_EXPERIMENTAL_FEATURES: false,
      USE_NEW_LOAD_BALANCER: false,
      USE_ADVANCED_CACHING: false
    };

    for (const [key, value] of Object.entries(defaultFlags)) {
      this.flags.set(key, {
        enabled: value,
        description: this.getDescription(key),
        rolloutPercentage: 0,
        environment: ['development', 'staging', 'production'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  /**
   * 获取功能开关描述
   */
  getDescription(flagKey) {
    const descriptions = {
      USE_ENHANCED_ERROR_HANDLING: '使用增强的错误处理机制',
      USE_SECURE_API_KEY_STORAGE: '使用安全的API密钥存储',
      USE_PERFORMANCE_MONITORING: '启用性能监控',
      USE_AUTO_ROLLBACK: '启用自动回滚机制',
      USE_NEW_PRICE_STANDARDIZER: '使用新的价格标准化器',
      USE_UNIFIED_CONFIG_MANAGER: '使用统一配置管理器',
      USE_ENHANCED_LOGGER: '使用增强日志系统',
      USE_IMPROVED_UI_RENDERER: '使用改进的UI渲染器',
      ENABLE_DEBUG_MODE: '启用调试模式',
      ENABLE_PERFORMANCE_LOGS: '启用性能日志',
      ENABLE_SAFETY_CHECKS: '启用安全检查',
      ENABLE_EXPERIMENTAL_FEATURES: '启用实验性功能',
      USE_NEW_LOAD_BALANCER: '使用新的负载均衡器',
      USE_ADVANCED_CACHING: '使用高级缓存策略'
    };
    
    return descriptions[flagKey] || '未知功能开关';
  }

  /**
   * 从存储加载配置
   */
  loadFromStorage() {
    try {
      const stored = this.storage.getItem('feature_flags');
      if (stored) {
        const storedFlags = JSON.parse(stored);
        for (const [key, value] of Object.entries(storedFlags)) {
          if (this.flags.has(key)) {
            const existing = this.flags.get(key);
            this.flags.set(key, {
              ...existing,
              ...value,
              updatedAt: new Date(value.updatedAt)
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load feature flags from storage:', error);
    }
  }

  /**
   * 保存到存储
   */
  saveToStorage() {
    try {
      const flagsObject = {};
      for (const [key, value] of this.flags) {
        flagsObject[key] = value;
      }
      this.storage.setItem('feature_flags', JSON.stringify(flagsObject));
    } catch (error) {
      console.error('Failed to save feature flags to storage:', error);
    }
  }

  /**
   * 检查功能是否启用
   */
  isEnabled(flagKey, context = {}) {
    if (!this.flags.has(flagKey)) {
      console.warn(`Feature flag '${flagKey}' not found, defaulting to false`);
      return false;
    }

    const flag = this.flags.get(flagKey);
    
    // 基本启用检查
    if (!flag.enabled) {
      return false;
    }
    
    // 环境检查
    const environment = context.environment || this.getCurrentEnvironment();
    if (!flag.environment.includes(environment)) {
      return false;
    }
    
    // 渐进式推出检查
    if (flag.rolloutPercentage < 100) {
      const userId = context.userId || this.getUserId();
      const hash = this.hashString(flagKey + userId);
      const userPercentile = (hash % 100) + 1;
      if (userPercentile > flag.rolloutPercentage) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 启用功能开关
   */
  enable(flagKey, options = {}) {
    if (!this.flags.has(flagKey)) {
      throw new Error(`Feature flag '${flagKey}' not found`);
    }

    const flag = this.flags.get(flagKey);
    const updatedFlag = {
      ...flag,
      enabled: true,
      rolloutPercentage: options.rolloutPercentage || 100,
      updatedAt: new Date()
    };

    this.flags.set(flagKey, updatedFlag);
    this.saveToStorage();
    this.notifyListeners(flagKey, true, false);
    
    console.log(`Feature flag '${flagKey}' enabled`);
  }

  /**
   * 禁用功能开关
   */
  disable(flagKey) {
    if (!this.flags.has(flagKey)) {
      throw new Error(`Feature flag '${flagKey}' not found`);
    }

    const flag = this.flags.get(flagKey);
    const updatedFlag = {
      ...flag,
      enabled: false,
      updatedAt: new Date()
    };

    this.flags.set(flagKey, updatedFlag);
    this.saveToStorage();
    this.notifyListeners(flagKey, false, true);
    
    console.log(`Feature flag '${flagKey}' disabled`);
  }

  /**
   * 渐进式推出
   */
  rollout(flagKey, percentage) {
    if (!this.flags.has(flagKey)) {
      throw new Error(`Feature flag '${flagKey}' not found`);
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    const flag = this.flags.get(flagKey);
    const updatedFlag = {
      ...flag,
      enabled: percentage > 0,
      rolloutPercentage: percentage,
      updatedAt: new Date()
    };

    this.flags.set(flagKey, updatedFlag);
    this.saveToStorage();
    
    console.log(`Feature flag '${flagKey}' rolled out to ${percentage}%`);
  }

  /**
   * 监听功能开关变化
   */
  onFlagChange(flagKey, callback) {
    if (!this.listeners.has(flagKey)) {
      this.listeners.set(flagKey, []);
    }
    this.listeners.get(flagKey).push(callback);
    
    // 返回取消监听函数
    return () => {
      const callbacks = this.listeners.get(flagKey);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 通知监听器
   */
  notifyListeners(flagKey, newValue, oldValue) {
    const callbacks = this.listeners.get(flagKey);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(flagKey, newValue, oldValue);
        } catch (error) {
          console.error(`Error in feature flag listener for '${flagKey}':`, error);
        }
      });
    }
  }

  /**
   * 获取所有功能开关状态
   */
  getAllFlags() {
    const result = {};
    for (const [key, value] of this.flags) {
      result[key] = {
        ...value,
        isEnabled: this.isEnabled(key)
      };
    }
    return result;
  }

  /**
   * 重置所有功能开关
   */
  reset() {
    this.flags.clear();
    this.listeners.clear();
    this.storage.removeItem('feature_flags');
    this.loadDefaultFlags();
    console.log('Feature flags reset to defaults');
  }

  /**
   * 获取当前环境
   */
  getCurrentEnvironment() {
    if (typeof process !== 'undefined' && process.env.NODE_ENV) {
      return process.env.NODE_ENV;
    }
    
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
      }
      if (hostname.includes('staging') || hostname.includes('test')) {
        return 'staging';
      }
    }
    
    return 'production';
  }

  /**
   * 获取用户ID（用于渐进式推出）
   */
  getUserId() {
    // 简单的用户标识，可以根据实际情况调整
    if (typeof window !== 'undefined') {
      let userId = localStorage.getItem('user_id');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('user_id', userId);
      }
      return userId;
    }
    return 'anonymous';
  }

  /**
   * 简单哈希函数
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * 创建安全的功能包装器
   */
  withFeature(flagKey, enabledImplementation, disabledImplementation = null) {
    return (...args) => {
      if (this.isEnabled(flagKey)) {
        try {
          return enabledImplementation(...args);
        } catch (error) {
          console.error(`Error in enabled feature '${flagKey}':`, error);
          // 自动回退到禁用实现
          if (disabledImplementation) {
            console.log(`Falling back to disabled implementation for '${flagKey}'`);
            return disabledImplementation(...args);
          }
          throw error;
        }
      } else {
        return disabledImplementation ? disabledImplementation(...args) : undefined;
      }
    };
  }
}

// 创建全局实例
const featureFlags = new FeatureFlags();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FeatureFlags, featureFlags };
} else if (typeof window !== 'undefined') {
  window.FeatureFlags = FeatureFlags;
  window.featureFlags = featureFlags;
}

export { FeatureFlags, featureFlags };