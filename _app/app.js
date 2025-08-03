/**
 * Admin V3 Main Application
 * 核心应用类
 */

export class App {
  constructor(config) {
    this.config = config;
    this.modules = new Map();
    this.state = {
      user: null,
      isAuthenticated: false,
      currentRoute: null
    };
    
    // 绑定到全局
    window.adminV3App = this;
  }

  /**
   * 初始化应用
   */
  async init() {
    console.log('🚀 V3 App initializing...');
    
    try {
      // Step 1: 加载核心模块
      await this.loadCoreModules();
      
      // Step 2: 检查认证状态
      await this.checkAuthentication();
      
      // Step 3: 初始化路由
      await this.initRouter();
      
      // Step 4: 渲染初始界面
      await this.renderInitialView();
      
      console.log('✅ V3 App initialized successfully');
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      throw error;
    }
  }

  /**
   * 加载核心模块
   */
  async loadCoreModules() {
    const coreModules = [
      { name: 'api', path: '../_core/api-client.js' },
      { name: 'auth', path: '../_core/auth.js' },
      { name: 'router', path: '../_core/router.js' },
      { name: 'cache', path: '../_core/cache.js' },
      { name: 'state', path: '../_core/state.js' }
    ];
    
    for (const module of coreModules) {
      try {
        const imported = await import(module.path);
        this.modules.set(module.name, imported.default || imported);
        console.log(`✅ Loaded module: ${module.name}`);
      } catch (error) {
        console.error(`❌ Failed to load module ${module.name}:`, error);
        // 创建一个占位模块
        this.modules.set(module.name, this.createPlaceholderModule(module.name));
      }
    }
  }

  /**
   * 创建占位模块
   */
  createPlaceholderModule(name) {
    console.warn(`⚠️ Creating placeholder for missing module: ${name}`);
    
    const placeholders = {
      api: {
        get: () => Promise.resolve({ success: false, message: 'API module not loaded' }),
        post: () => Promise.resolve({ success: false, message: 'API module not loaded' })
      },
      auth: {
        check: () => Promise.resolve(false),
        login: () => Promise.resolve(false),
        logout: () => Promise.resolve(true)
      },
      router: {
        init: () => {},
        navigate: () => {},
        getCurrentRoute: () => '/'
      },
      cache: {
        get: () => null,
        set: () => {},
        clear: () => {}
      },
      state: {
        get: () => ({}),
        set: () => {},
        subscribe: () => () => {}
      }
    };
    
    return placeholders[name] || {};
  }

