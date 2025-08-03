# 📘 Admin V3 实施指南

> **版本**: 3.0.0  
> **创建日期**: 2025-08-03  
> **状态**: 🟢 Active  
> **目标**: 提供V3开发的详细实施指南

## 🎯 实施概览

本文档提供V3各项优化策略的具体实施方法，确保开发过程有据可依。

## 1️⃣ 代码分割和懒加载实施

### 📦 文件拆分实施步骤

#### Step 1: 分析现有大文件
```bash
# 找出所有超过15KB的文件
find /public/admin-v2 -name "*.js" -size +15k -exec ls -lh {} \;

# 已识别的大文件：
# provider-config.js (37KB)
# unified-config.js (42KB)
# dashboard.js (28KB)
```

#### Step 2: 创建模块化结构
```javascript
// 原始文件结构 (V2)
/public/admin-v2/js/pages/ai-service/provider-config.js (37KB)

// 拆分后结构 (V3)
/public/admin-v3/_pages/ai-service/
├── index.js (2KB) // 入口点
├── provider-config.lazy.js (1KB) // 懒加载包装器
└── modules/
    ├── provider-list.js (10KB)
    ├── provider-form.js (8KB)
    ├── provider-api.js (6KB)
    ├── provider-test.js (5KB)
    ├── provider-table.js (4KB)
    └── provider-utils.js (3KB)
```

#### Step 3: 实现懒加载包装器
```javascript
// provider-config.lazy.js
export class LazyProviderConfig {
  constructor() {
    this.modules = new Map();
    this.loading = new Map();
  }

  async loadModule(name) {
    // 检查缓存
    if (this.modules.has(name)) {
      return this.modules.get(name);
    }

    // 防止重复加载
    if (this.loading.has(name)) {
      return this.loading.get(name);
    }

    // 动态导入映射
    const moduleMap = {
      'list': () => import('./modules/provider-list.js'),
      'form': () => import('./modules/provider-form.js'),
      'api': () => import('./modules/provider-api.js'),
      'test': () => import('./modules/provider-test.js'),
      'table': () => import('./modules/provider-table.js'),
      'utils': () => import('./modules/provider-utils.js')
    };

    const loadPromise = moduleMap[name]()
      .then(module => {
        this.modules.set(name, module);
        this.loading.delete(name);
        return module;
      })
      .catch(error => {
        this.loading.delete(name);
        throw error;
      });

    this.loading.set(name, loadPromise);
    return loadPromise;
  }

  // 预加载关键模块
  async preload() {
    const critical = ['list', 'api'];
    await Promise.all(critical.map(name => this.loadModule(name)));
  }

  // 按需加载
  async loadOnDemand(moduleName) {
    console.log(`⏳ Loading module: ${moduleName}`);
    const start = performance.now();
    
    try {
      const module = await this.loadModule(moduleName);
      const loadTime = performance.now() - start;
      console.log(`✅ Module loaded: ${moduleName} (${loadTime.toFixed(2)}ms)`);
      return module;
    } catch (error) {
      console.error(`❌ Failed to load module: ${moduleName}`, error);
      throw error;
    }
  }
}
```

#### Step 4: 路由级代码分割
```javascript
// _core/router.js
export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.cache = new Map();
  }

  // 注册路由与懒加载组件
  register(path, loader) {
    this.routes.set(path, {
      loader,
      component: null,
      loading: false
    });
  }

  // 导航实现
  async navigate(path) {
    const route = this.routes.get(path);
    if (!route) {
      console.error(`Route not found: ${path}`);
      return;
    }

    // 显示加载状态
    this.showLoading();

    try {
      // 懒加载组件
      if (!route.component && !route.loading) {
        route.loading = true;
        const module = await route.loader();
        route.component = module.default || module;
        route.loading = false;
      }

      // 渲染组件
      await this.renderComponent(route.component);
      this.currentRoute = path;
      
      // 预加载相邻路由
      this.preloadAdjacentRoutes(path);
      
    } catch (error) {
      console.error(`Failed to load route: ${path}`, error);
      this.showError(error);
    }
  }

  // 预加载策略
  preloadAdjacentRoutes(currentPath) {
    const adjacentPaths = this.getAdjacentPaths(currentPath);
    
    adjacentPaths.forEach(path => {
      const route = this.routes.get(path);
      if (route && !route.component && !route.loading) {
        // 使用 requestIdleCallback 在空闲时预加载
        requestIdleCallback(() => {
          route.loader().then(module => {
            route.component = module.default || module;
          }).catch(() => {
            // 静默失败，用户访问时会重试
          });
        });
      }
    });
  }
}
```

