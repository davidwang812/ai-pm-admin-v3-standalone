/**
 * State Management Module
 * V3状态管理 - 响应式、持久化、调试支持
 */

export class StateManager {
  constructor() {
    // 状态存储
    this.state = {};
    
    // 订阅者
    this.subscribers = new Map();
    
    // 中间件
    this.middlewares = [];
    
    // 历史记录（用于调试）
    this.history = [];
    this.maxHistory = 50;
    
    // 持久化配置
    this.persistConfig = {
      enabled: true,
      key: 'admin_v3_state',
      whitelist: ['user', 'settings', 'preferences'],
      blacklist: ['temp', 'ui']
    };
    
    // 初始化
    this.init();
  }

  /**
   * 初始化状态管理器
   */
  init() {
    // 加载持久化状态
    this.loadPersistedState();
    
    // 设置默认状态
    this.setDefaultState();
    
    // 监听页面卸载，保存状态
    window.addEventListener('beforeunload', () => {
      this.persistState();
    });
    
    // 开发环境暴露到全局
    if (window.location.hostname === 'localhost') {
      window.__V3_STATE__ = this;
    }
  }

  /**
   * 设置默认状态
   */
  setDefaultState() {
    const defaults = {
      app: {
        version: '3.0.0',
        ready: false,
        loading: false,
        error: null
      },
      user: null,
      settings: {
        theme: 'light',
        language: 'zh-CN',
        notifications: true
      },
      ui: {
        sidebarCollapsed: false,
        activeModal: null,
        toast: null
      },
      data: {
        providers: [],
        catalog: [],
        config: {},
        analytics: {}
      }
    };
    
    // 合并默认状态（不覆盖已有值）
    this.state = this.deepMerge(defaults, this.state);
  }

  /**
   * 获取状态
   */
  get(path) {
    if (!path) return this.state;
    
    // 支持点号路径 'user.profile.name'
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    // 返回深拷贝，防止直接修改
    return this.deepClone(value);
  }

  /**
   * 设置状态
   */
  set(path, value, options = {}) {
    const oldState = this.deepClone(this.state);
    
    // 执行中间件
    const context = {
      path,
      value,
      oldValue: this.get(path),
      state: oldState,
      options
    };
    
    if (!this.runMiddlewares(context)) {
      console.log('State update cancelled by middleware');
      return false;
    }
    
    // 更新状态
    if (!path) {
      this.state = value;
    } else {
      const keys = path.split('.');
      let target = this.state;
      
      // 导航到目标父级
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }
      
      // 设置值
      const lastKey = keys[keys.length - 1];
      target[lastKey] = value;
    }
    
    // 记录历史
    if (!options.silent) {
      this.addToHistory({
        type: 'SET',
        path,
        value,
        oldValue: context.oldValue,
        timestamp: Date.now()
      });
    }
    
    // 通知订阅者
    this.notify(path, value, context.oldValue);
    
    // 持久化
    if (this.persistConfig.enabled && !options.skipPersist) {
      this.debouncedPersist();
    }
    