  /**
   * 检查认证状态
   */
  async checkAuthentication() {
    const auth = this.modules.get('auth');
    if (!auth) {
      console.warn('⚠️ Auth module not available');
      return;
    }
    
    try {
      this.state.isAuthenticated = await auth.check();
      if (this.state.isAuthenticated) {
        this.state.user = await auth.getUser();
        console.log('✅ User authenticated:', this.state.user);
      } else {
        console.log('ℹ️ User not authenticated');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      this.state.isAuthenticated = false;
    }
  }

  /**
   * 初始化路由
   */
  async initRouter() {
    const router = this.modules.get('router');
    if (!router) {
      console.warn('⚠️ Router module not available');
      return;
    }
    
    // 配置路由
    const routes = [
      { path: '/', component: () => this.loadPage('dashboard') },
      { path: '/dashboard', component: () => this.loadPage('dashboard') },
      { path: '/ai-service', component: () => this.loadPage('ai-service') },
      { path: '/user', component: () => this.loadPage('user') },
      { path: '/billing', component: () => this.loadPage('billing') }
    ];
    
    // 初始化路由器（不会触发自动导航）
    router.init(routes, {
      beforeEach: (to, from) => {
        console.log(`🔄 Navigating: ${from} → ${to}`);
        // 可以在这里添加路由守卫
        return true;
      },
      autoLoad: false  // 禁用自动加载初始路由
    });
  }

  /**
   * 加载页面组件
   */
  async loadPage(pageName) {
    console.log(`📄 Loading page: ${pageName}`);
    
    try {
      // 动态导入页面模块
      const module = await import(`../_pages/${pageName}/index.js`);
      const Page = module.default || module[pageName];
      
      if (Page) {
        // 检查是函数还是类
        // 类有prototype并且prototype上有方法
        if (typeof Page === 'function') {
          // 检查是否是类（有render方法的原型）
          if (Page.prototype && (Page.prototype.render || Page.prototype.constructor)) {
            // 是一个类，返回类本身让router实例化
            return Page;
          } else {
            // 是一个普通函数，直接调用
            return await Page(this);
          }
        } else {
          // 不是函数，可能是对象或其他
          return Page;
        }
      } else {
        throw new Error(`Page component not found: ${pageName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load page ${pageName}:`, error);
      
      // 返回错误页面
      return this.renderErrorPage(pageName, error);
    }
  }

  /**
   * 渲染初始视图
   */
  async renderInitialView() {
    const app = document.getElementById('app');
    if (!app) return;
    
    // 如果未认证，显示登录提示
    if (!this.state.isAuthenticated) {
      app.innerHTML = this.renderLoginPrompt();
      return;
    }
    
    // 渲染主布局
    app.innerHTML = this.renderLayout();
    
    // 确保DOM更新完成 - 使用requestAnimationFrame确保浏览器渲染
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve); // 双重RAF确保完全渲染
      });
    });
    
    // 验证app-content元素存在
    const contentElement = document.getElementById('app-content');
    if (!contentElement) {
      console.error('❌ app-content element not found after rendering layout');
      return;
    }
    
    // 防止重复导航
    if (this.initialNavigation) {
      console.log('⚠️ Initial navigation already performed, skipping');
      return;
    }
    this.initialNavigation = true;
    
    // 手动触发初始路由加载
    const router = this.modules.get('router');
    if (router && router.initialized) {
      // 确保 router 知道 content element
      router.contentElement = contentElement;
      
      // 获取当前路径或使用默认路径
      const currentPath = router.getCurrentPath() || '/dashboard';
      
      // 检查是否已经在当前路由
      if (router.currentRoute === currentPath) {
        console.log(`📍 Already at route: ${currentPath}, skipping navigation`);
        return;
      }
      
      console.log(`📍 Loading initial route: ${currentPath}`);
      await router.navigate(currentPath);
    }
  }

  /**
   * 渲染布局
   */
  renderLayout() {
    return `
      <div class="app-layout">
        <!-- Header -->
        <header class="app-header">
          <div class="header-brand">
            <span class="brand-icon">🚀</span>
            <span class="brand-text">Admin V3</span>
            <span class="brand-badge">Vercel</span>
          </div>
          <div class="header-user">
            <span>${this.state.user?.username || 'Guest'}</span>
            <button class="btn-logout" onclick="adminV3App.logout()">
              退出
            </button>
          </div>
        </header>
        
        <!-- Sidebar -->
        <aside class="app-sidebar">
          <nav class="sidebar-nav">
            <a href="#/dashboard" class="nav-item active">
              <span class="nav-icon">📊</span>
              <span class="nav-text">仪表板</span>
            </a>
            <a href="#/ai-service" class="nav-item">
              <span class="nav-icon">🤖</span>
              <span class="nav-text">AI服务</span>
            </a>
            <a href="#/user" class="nav-item">
              <span class="nav-icon">👥</span>
              <span class="nav-text">用户管理</span>
            </a>
            <a href="#/billing" class="nav-item">
              <span class="nav-icon">💰</span>
              <span class="nav-text">计费管理</span>
            </a>
          </nav>
        </aside>
        
        <!-- Content -->
        <main class="app-content" id="app-content">
          <!-- Page content will be loaded here -->
          <div style="padding: 40px; text-align: center;">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        </main>
      </div>
    `;
  }

  /**
   * 渲染登录提示
   */
  renderLoginPrompt() {
    return `
      <div class="login-prompt-container">
        <div class="login-prompt-card">
          <div class="login-prompt-icon">🔒</div>
          <h2 class="login-prompt-title">请先登录</h2>
          <p class="login-prompt-message">
            您需要登录才能访问管理面板
          </p>
          <button onclick="window.location.href='./login.html'" class="btn btn-primary" style="width: 100%;">
            前往登录
          </button>
        </div>
      </div>
      
      <style>
        .login-prompt-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .login-prompt-card {
          background: white;
          padding: 48px;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        
        .login-prompt-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .login-prompt-title {
          margin-bottom: 12px;
          color: #1f2937;
          font-size: 24px;
          font-weight: 600;
        }
        
        .login-prompt-message {
          color: #6b7280;
          margin-bottom: 32px;
          line-height: 1.6;
        }
      </style>
    `;
  }

  /**
   * 渲染错误页面
   */
  renderErrorPage(pageName, error) {
    return `
      <div style="padding: 40px; text-align: center;">
        <h2>页面加载失败</h2>
        <p>无法加载页面: ${pageName}</p>
        <p style="color: #ef4444;">${error.message}</p>
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

  /**
   * 登出
   */
  async logout() {
    const auth = this.modules.get('auth');
    if (auth) {
      await auth.logout();
    }
    window.location.href = './login.html';
  }
  
  /**
   * 刷新仪表板
   */
  async refreshDashboard() {
    const router = this.modules.get('router');
    if (router && router.currentRoute === '/dashboard' && router.currentComponentInstance) {
      if (typeof router.currentComponentInstance.refresh === 'function') {
        await router.currentComponentInstance.refresh();
      }
    }
  }
  
  /**
   * 更新图表周期
   */
  updateChartPeriod(period) {
    console.log('Updating chart period to:', period);
    // This would be implemented based on specific chart requirements
  }
}

export default App;