/**
 * Router Module
 * V3路由系统 - 懒加载、预加载、路由守卫
 */

export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.componentCache = new Map();
    this.preloadQueue = [];
    this.contentElement = null;
    this.initialized = false;
    this.navigating = false; // 导航锁
    this.navigationQueue = []; // 导航队列
  }

  /**
   * 初始化路由系统
   */
  init(routes = [], options = {}) {
    // 防止重复初始化
    if (this.initialized) {
      console.warn('Router already initialized');
      return;
    }
    
    console.log('🔧 Starting router initialization...');
    
    // 注册路由 - 必须在任何导航之前
    if (routes.length > 0) {
      routes.forEach(route => this.register(route));
      console.log(`📝 Registered ${routes.length} routes:`, Array.from(this.routes.keys()));
    } else {
      console.warn('⚠️ No routes provided to router.init()');
    }
    
    // 设置内容容器
    this.contentElement = options.contentElement || document.getElementById('app-content');
    if (!this.contentElement) {
      console.warn('⚠️ Content element not found during init');
    }
    
    // 注册全局守卫
    if (options.beforeEach) {
      this.beforeEach(options.beforeEach);
    }
    
    if (options.afterEach) {
      this.afterEach(options.afterEach);
    }
    
    // 监听浏览器前进后退
    window.addEventListener('popstate', (e) => {
      if (this.initialized) {
        this.handlePopState(e);
      }
    });
    
    // 监听hash变化
    window.addEventListener('hashchange', () => {
      if (this.initialized) {
        this.handleHashChange();
      }
    });
    
    // 拦截所有链接点击
    document.addEventListener('click', (e) => {
      if (this.initialized) {
        this.handleLinkClick(e);
      }
    });
    
    // 标记为已初始化
    this.initialized = true;
    console.log('✅ Router initialized with routes:', Array.from(this.routes.keys()));
    
    // 完全移除自动加载 - 让调用者手动控制
    // 注意：app.js的renderInitialView会手动调用navigate
    if (options.autoLoad === true) {
      console.log('🚀 Auto-loading initial route...');
      // 延迟执行以确保所有初始化完成
      setTimeout(() => this.loadInitialRoute(), 0);
    } else {
      console.log('⏸️ Auto-load disabled, waiting for manual navigation');
    }
  }

  /**
   * 注册路由
   */
  register(route) {
    if (!route.path || !route.component) {
      console.error('Invalid route:', route);
      return;
    }
    
    this.routes.set(route.path, {
      ...route,
      loaded: false,
      loading: false,
      component: null,
      loader: route.component
    });
  }

  /**
   * 导航到指定路由
   */
  async navigate(path, options = {}) {
    // 如果路由未初始化，等待初始化
    if (!this.initialized) {
      console.warn('Router not initialized yet, skipping navigation to:', path);
      return false;
    }
    
    // 如果正在导航中，将请求加入队列
    if (this.navigating) {
      // 如果正在导航到相同路径，忽略
      if (this.navigatingTo === path) {
        console.log(`Already navigating to: ${path}, ignoring duplicate`);
        return false;
      }
      // 检查队列中是否已有相同路径
      if (this.navigationQueue.some(item => item.path === path)) {
        console.log(`Already queued navigation to: ${path}`);
        return false;
      }
      console.warn(`⏳ Navigation in progress to ${this.navigatingTo}, queueing navigation to: ${path}`);
      this.navigationQueue.push({ path, options });
      return false;
    }
    
    // 避免重复导航到同一路由
    if (path === this.currentRoute && !options.force) {
      console.log(`Already at route: ${path}`);
      return true;
    }
    
    // 设置导航锁和目标路径
    this.navigating = true;
    this.navigatingTo = path;
    
    console.log(`🔄 Navigating to: ${path}`);
    console.log('Available routes:', Array.from(this.routes.keys()));
    
    // 执行前置守卫
    const canNavigate = await this.runBeforeEachHooks(path, this.currentRoute);
    if (!canNavigate) {
      console.log('❌ Navigation cancelled by guard');
      return false;
    }
    
    // 查找路由
    const route = this.findRoute(path);
    if (!route) {
      console.error(`Route not found: ${path}`);
      console.error('Registered routes:', Array.from(this.routes.keys()));
      await this.handle404(path);
      return false;
    }
    
    // 显示加载状态
    this.showLoading();
    
    try {
      // 加载组件
      const component = await this.loadRouteComponent(route);
      
      // 渲染组件并获取实例
      const componentInstance = await this.renderComponent(component, route);
      
      // 更新URL（如果不是replace模式）
      if (!options.replace) {
        this.updateURL(path);
      }
      
      // 更新当前路由
      const previousRoute = this.currentRoute;
      this.currentRoute = path;
      
      // 执行后置守卫
      await this.runAfterEachHooks(path, previousRoute);
      
      // 预加载相邻路由
      this.preloadAdjacentRoutes(path);
      
      // 更新导航激活状态
      this.updateActiveNavItem(path);
      
      // 如果组件实例有mounted生命周期，调用它
      if (componentInstance && typeof componentInstance.mounted === 'function') {
        console.log('🎯 Calling component mounted lifecycle');
        // 使用requestAnimationFrame确保DOM完全渲染
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve); // 双重RAF确保渲染完成
          });
        });
        await componentInstance.mounted();
      }
      
      return true;
      
    } catch (error) {
      console.error(`Failed to navigate to ${path}:`, error);
      this.showError(error);
      return false;
    } finally {
      // 释放导航锁
      this.navigating = false;
      this.navigatingTo = null;
      
      // 处理队列中的下一个导航
      if (this.navigationQueue.length > 0) {
        const next = this.navigationQueue.shift();
        // 避免导航到当前路由
        if (next.path !== this.currentRoute) {
          console.log(`📋 Processing queued navigation to: ${next.path}`);
          setTimeout(() => this.navigate(next.path, next.options), 0);
        } else {
          console.log(`📋 Skipping queued navigation to current route: ${next.path}`);
        }
      }
    }
  }

  /**
   * 查找路由
   */
  findRoute(path) {
    // 精确匹配
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }
    
    // 模糊匹配（支持动态路由）
    for (const [routePath, route] of this.routes) {
      if (this.matchRoute(path, routePath)) {
        return route;
      }
    }
    
    return null;
  }

  /**
   * 路由匹配
   */
  matchRoute(path, pattern) {
    // 简单的动态路由匹配
    // /user/:id => /user/123
    const pathParts = path.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);
    
    if (pathParts.length !== patternParts.length) {
      return false;
    }
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        continue; // 动态参数，跳过
      }
      if (pathParts[i] !== patternParts[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 加载路由组件
   */
  async loadRouteComponent(route) {
    // 检查缓存
    if (route.component) {
      return route.component;
    }
    
    // 检查组件缓存
    const cacheKey = route.path;
    if (this.componentCache.has(cacheKey)) {
      return this.componentCache.get(cacheKey);
    }
    
    // 防止重复加载
    if (route.loading) {
      // 等待加载完成
      while (route.loading) {
        await this.delay(100);
      }
      return route.component;
    }
    
    // 开始加载
    route.loading = true;
    
    try {
      console.log(`📦 Loading component for: ${route.path}`);
      const startTime = performance.now();
      
      // 执行loader函数
      const module = await route.loader();
      const component = module.default || module;
      
      const loadTime = performance.now() - startTime;
      console.log(`✅ Component loaded in ${loadTime.toFixed(2)}ms`);
      
      // 缓存组件
      route.component = component;
      this.componentCache.set(cacheKey, component);
      
      return component;
      
    } finally {
      route.loading = false;
    }
  }

  /**
   * 渲染组件
   */
  async renderComponent(component, route) {
    if (!this.contentElement) {
      console.error('Content element not found');
      return null;
    }
    
    console.log('🎨 Rendering component, type:', typeof component);
    
    // 清空内容
    this.contentElement.innerHTML = '';
    
    let componentInstance = null;
    
    // 根据组件类型渲染
    if (typeof component === 'function' && component.prototype && component.prototype.render) {
      // 类组件（构造函数） - 必须先检查这个，因为类也是函数
      console.log('📝 Rendering class component');
      // 传递app实例作为第一个参数（如果有的话）
      const app = window.adminV3App || null;
      const instance = new component(app);
      const result = await instance.render();
      componentInstance = instance; // 保存实例引用
      
      if (typeof result === 'string') {
        this.contentElement.innerHTML = result;
        console.log('✅ Rendered HTML string from class');
      } else if (result instanceof HTMLElement) {
        this.contentElement.appendChild(result);
        console.log('✅ Rendered HTMLElement from class');
      }
    } else if (typeof component === 'function') {
      // 普通函数组件 - 在类检查之后
      console.log('📝 Rendering function component');
      const result = await component(route);
      
      // 如果返回的是带有mounted方法的对象，保存实例
      if (result && typeof result === 'object' && result.mounted) {
        componentInstance = result;
        // 渲染HTML
        if (result.html) {
          this.contentElement.innerHTML = result.html;
        }
      } else if (typeof result === 'string') {
        this.contentElement.innerHTML = result;
        console.log('✅ Rendered HTML string from function');
      } else if (result instanceof HTMLElement) {
        this.contentElement.appendChild(result);
        console.log('✅ Rendered HTMLElement from function');
      }
    } else if (typeof component === 'object' && component.render) {
      // 已经实例化的对象
      console.log('📝 Rendering object with render method');
      const result = await component.render();
      componentInstance = component; // 保存实例引用
      
      if (typeof result === 'string') {
        this.contentElement.innerHTML = result;
        console.log('✅ Rendered HTML string from object');
      } else if (result instanceof HTMLElement) {
        this.contentElement.appendChild(result);
        console.log('✅ Rendered HTMLElement from object');
      }
    } else if (typeof component === 'string') {
      // HTML字符串
      console.log('📝 Rendering HTML string directly');
      this.contentElement.innerHTML = component;
      console.log('✅ Rendered direct HTML string');
    } else {
      console.error('❌ Unknown component type:', typeof component, component);
    }
    
    return componentInstance; // 返回组件实例，以便调用生命周期方法
  }

  /**
   * 预加载相邻路由
   */
  preloadAdjacentRoutes(currentPath) {
    // 定义预加载策略
    const preloadPaths = this.getPreloadPaths(currentPath);
    
    preloadPaths.forEach(path => {
      const route = this.findRoute(path);
      if (route && !route.component && !route.loading) {
        // 使用requestIdleCallback延迟加载
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            this.loadRouteComponent(route).catch(() => {
              // 静默失败
            });
          });
        } else {
          // 降级方案
          setTimeout(() => {
            this.loadRouteComponent(route).catch(() => {});
          }, 1000);
        }
      }
    });
  }

  /**
   * 获取需要预加载的路径
   */
  getPreloadPaths(currentPath) {
    const adjacentMap = {
      '/dashboard': ['/ai-service', '/user'],
      '/ai-service': ['/dashboard', '/billing'],
      '/user': ['/dashboard', '/billing'],
      '/billing': ['/user', '/ai-service']
    };
    
    return adjacentMap[currentPath] || [];
  }

  /**
   * 前置守卫
   */
  beforeEach(hook) {
    this.beforeEachHooks.push(hook);
  }

  /**
   * 后置守卫
   */
  afterEach(hook) {
    this.afterEachHooks.push(hook);
  }

  /**
   * 执行前置守卫
   */
  async runBeforeEachHooks(to, from) {
    for (const hook of this.beforeEachHooks) {
      const result = await hook(to, from);
      if (result === false) {
        return false;
      }
    }
    return true;
  }

  /**
   * 执行后置守卫
   */
  async runAfterEachHooks(to, from) {
    for (const hook of this.afterEachHooks) {
      await hook(to, from);
    }
  }

  /**
   * 处理链接点击
   */
  handleLinkClick(e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    
    e.preventDefault();
    const path = link.getAttribute('href').slice(1) || '/';
    this.navigate(path);
  }

  /**
   * 处理浏览器前进后退
   */
  handlePopState(e) {
    const path = this.getCurrentPath();
    this.navigate(path, { replace: true });
  }

  /**
   * 处理Hash变化
   */
  handleHashChange() {
    const path = this.getCurrentPath();
    if (path !== this.currentRoute) {
      this.navigate(path, { replace: true });
    }
  }

  /**
   * 加载初始路由
   */
  loadInitialRoute() {
    const path = this.getCurrentPath() || '/dashboard';
    console.log(`🏁 Loading initial route: ${path}`);
    this.navigate(path);
  }

  /**
   * 获取当前路径
   */
  getCurrentPath() {
    const hash = window.location.hash.slice(1);
    return hash || null;  // 返回null而不是默认值，让调用者决定默认值
  }

  /**
   * 更新URL
   */
  updateURL(path) {
    window.location.hash = path;
  }

  /**
   * 更新导航激活状态
   */
  updateActiveNavItem(path) {
    // 移除所有激活状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // 添加当前激活状态
    const activeLink = document.querySelector(`.nav-item[href="#${path}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  /**
   * 显示加载状态
   */
  showLoading() {
    if (this.contentElement) {
      this.contentElement.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      `;
    }
  }

  /**
   * 显示错误
   */
  showError(error) {
    if (this.contentElement) {
      this.contentElement.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h2>加载失败</h2>
          <p style="color: #ef4444;">${error.message || '未知错误'}</p>
          <button onclick="location.reload()" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">
            重试
          </button>
        </div>
      `;
    }
  }

  /**
   * 处理404
   */
  async handle404(path) {
    if (this.contentElement) {
      this.contentElement.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h1>404</h1>
          <p>页面不存在: ${path}</p>
          <a href="#/dashboard" style="
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
          ">
            返回首页
          </a>
        </div>
      `;
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取路由参数
   */
  getParams(path) {
    const params = {};
    const query = path.split('?')[1];
    if (query) {
      query.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value);
      });
    }
    return params;
  }

  /**
   * 重置路由器
   */
  reset() {
    this.routes.clear();
    this.componentCache.clear();
    this.currentRoute = null;
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
  }
}

// 延迟创建单例实例
let routerInstance = null;

// 获取或创建路由器实例
function getRouterInstance() {
  if (!routerInstance) {
    console.log('📦 Creating router instance on first use');
    routerInstance = new Router();
    
    // 在开发环境添加调试信息
    if (typeof window !== 'undefined') {
      window.__V3_ROUTER__ = routerInstance;
    }
  }
  return routerInstance;
}

// 导出一个代理对象，延迟创建实际的路由器
const router = new Proxy({}, {
  get(target, prop) {
    const instance = getRouterInstance();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
  set(target, prop, value) {
    const instance = getRouterInstance();
    instance[prop] = value;
    return true;
  }
});

export default router;
export { getRouterInstance };