### 🎭 实际案例：Dashboard页面拆分

#### 原始代码（V2 - 28KB单文件）
```javascript
// dashboard.js (28KB) - 太大！
class Dashboard {
  constructor() {
    this.charts = new ChartsManager();
    this.stats = new StatsManager();
    this.activities = new ActivitiesManager();
    this.realtime = new RealtimeUpdater();
    // ... 2000+ 行代码
  }
}
```

#### 优化后（V3 - 模块化）
```javascript
// index.js (3KB) - 仅包含核心逻辑
export class Dashboard {
  constructor() {
    this.modules = new Map();
    this.initialized = false;
  }

  async init() {
    // 仅加载首屏需要的模块
    const stats = await import('./modules/stats.js');
    this.modules.set('stats', stats.default);
    
    // 首屏渲染
    await this.renderInitialView();
    
    // 异步加载其他模块
    this.loadDeferredModules();
  }

  async loadDeferredModules() {
    // 使用 requestIdleCallback 延迟加载
    requestIdleCallback(async () => {
      const [charts, activities] = await Promise.all([
        import('./modules/charts.js'),
        import('./modules/activities.js')
      ]);
      
      this.modules.set('charts', charts.default);
      this.modules.set('activities', activities.default);
      
      // 渲染延迟加载的内容
      this.renderDeferredContent();
    });
  }
}
```

## 2️⃣ API优化实施

### 🚀 超时优化实施

#### 实现快速失败机制
```javascript
// _core/api-client.js
export class ApiClient {
  constructor(config) {
    this.config = {
      timeout: 3000, // 3秒超时
      retryAttempts: 2,
      retryDelay: 1000,
      ...config
    };
    
    this.pendingRequests = new Map();
    this.cache = new Map();
  }

  async request(url, options = {}) {
    const requestKey = `${options.method || 'GET'}:${url}`;
    
    // 请求去重
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    // 创建带超时的请求
    const requestPromise = this.makeRequestWithTimeout(url, options)
      .finally(() => {
        this.pendingRequests.delete(requestKey);
      });

    this.pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }

  async makeRequestWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        // 超时错误
        console.warn(`Request timeout: ${url}`);
        return this.handleTimeout(url, options);
      }
      
      throw error;
    }
  }

  async handleTimeout(url, options) {
    // 尝试从缓存获取
    const cached = this.getFromCache(url);
    if (cached) {
      console.log('📦 Using cached data after timeout');
      return cached;
    }

    // 重试逻辑
    if (options.retryCount < this.config.retryAttempts) {
      console.log(`🔄 Retrying request (${options.retryCount + 1}/${this.config.retryAttempts})`);
      await this.delay(this.config.retryDelay);
      return this.request(url, {
        ...options,
        retryCount: (options.retryCount || 0) + 1
      });
    }

    throw new Error('Request failed after all retries');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 🔄 并行请求优化

#### 实现并行数据获取
```javascript
// _services/provider.service.js
export class ProviderService {
  constructor(apiClient) {
    this.api = apiClient;
    this.batchQueue = [];
    this.batchTimer = null;
  }