    console.log(`📝 State updated: ${path}`, value);
    return true;
  }

  /**
   * 更新状态（合并）
   */
  update(path, updates) {
    const current = this.get(path);
    
    if (typeof current !== 'object' || current === null) {
      return this.set(path, updates);
    }
    
    const merged = { ...current, ...updates };
    return this.set(path, merged);
  }

  /**
   * 删除状态
   */
  delete(path) {
    if (!path) return false;
    
    const keys = path.split('.');
    let target = this.state;
    
    // 导航到目标父级
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!target[key] || typeof target[key] !== 'object') {
        return false;
      }
      target = target[key];
    }
    
    const lastKey = keys[keys.length - 1];
    const oldValue = target[lastKey];
    delete target[lastKey];
    
    // 记录历史
    this.addToHistory({
      type: 'DELETE',
      path,
      oldValue,
      timestamp: Date.now()
    });
    
    // 通知订阅者
    this.notify(path, undefined, oldValue);
    
    console.log(`🗑️ State deleted: ${path}`);
    return true;
  }

  /**
   * 订阅状态变化
   */
  subscribe(path, callback, options = {}) {
    const id = this.generateId();
    
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Map());
    }
    
    this.subscribers.get(path).set(id, {
      callback,
      options
    });
    
    // 立即执行一次（如果需要）
    if (options.immediate) {
      callback(this.get(path), undefined);
    }
    
    // 返回取消订阅函数
    return () => {
      const pathSubscribers = this.subscribers.get(path);
      if (pathSubscribers) {
        pathSubscribers.delete(id);
        if (pathSubscribers.size === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }

  /**
   * 通知订阅者
   */
  notify(path, newValue, oldValue) {
    // 精确匹配订阅者
    const exactSubscribers = this.subscribers.get(path);
    if (exactSubscribers) {
      exactSubscribers.forEach(({ callback }) => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error('Subscriber error:', error);
        }
      });
    }
    
    // 通知父级路径订阅者
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      const parentSubscribers = this.subscribers.get(parentPath);
      
      if (parentSubscribers) {
        const parentValue = this.get(parentPath);
        parentSubscribers.forEach(({ callback, options }) => {
          if (options.deep !== false) {
            try {
              callback(parentValue, parentValue);
            } catch (error) {
              console.error('Subscriber error:', error);
            }
          }
        });
      }
    }
    
    // 通知全局订阅者
    const globalSubscribers = this.subscribers.get('*');
    if (globalSubscribers) {
      globalSubscribers.forEach(({ callback }) => {
        try {
          callback({ path, newValue, oldValue });
        } catch (error) {
          console.error('Global subscriber error:', error);
        }
      });
    }
  }

  /**
   * 使用中间件
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * 运行中间件
   */
  runMiddlewares(context) {
    for (const middleware of this.middlewares) {
      try {
        const result = middleware(context);
        if (result === false) {
          return false;
        }
      } catch (error) {
        console.error('Middleware error:', error);
      }
    }
    return true;
  }

  /**
   * 计算属性
   */
  computed(name, getter) {
    Object.defineProperty(this.state, name, {
      get: getter,
      enumerable: true,
      configurable: true
    });
  }

  /**
   * 监听器
   */
  watch(path, handler, options = {}) {
    return this.subscribe(path, handler, options);
  }

  /**
   * 批量更新
   */
  batch(updates) {
    const results = [];
    
    // 暂时禁用通知
    const originalNotify = this.notify;
    this.notify = () => {};
    
    // 执行所有更新
    for (const [path, value] of Object.entries(updates)) {
      results.push(this.set(path, value, { skipPersist: true }));
    }
    
    // 恢复通知并触发一次
    this.notify = originalNotify;
    
    // 通知所有相关订阅者
    for (const path of Object.keys(updates)) {
      this.notify(path, this.get(path), null);
    }
    
    // 持久化一次
    this.debouncedPersist();
    
    return results.every(r => r === true);
  }

  /**
   * 重置状态
   */
  reset(path = null) {
    if (path) {
      // 重置特定路径
      const defaults = {
        app: { version: '3.0.0', ready: false, loading: false, error: null },
        user: null,
        settings: { theme: 'light', language: 'zh-CN', notifications: true },
        ui: { sidebarCollapsed: false, activeModal: null, toast: null },
        data: { providers: [], catalog: [], config: {}, analytics: {} }
      };
      
      const defaultValue = this.getByPath(defaults, path);
      if (defaultValue !== undefined) {
        this.set(path, defaultValue);
      }
    } else {
      // 重置所有
      this.state = {};
      this.setDefaultState();
      this.notify('*', this.state, {});
    }
    
    console.log('🔄 State reset' + (path ? `: ${path}` : ''));
  }

  /**
   * 加载持久化状态
   */
  loadPersistedState() {
    if (!this.persistConfig.enabled) return;
    
    try {
      const stored = localStorage.getItem(this.persistConfig.key);
      if (!stored) return;
      
      const parsed = JSON.parse(stored);
      
      // 只加载白名单中的状态
      const filtered = {};
      for (const key of this.persistConfig.whitelist) {
        if (key in parsed) {
          filtered[key] = parsed[key];
        }
      }
      
      this.state = { ...this.state, ...filtered };
      console.log('📥 State loaded from storage');
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }

  /**
   * 持久化状态
   */
  persistState() {
    if (!this.persistConfig.enabled) return;
    
    try {
      // 过滤黑名单
      const filtered = {};
      for (const [key, value] of Object.entries(this.state)) {
        if (!this.persistConfig.blacklist.includes(key)) {
          filtered[key] = value;
        }
      }
      
      localStorage.setItem(this.persistConfig.key, JSON.stringify(filtered));
      console.log('💾 State persisted');
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  /**
   * 防抖持久化
   */
  debouncedPersist = this.debounce(() => {
    this.persistState();
  }, 500);

  /**
   * 添加到历史记录
   */
  addToHistory(entry) {
    this.history.push(entry);
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * 获取历史记录
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * 时间旅行（用于调试）
   */
  timeTravel(index) {
    if (index < 0 || index >= this.history.length) {
      console.error('Invalid history index');
      return;
    }
    
    // 重建到指定时间点的状态
    // 这是一个简化版本，实际实现需要更复杂的逻辑
    console.log('Time travel to:', this.history[index]);
  }

  /**
   * 获取状态快照
   */
  getSnapshot() {
    return {
      state: this.deepClone(this.state),
      timestamp: Date.now(),
      subscribers: this.subscribers.size,
      history: this.history.length
    };
  }

  /**
   * 工具函数：深拷贝
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * 工具函数：深合并
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  /**
   * 工具函数：检查是否为对象
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 工具函数：根据路径获取值
   */
  getByPath(obj, path) {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * 工具函数：生成唯一ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 工具函数：防抖
   */
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}

// 创建单例实例
const state = new StateManager();

export default state;