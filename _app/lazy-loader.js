/**
 * Lazy Loader Module
 * V3懒加载管理器 - 动态导入、预加载、性能监控
 */

export class LazyLoader {
  constructor() {
    this.modules = new Map();
    this.preloadQueue = [];
    this.loading = new Map();
    this.observers = new Map();
    
    // 性能统计
    this.stats = {
      loaded: 0,
      cached: 0,
      failed: 0,
      totalTime: 0
    };
    
    // 配置
    this.config = {
      preloadDelay: 200,
      retryAttempts: 2,
      retryDelay: 1000,
      enablePreload: true,
      enableIntersectionObserver: true
    };
    
    this.init();
  }

  /**
   * 初始化
   */
  init() {
    // 设置Intersection Observer用于视口预加载
    if (this.config.enableIntersectionObserver && 'IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    }
    
    // 监听网络状态变化
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.onNetworkChange();
      });
    }
  }

  /**
   * 懒加载模块
   */
  async load(modulePath, options = {}) {
    // 检查缓存
    if (this.modules.has(modulePath)) {
      this.stats.cached++;
      console.log(`✅ Module from cache: ${modulePath}`);
      return this.modules.get(modulePath);
    }
    
    // 检查是否正在加载
    if (this.loading.has(modulePath)) {
      console.log(`⏳ Waiting for loading module: ${modulePath}`);
      return this.loading.get(modulePath);
    }
    
    // 开始加载
    const loadPromise = this.performLoad(modulePath, options);
    this.loading.set(modulePath, loadPromise);
    
    try {
      const module = await loadPromise;
      this.modules.set(modulePath, module);
      this.loading.delete(modulePath);
      return module;
    } catch (error) {
      this.loading.delete(modulePath);
      throw error;
    }
  }

  /**
   * 执行加载
   */
  async performLoad(modulePath, options = {}) {
    const startTime = performance.now();
    let lastError = null;
    
    // 重试机制
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      if (attempt > 0) {
        console.log(`🔄 Retry ${attempt}/${this.config.retryAttempts}: ${modulePath}`);
        await this.delay(this.config.retryDelay);
      }
      
      try {
        console.log(`📦 Loading module: ${modulePath}`);
        
        // 动态导入
        const module = await import(modulePath);
        
        const loadTime = performance.now() - startTime;
        this.stats.loaded++;
        this.stats.totalTime += loadTime;
        
        console.log(`✅ Module loaded in ${loadTime.toFixed(2)}ms: ${modulePath}`);
        
        // 触发加载完成事件
        this.onModuleLoaded(modulePath, module, loadTime);
        
        return module.default || module;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Failed to load module (attempt ${attempt + 1}):`, error);
      }
    }
    
    this.stats.failed++;
    this.onModuleFailed(modulePath, lastError);
    throw lastError;
  }

  /**
   * 预加载模块
   */
  preload(modulePath, priority = 'low') {
    if (this.modules.has(modulePath) || this.loading.has(modulePath)) {
      return; // 已加载或正在加载
    }
    
    const preloadItem = { path: modulePath, priority };
    
    if (priority === 'high') {
      // 高优先级立即加载
      this.load(modulePath).catch(() => {});
    } else if (priority === 'medium') {
      // 中优先级延迟加载
      setTimeout(() => {
        this.load(modulePath).catch(() => {});
      }, this.config.preloadDelay);
    } else {
      // 低优先级空闲时加载
      this.preloadQueue.push(preloadItem);
      this.processPreloadQueue();
    }
  }

  /**
   * 处理预加载队列
   */
  processPreloadQueue() {
    if (this.preloadQueue.length === 0) return;
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const item = this.preloadQueue.shift();
        if (item) {
          this.load(item.path).catch(() => {});
          this.processPreloadQueue();
        }
      }, { timeout: 2000 });
    } else {
      // 降级方案
      setTimeout(() => {
        const item = this.preloadQueue.shift();
        if (item) {
          this.load(item.path).catch(() => {});
          this.processPreloadQueue();
        }
      }, 1000);
    }
  }

  /**
   * 批量预加载
   */
  preloadBatch(modules) {
    modules.forEach(({ path, priority = 'low' }) => {
      this.preload(path, priority);
    });
  }

  /**
   * 创建懒加载组件
   */
  lazy(loader, options = {}) {
    return {
      _lazy: true,
      loader,
      options,
      load: async () => {
        const module = await loader();
        return module.default || module;
      }
    };
  }

  /**
   * 设置Intersection Observer
   */
  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const modulePath = element.dataset.lazyModule;
          
          if (modulePath) {
            this.preload(modulePath, 'high');
            this.observer.unobserve(element);
          }
        }
      });
    }, {
      rootMargin: '50px'
    });
  }

  /**
   * 观察元素
   */
  observe(element) {
    if (this.observer && element.dataset.lazyModule) {
      this.observer.observe(element);
    }
  }

  /**
   * 基于路由预加载
   */
  preloadForRoute(currentRoute) {
    const routePreloadMap = {
      '/dashboard': [
        { path: '../_pages/ai-service/index.js', priority: 'medium' },
        { path: '../_pages/user/index.js', priority: 'low' }
      ],
      '/ai-service': [
        { path: '../_pages/ai-service/modules/provider-list.js', priority: 'high' },
        { path: '../_pages/ai-service/modules/provider-form.js', priority: 'medium' },
        { path: '../_pages/billing/index.js', priority: 'low' }
      ],
      '/user': [
        { path: '../_pages/user/modules/user-list.js', priority: 'high' },
        { path: '../_pages/billing/index.js', priority: 'medium' }
      ]
    };
    
    const modules = routePreloadMap[currentRoute] || [];
    this.preloadBatch(modules);
  }

  /**
   * 网络状态变化处理
   */
  onNetworkChange() {
    const connection = navigator.connection;
    
    if (connection.effectiveType === '4g' && !connection.saveData) {
      // 好网络，激进预加载
      this.config.enablePreload = true;
      this.processPreloadQueue();
    } else if (connection.effectiveType === '2g' || connection.saveData) {
      // 差网络或省流量模式，停止预加载
      this.config.enablePreload = false;
      this.preloadQueue = [];
    }
  }

  /**
   * 模块加载完成回调
   */
  onModuleLoaded(path, module, loadTime) {
    // 可以在这里添加监控上报
    if (window.performance && window.performance.measure) {
      performance.mark(`module-loaded-${path}`);
    }
  }

  /**
   * 模块加载失败回调
   */
  onModuleFailed(path, error) {
    // 可以在这里添加错误上报
    console.error(`Module load failed: ${path}`, error);
  }

  /**
   * 清除缓存
   */
  clearCache(modulePath = null) {
    if (modulePath) {
      this.modules.delete(modulePath);
    } else {
      this.modules.clear();
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.modules.size,
      averageLoadTime: this.stats.loaded ? 
        (this.stats.totalTime / this.stats.loaded).toFixed(2) + 'ms' : '0ms',
      cacheHitRate: this.stats.cached + this.stats.loaded ? 
        ((this.stats.cached / (this.stats.cached + this.stats.loaded)) * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建模块代理（用于条件加载）
   */
  createProxy(modulePath) {
    let module = null;
    
    return new Proxy({}, {
      get: async (target, prop) => {
        if (!module) {
          module = await this.load(modulePath);
        }
        return module[prop];
      }
    });
  }

  /**
   * 并行加载多个模块
   */
  async loadAll(modulePaths) {
    const promises = modulePaths.map(path => this.load(path));
    return Promise.all(promises);
  }

  /**
   * 条件加载
   */
  async loadIf(condition, modulePath, fallback = null) {
    if (condition) {
      try {
        return await this.load(modulePath);
      } catch (error) {
        console.error(`Conditional load failed: ${modulePath}`, error);
        return fallback;
      }
    }
    return fallback;
  }

  /**
   * 按需加载CSS
   */
  loadCSS(href) {
    return new Promise((resolve, reject) => {
      // 检查是否已加载
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  /**
   * 按需加载脚本
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      // 检查是否已加载
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
}

// 创建单例实例
const lazyLoader = new LazyLoader();

// 导出工具函数
export const lazy = (loader) => lazyLoader.lazy(loader);
export const preload = (path, priority) => lazyLoader.preload(path, priority);
export const loadModule = (path) => lazyLoader.load(path);

export default lazyLoader;