  // 批量并行请求
  async loadDashboardData() {
    console.log('📊 Loading dashboard data in parallel...');
    
    const requests = [
      this.api.get('/providers'),
      this.api.get('/providers/catalog'),
      this.api.get('/config/unified'),
      this.api.get('/analytics/summary')
    ];

    try {
      // 使用 Promise.allSettled 确保部分失败不影响其他
      const results = await Promise.allSettled(requests);
      
      const data = {
        providers: results[0].status === 'fulfilled' ? results[0].value : [],
        catalog: results[1].status === 'fulfilled' ? results[1].value : this.getCachedCatalog(),
        config: results[2].status === 'fulfilled' ? results[2].value : {},
        analytics: results[3].status === 'fulfilled' ? results[3].value : {}
      };

      // 记录失败的请求
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Request ${index} failed:`, result.reason);
        }
      });

      return data;
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // 降级到缓存数据
      return this.getCachedDashboardData();
    }
  }

  // 请求批处理
  async batchRequest(request) {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ request, resolve, reject });
      
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, 50); // 50ms批处理窗口
      }
    });
  }

  async processBatch() {
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimer = null;

    if (batch.length === 0) return;

    console.log(`⚡ Processing batch of ${batch.length} requests`);

    try {
      const responses = await Promise.all(
        batch.map(item => item.request())
      );

      batch.forEach((item, index) => {
        item.resolve(responses[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }
}
```

### 🔐 请求去重实施

```javascript
// _core/request-dedup.js
export class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
    this.cache = new Map();
    this.cacheExpiry = new Map();
  }

  async dedupe(key, requestFn, options = {}) {
    // 检查缓存
    if (options.cache) {
      const cached = this.getFromCache(key);
      if (cached !== null) {
        console.log(`✅ Cache hit: ${key}`);
        return cached;
      }
    }

    // 检查是否有相同的请求正在进行
    if (this.pending.has(key)) {
      console.log(`⏳ Reusing pending request: ${key}`);
      return this.pending.get(key);
    }

    console.log(`🔄 New request: ${key}`);
    
    // 创建新请求
    const promise = requestFn()
      .then(result => {
        // 缓存结果
        if (options.cache) {
          this.setCache(key, result, options.cacheTTL);
        }
        return result;
      })
      .finally(() => {
        // 清理pending状态
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  getFromCache(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  setCache(key, value, ttl = 60000) {
    this.cache.set(key, value);
    if (ttl > 0) {
      this.cacheExpiry.set(key, Date.now() + ttl);
    }
  }

  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

// 使用示例
const dedup = new RequestDeduplicator();

// 多个组件同时请求相同数据
async function getProviders() {
  return dedup.dedupe(
    'providers:list',
    () => fetch('/api/providers').then(r => r.json()),
    { cache: true, cacheTTL: 5 * 60 * 1000 } // 5分钟缓存
  );
}
```

## 3️⃣ 缓存策略优化实施

### 📦 分层缓存实现

```javascript
// _core/cache.js
export class LayeredCache {
  constructor() {
    // L1: 内存缓存
    this.memory = new Map();
    
    // L2: SessionStorage
    this.session = window.sessionStorage;
    
    // L3: IndexedDB
    this.initIndexedDB();
    
    // L4: Vercel KV (通过API)
    this.kvStore = new KVStore();
    
    // 缓存策略配置
    this.strategies = {
      catalog: { l1: true, l2: true, l3: true, l4: true, ttl: 24 * 60 * 60 * 1000 },
      config: { l1: true, l2: true, l3: true, l4: false, ttl: 60 * 60 * 1000 },
      providers: { l1: true, l2: false, l3: true, l4: false, ttl: 5 * 60 * 1000 },
      analytics: { l1: true, l2: false, l3: false, l4: false, ttl: 60 * 1000 }
    };
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AdminV3Cache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  async get(type, key) {
    const strategy = this.strategies[type] || {};
    const fullKey = `v3:${type}:${key}`;
    
    // L1: Memory
    if (strategy.l1) {
      const memoryValue = this.memory.get(fullKey);
      if (memoryValue && !this.isExpired(memoryValue)) {
        console.log(`💾 L1 hit: ${fullKey}`);
        return memoryValue.data;
      }
    }
    
    // L2: SessionStorage
    if (strategy.l2) {
      try {
        const sessionValue = JSON.parse(this.session.getItem(fullKey));
        if (sessionValue && !this.isExpired(sessionValue)) {
          console.log(`🗂️ L2 hit: ${fullKey}`);
          // 提升到L1
          if (strategy.l1) {
            this.memory.set(fullKey, sessionValue);
          }
          return sessionValue.data;
        }
      } catch (e) {}
    }
    
    // L3: IndexedDB
    if (strategy.l3 && this.db) {
      const idbValue = await this.getFromIndexedDB(fullKey);
      if (idbValue && !this.isExpired(idbValue)) {
        console.log(`💿 L3 hit: ${fullKey}`);
        // 提升到L1和L2
        if (strategy.l1) this.memory.set(fullKey, idbValue);
        if (strategy.l2) this.session.setItem(fullKey, JSON.stringify(idbValue));
        return idbValue.data;
      }
    }
    
    // L4: Vercel KV
    if (strategy.l4) {
      const kvValue = await this.kvStore.get(fullKey);
      if (kvValue) {
        console.log(`☁️ L4 hit: ${fullKey}`);
        // 提升到所有层
        await this.set(type, key, kvValue);
        return kvValue;
      }
    }
    
    return null;
  }

  async set(type, key, data) {
    const strategy = this.strategies[type] || {};
    const fullKey = `v3:${type}:${key}`;
    const wrapper = {
      data,
      timestamp: Date.now(),
      ttl: strategy.ttl || 60000
    };
    
    // 写入所有配置的层
    if (strategy.l1) {
      this.memory.set(fullKey, wrapper);
    }
    
    if (strategy.l2) {
      try {
        this.session.setItem(fullKey, JSON.stringify(wrapper));
      } catch (e) {
        console.warn('SessionStorage full, clearing old entries');
        this.clearOldEntries('session');
      }
    }
    
    if (strategy.l3 && this.db) {
      await this.setToIndexedDB(fullKey, wrapper);
    }
    
    if (strategy.l4) {
      await this.kvStore.set(fullKey, data, strategy.ttl);
    }
  }

  isExpired(wrapper) {
    if (!wrapper.timestamp || !wrapper.ttl) return false;
    return Date.now() > wrapper.timestamp + wrapper.ttl;
  }

  async getFromIndexedDB(key) {
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const request = transaction.objectStore('cache').get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => resolve(null);
    });
  }

  async setToIndexedDB(key, value) {
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const request = transaction.objectStore('cache').put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }
}

// KV Store for Vercel
class KVStore {
  async get(key) {
    try {
      const response = await fetch(`/api/kv/${encodeURIComponent(key)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {}
    return null;
  }

  async set(key, value, ttl) {
    try {
      await fetch(`/api/kv/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, ttl })
      });
    } catch (e) {}
  }
}
```

### 🔄 智能缓存预热

```javascript
// _core/cache-warmer.js
export class CacheWarmer {
  constructor(cache, api) {
    this.cache = cache;
    this.api = api;
    this.warmupQueue = [];
    this.isWarming = false;
  }

  // 应用启动时预热
  async warmupOnBoot() {
    console.log('🔥 Starting cache warmup...');
    
    const criticalData = [
      { type: 'catalog', key: 'all', fetcher: () => this.api.getCatalog() },
      { type: 'config', key: 'unified', fetcher: () => this.api.getUnifiedConfig() }
    ];

    // 并行预热关键数据
    await Promise.all(
      criticalData.map(async ({ type, key, fetcher }) => {
        try {
          const cached = await this.cache.get(type, key);
          if (!cached) {
            console.log(`📥 Warming up: ${type}:${key}`);
            const data = await fetcher();
            await this.cache.set(type, key, data);
          }
        } catch (error) {
          console.warn(`Failed to warmup ${type}:${key}:`, error);
        }
      })
    );

    console.log('✅ Cache warmup completed');
  }

  // 基于用户行为的智能预热
  async predictiveWarmup(currentPage) {
    // 预测用户可能访问的页面
    const predictions = this.predictNextPages(currentPage);
    
    predictions.forEach(page => {
      this.queueWarmup(page);
    });

    this.processWarmupQueue();
  }

  predictNextPages(currentPage) {
    const navigationPatterns = {
      'dashboard': ['ai-service', 'analytics'],
      'ai-service': ['provider-config', 'unified-config'],
      'user': ['user-detail', 'billing'],
      'billing': ['recharge', 'transactions']
    };

    return navigationPatterns[currentPage] || [];
  }

  queueWarmup(page) {
    if (!this.warmupQueue.includes(page)) {
      this.warmupQueue.push(page);
    }
  }

  async processWarmupQueue() {
    if (this.isWarming || this.warmupQueue.length === 0) return;

    this.isWarming = true;

    // 使用 requestIdleCallback 在空闲时预热
    requestIdleCallback(async () => {
      while (this.warmupQueue.length > 0) {
        const page = this.warmupQueue.shift();
        await this.warmupPageData(page);
      }
      this.isWarming = false;
    });
  }

  async warmupPageData(page) {
    const dataMap = {
      'provider-config': () => this.api.getProviders(),
      'unified-config': () => this.api.getUnifiedConfig(),
      'analytics': () => this.api.getAnalytics(),
      // ... 更多页面数据映射
    };

    const fetcher = dataMap[page];
    if (fetcher) {
      try {
        const data = await fetcher();
        await this.cache.set('page', page, data);
        console.log(`✅ Pre-warmed: ${page}`);
      } catch (error) {
        console.warn(`Failed to pre-warm ${page}:`, error);
      }
    }
  }
}
```

## 4️⃣ Bundle优化实施

### 📊 Bundle分析与优化

#### Step 1: 设置Bundle分析
```javascript
// build/analyze.js
import { analyzeMetafile } from 'esbuild';
import fs from 'fs';

async function analyzeBundles() {
  const metafile = JSON.parse(fs.readFileSync('dist/meta.json', 'utf8'));
  const analysis = await analyzeMetafile(metafile, {
    verbose: true
  });

  console.log(analysis);

  // 生成可视化报告
  const report = generateVisualReport(metafile);
  fs.writeFileSync('dist/bundle-report.html', report);
}

function generateVisualReport(metafile) {
  const bundles = [];
  
  for (const [path, output] of Object.entries(metafile.outputs)) {
    bundles.push({
      path,
      size: output.bytes,
      modules: Object.entries(output.inputs).map(([name, info]) => ({
        name,
        size: info.bytesInOutput
      }))
    });
  }

  // 生成HTML报告
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bundle Analysis Report</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <h1>V3 Bundle Analysis</h1>
      <canvas id="bundleChart"></canvas>
      <script>
        const data = ${JSON.stringify(bundles)};
        // 渲染图表...
      </script>
    </body>
    </html>
  `;
}
```

#### Step 2: 实现Tree Shaking
```javascript
// build/config.js
export const buildConfig = {
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  treeShaking: true,
  metafile: true,
  
  // 标记纯函数以优化tree shaking
  pure: ['console.log', 'console.debug'],
  
  // 外部化大型库
  external: ['chart.js', 'monaco-editor'],
  
  // 代码分割配置
  splitting: true,
  format: 'esm',
  
  // 输出配置
  outdir: 'dist',
  chunkNames: 'chunks/[name]-[hash]',
  
  // 优化配置
  target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
  
  // 插件
  plugins: [
    // 删除未使用的代码
    removeUnusedCode(),
    // 提取公共代码
    extractCommon(),
    // 压缩插件
    compress()
  ]
};

// 删除未使用代码插件
function removeUnusedCode() {
  return {
    name: 'remove-unused',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        let contents = await fs.promises.readFile(args.path, 'utf8');
        
        // 删除开发环境代码
        contents = contents.replace(/if\s*\(process\.env\.NODE_ENV\s*===\s*['"]development['"]\)[^}]*}/g, '');
        
        // 删除console.log（生产环境）
        if (process.env.NODE_ENV === 'production') {
          contents = contents.replace(/console\.(log|debug|info)\([^)]*\);?/g, '');
        }
        
        return { contents };
      });
    }
  };
}
```

#### Step 3: 动态导入优化
```javascript
// _core/dynamic-import.js
export class DynamicImporter {
  constructor() {
    this.preloadLinks = new Set();
    this.moduleCache = new Map();
  }

  // 智能预加载
  preload(modulePath) {
    if (this.preloadLinks.has(modulePath)) return;

    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = modulePath;
    document.head.appendChild(link);
    this.preloadLinks.add(modulePath);
  }

  // 条件导入
  async conditionalImport(condition, modulePath, fallback = null) {
    if (condition) {
      try {
        return await this.import(modulePath);
      } catch (error) {
        console.error(`Failed to import ${modulePath}:`, error);
        return fallback;
      }
    }
    return fallback;
  }

  // 带缓存的导入
  async import(modulePath) {
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }

    const module = await import(modulePath);
    this.moduleCache.set(modulePath, module);
    return module;
  }

  // 并行导入多个模块
  async importAll(modulePaths) {
    return Promise.all(modulePaths.map(path => this.import(path)));
  }

  // 基于网络状态的智能加载
  async smartImport(criticalModule, deferredModules) {
    // 立即加载关键模块
    const critical = await this.import(criticalModule);

    // 根据网络状态决定何时加载延迟模块
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      if (connection.effectiveType === '4g' && !connection.saveData) {
        // 好的网络条件，立即加载
        this.importAll(deferredModules);
      } else {
        // 差的网络条件，延迟加载
        requestIdleCallback(() => {
          this.importAll(deferredModules);
        });
      }
    }

    return critical;
  }
}
```

### 🎯 性能监控实施

```javascript
// _utils/performance.js
export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.init();
  }

