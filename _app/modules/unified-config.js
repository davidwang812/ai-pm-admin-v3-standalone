/**
 * Unified Config Module
 * 统一配置管理
 */

export class UnifiedConfigManager {
  constructor() {
    this.configs = new Map();
    this.profiles = new Map();
    this.activeProfile = 'default';
    this.cache = new Map();
    this.watchers = new Map();
  }

  /**
   * 设置配置
   */
  set(key, value, profile = null) {
    const targetProfile = profile || this.activeProfile;
    
    if (!this.configs.has(targetProfile)) {
      this.configs.set(targetProfile, new Map());
    }
    
    const profileConfig = this.configs.get(targetProfile);
    const oldValue = profileConfig.get(key);
    
    profileConfig.set(key, value);
    
    // 清除缓存
    this.clearCache(key, targetProfile);
    
    // 通知观察者
    this.notifyWatchers(key, value, oldValue, targetProfile);
    
    return this;
  }

  /**
   * 获取配置
   */
  get(key, defaultValue = null, profile = null) {
    const targetProfile = profile || this.activeProfile;
    const cacheKey = `${targetProfile}:${key}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    let value = defaultValue;
    
    // 从指定profile获取
    if (this.configs.has(targetProfile)) {
      const profileConfig = this.configs.get(targetProfile);
      if (profileConfig.has(key)) {
        value = profileConfig.get(key);
      }
    }
    
    // 如果没找到且不是默认profile，尝试从默认profile获取
    if (value === defaultValue && targetProfile !== 'default' && this.configs.has('default')) {
      const defaultConfig = this.configs.get('default');
      if (defaultConfig.has(key)) {
        value = defaultConfig.get(key);
      }
    }
    
    // 缓存结果
    this.cache.set(cacheKey, value);
    
    return value;
  }

  /**
   * 设置嵌套配置
   */
  setNested(path, value, profile = null) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    let current = this.getNestedObject(keys, profile, true);
    current[lastKey] = value;
    
    return this;
  }

  /**
   * 获取嵌套配置
   */
  getNested(path, defaultValue = null, profile = null) {
    const keys = path.split('.');
    let current = this.getNestedObject(keys, profile);
    
    return current !== undefined ? current : defaultValue;
  }

  /**
   * 获取或创建嵌套对象
   */
  getNestedObject(keys, profile = null, create = false) {
    const rootKey = keys[0];
    let current = this.get(rootKey, create ? {} : undefined, profile);
    
    if (create && current === undefined) {
      current = {};
      this.set(rootKey, current, profile);
    }
    
    for (let i = 1; i < keys.length; i++) {
      const key = keys[i];
      
      if (create) {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      } else {
        if (!current || typeof current !== 'object' || !current[key]) {
          return undefined;
        }
        current = current[key];
      }
    }
    
    return current;
  }

  /**
   * 删除配置
   */
  delete(key, profile = null) {
    const targetProfile = profile || this.activeProfile;
    
    if (this.configs.has(targetProfile)) {
      const profileConfig = this.configs.get(targetProfile);
      const existed = profileConfig.has(key);
      profileConfig.delete(key);
      
      if (existed) {
        this.clearCache(key, targetProfile);
        this.notifyWatchers(key, undefined, this.get(key, null, targetProfile), targetProfile);
      }
    }
    
    return this;
  }

  /**
   * 检查配置是否存在
   */
  has(key, profile = null) {
    const targetProfile = profile || this.activeProfile;
    
    if (this.configs.has(targetProfile)) {
      const profileConfig = this.configs.get(targetProfile);
      if (profileConfig.has(key)) return true;
    }
    
    // 检查默认profile
    if (targetProfile !== 'default' && this.configs.has('default')) {
      return this.configs.get('default').has(key);
    }
    
    return false;
  }

  /**
   * 创建配置文件
   */
  createProfile(name, baseProfile = 'default') {
    if (this.profiles.has(name)) {
      throw new Error(`Profile ${name} already exists`);
    }
    
    const profile = {
      name,
      baseProfile,
      created: new Date(),
      description: ''
    };
    
    this.profiles.set(name, profile);
    
    // 如果有基础profile，复制配置
    if (baseProfile && this.configs.has(baseProfile)) {
      const baseConfig = this.configs.get(baseProfile);
      const newConfig = new Map();
      
      for (const [key, value] of baseConfig) {
        newConfig.set(key, this.deepClone(value));
      }
      
      this.configs.set(name, newConfig);
    } else {
      this.configs.set(name, new Map());
    }
    
    return profile;
  }

  /**
   * 切换配置文件
   */
  switchProfile(name) {
    if (!this.profiles.has(name) && name !== 'default') {
      throw new Error(`Profile ${name} does not exist`);
    }
    
    const oldProfile = this.activeProfile;
    this.activeProfile = name;
    
    // 清除所有缓存
    this.cache.clear();
    
    // 通知profile切换
    this.notifyWatchers('$profile', name, oldProfile, name);
    
    return this;
  }

  /**
   * 获取当前配置文件
   */
  getCurrentProfile() {
    return this.activeProfile;
  }

  /**
   * 获取所有配置文件
   */
  getProfiles() {
    return Array.from(this.profiles.values());
  }

  /**
   * 导出配置
   */
  export(profile = null, format = 'json') {
    const targetProfile = profile || this.activeProfile;
    
    if (!this.configs.has(targetProfile)) {
      return format === 'json' ? '{}' : '';
    }
    
    const config = this.configs.get(targetProfile);
    const data = Object.fromEntries(config);
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'env') {
      return this.convertToEnv(data);
    }
    
    return data;
  }

  /**
   * 导入配置
   */
  import(data, profile = null, merge = false) {
    const targetProfile = profile || this.activeProfile;
    
    if (!merge || !this.configs.has(targetProfile)) {
      this.configs.set(targetProfile, new Map());
    }
    
    const profileConfig = this.configs.get(targetProfile);
    
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    
    for (const [key, value] of Object.entries(data)) {
      profileConfig.set(key, value);
    }
    
    // 清除缓存
    this.cache.clear();
    
    return this;
  }

  /**
   * 监听配置变化
   */
  watch(key, callback, profile = null) {
    const watchKey = `${profile || this.activeProfile}:${key}`;
    
    if (!this.watchers.has(watchKey)) {
      this.watchers.set(watchKey, []);
    }
    
    this.watchers.get(watchKey).push(callback);
    
    // 返回取消监听的函数
    return () => {
      const callbacks = this.watchers.get(watchKey);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 通知观察者
   */
  notifyWatchers(key, newValue, oldValue, profile) {
    const watchKey = `${profile}:${key}`;
    const globalWatchKey = `*:${key}`;
    
    [watchKey, globalWatchKey].forEach(wKey => {
      if (this.watchers.has(wKey)) {
        this.watchers.get(wKey).forEach(callback => {
          try {
            callback(newValue, oldValue, key, profile);
          } catch (error) {
            console.error('Config watcher error:', error);
          }
        });
      }
    });
  }

  /**
   * 清除缓存
   */
  clearCache(key = null, profile = null) {
    if (key && profile) {
      this.cache.delete(`${profile}:${key}`);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 深度克隆
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * 转换为环境变量格式
   */
  convertToEnv(data, prefix = '') {
    const lines = [];
    
    for (const [key, value] of Object.entries(data)) {
      const envKey = prefix ? `${prefix}_${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        lines.push(...this.convertToEnv(value, envKey));
      } else {
        lines.push(`${envKey.toUpperCase()}=${value}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 获取配置摘要
   */
  getSummary() {
    return {
      activeProfile: this.activeProfile,
      profileCount: this.profiles.size,
      configCount: this.configs.get(this.activeProfile)?.size || 0,
      cacheSize: this.cache.size,
      watcherCount: this.watchers.size
    };
  }
}

// 创建默认实例
const unifiedConfigManager = new UnifiedConfigManager();

// 设置一些默认配置
unifiedConfigManager.set('app.name', 'AI Product Manager V3');
unifiedConfigManager.set('app.version', '3.0.0');
unifiedConfigManager.set('app.environment', 'production');

export default unifiedConfigManager;