  init() {
    // 监听性能指标
    this.observeWebVitals();
    this.measureCustomMetrics();
  }

  observeWebVitals() {
    // FCP (First Contentful Paint)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
          console.log(`📊 FCP: ${entry.startTime.toFixed(2)}ms`);
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // LCP (Largest Contentful Paint)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      console.log(`📊 LCP: ${this.metrics.lcp.toFixed(2)}ms`);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID (First Input Delay)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.fid = entry.processingStart - entry.startTime;
        console.log(`📊 FID: ${this.metrics.fid.toFixed(2)}ms`);
      }
    }).observe({ entryTypes: ['first-input'] });

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.metrics.cls = clsValue;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  measureCustomMetrics() {
    // 测量启动时间
    this.mark('app_start');
    
    // 测量模块加载时间
    window.addEventListener('load', () => {
      this.mark('app_loaded');
      this.measure('startup_time', 'app_start', 'app_loaded');
    });
  }

  mark(name) {
    performance.mark(name);
  }

  measure(name, startMark, endMark) {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    this.metrics[name] = measure.duration;
    console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
  }

  // 获取Bundle大小
  async getBundleSize() {
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    
    const bundleSize = jsResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);

    this.metrics.bundleSize = bundleSize;
    console.log(`📦 Total JS Bundle: ${(bundleSize / 1024).toFixed(2)}KB`);
    
    return bundleSize;
  }

  // 生成性能报告
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      targets: {
        fcp: { value: this.metrics.fcp, target: 1000, status: this.metrics.fcp < 1000 ? '✅' : '❌' },
        lcp: { value: this.metrics.lcp, target: 2000, status: this.metrics.lcp < 2000 ? '✅' : '❌' },
        fid: { value: this.metrics.fid, target: 50, status: this.metrics.fid < 50 ? '✅' : '❌' },
        cls: { value: this.metrics.cls, target: 0.05, status: this.metrics.cls < 0.05 ? '✅' : '❌' },
        bundleSize: { 
          value: this.metrics.bundleSize, 
          target: 200 * 1024, 
          status: this.metrics.bundleSize < 200 * 1024 ? '✅' : '❌' 
        }
      }
    };
  }

  // 发送到分析服务
  async sendToAnalytics() {
    const report = this.generateReport();
    
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }
}

// 自动初始化
export const performanceMonitor = new PerformanceMonitor();
```

## 📋 实施检查清单

### Phase 1: 代码分割 ✅
- [ ] 识别所有>15KB的文件
- [ ] 创建模块化目录结构
- [ ] 实现懒加载包装器
- [ ] 配置路由级分割
- [ ] 测试加载性能

### Phase 2: API优化 ✅
- [ ] 实现3秒超时机制
- [ ] 配置请求重试逻辑
- [ ] 实现并行请求
- [ ] 添加请求去重
- [ ] 测试API性能

### Phase 3: 缓存策略 ✅
- [ ] 实现4层缓存架构
- [ ] 配置缓存TTL
- [ ] 实现缓存预热
- [ ] 添加智能预测
- [ ] 测试缓存命中率

### Phase 4: Bundle优化 ✅
- [ ] 配置Tree Shaking
- [ ] 实现代码分割
- [ ] 优化动态导入
- [ ] 监控性能指标
- [ ] 达到目标指标

## 🎯 成功标准

### 性能指标达成
- FCP < 1.0s ✅
- LCP < 2.0s ✅
- FID < 50ms ✅
- CLS < 0.05 ✅
- Bundle < 200KB ✅

### 用户体验提升
- 首屏加载时间减少60%
- API响应时间减少50%
- 缓存命中率>80%
- 离线可用性100%

---

**文档状态**: 🟢 生效中  
**最后更新**: 2025-08-03  
**下次审查**: 2025-08-10