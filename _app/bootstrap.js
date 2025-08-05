/**
 * Admin V3 Bootstrap Module
 * Vercel优化版本 - 轻量化启动器
 */

import { App } from './app.js';
import { config } from './config.js';
import errorBoundary from '../_utils/error-boundary.js';
import performanceMonitor from '../_utils/performance-monitor.js';
import versionManager from '../_utils/version-manager.js';

class Bootstrap {
  constructor() {
    this.app = null;
    this.startTime = performance.now();
  }

  /**
   * 初始化应用
   */
  async init() {
    try {
      console.log('⚡ V3 Bootstrap initializing...');
      
      // Step 0: 安装错误边界和性能监控
      this.setupErrorHandling();
      this.setupPerformanceMonitoring();
      
      // Step 0.5: 初始化版本管理
      await this.initVersionManager();
      
      // Step 1: 检测环境
      this.detectEnvironment();
      
      // Step 2: 预加载关键资源
      await this.preloadCriticalResources();
      
      // Step 3: 初始化应用
      this.app = new App(config);
      await this.app.init();
      
      // Step 4: 记录性能指标
      this.logPerformance();
      
      // Step 5: 切换到主应用界面
      this.switchToMainApp();
      
      console.log('✅ V3 Bootstrap completed');
      
    } catch (error) {
      console.error('❌ Bootstrap failed:', error);
      this.handleBootstrapError(error);
    }
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    // 注册全局错误处理器
    errorBoundary.registerHandler('bootstrap', (errorRecord) => {
      console.error('Bootstrap error captured:', errorRecord);
      
      // 对于关键错误，显示错误页面
      if (errorRecord.error?.message?.includes('Failed to fetch dynamically imported module')) {
        this.handleBootstrapError(new Error('模块加载失败，请检查网络连接'));
      }
    });

    // 包装关键函数
    this.init = errorBoundary.wrap(this.init.bind(this), 'bootstrap.init');
  }

  /**
   * 初始化版本管理
   */
  async initVersionManager() {
    try {
      const versionInfo = await versionManager.init();
      console.log('📦 Version Manager initialized:', versionInfo);
      
      // 将版本信息添加到配置中
      config.app.version = versionInfo.current;
      config.app.updateChannel = versionInfo.channel;
      
      // 将版本管理器暴露给全局使用
      window.adminV3Version = versionManager;
    } catch (error) {
      console.error('Failed to initialize version manager:', error);
    }
  }

  /**
   * 设置性能监控
   */
  setupPerformanceMonitoring() {
    // 标记启动时间
    performanceMonitor.mark('bootstrap-start');
    
    // 监控内存使用
    performanceMonitor.addAlertObserver((alert) => {
      if (alert.level === 'critical' && alert.metricName.includes('memory')) {
        console.warn('内存使用过高，建议刷新页面');
        if (window.adminV3App?.showToast) {
          window.adminV3App.showToast('warning', '内存使用较高，建议刷新页面以获得最佳性能');
        }
      }
    });
  }

  /**
   * 检测运行环境
   */
  detectEnvironment() {
    const isVercel = window.location.hostname.includes('vercel.app');
    const isLocal = window.location.hostname === 'localhost';
    const isProduction = !isLocal && !window.location.hostname.includes('test');
    
    config.environment = {
      isVercel,
      isLocal,
      isProduction,
      apiEndpoint: this.getApiEndpoint(isVercel, isLocal)
    };
    
    // 设置全局配置供其他模块使用
    window.adminV3Config = config;
    
    console.log('🌍 Environment detected:', config.environment);
  }

  /**
   * 获取API端点
   */
  getApiEndpoint(isVercel, isLocal) {
    if (isVercel) {
      // Vercel部署，连接到Railway后端
      return 'https://aiproductmanager-production.up.railway.app/api';
    } else if (isLocal) {
      // 本地开发
      return 'http://localhost:3001/api';
    } else {
      // Railway或其他部署
      return window.location.origin + '/api';
    }
  }

  /**
   * 预加载关键资源
   */
  async preloadCriticalResources() {
    const criticalModules = [
      import('../_core/api-client.js'),
      import('../_core/auth.js'),
      import('../_core/router.js')
    ];
    
    try {
      const modules = await Promise.all(criticalModules);
      console.log(`✅ Preloaded ${modules.length} critical modules`);
    } catch (error) {
      console.warn('⚠️ Some modules failed to preload:', error);
      // 继续运行，让应用自己处理缺失的模块
    }
  }

  /**
   * 处理启动错误
   */
  handleBootstrapError(error) {
    // 显示友好的错误界面
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 500px;
            text-align: center;
          ">
            <h2 style="color: #ef4444; margin-bottom: 16px;">
              ⚠️ 启动失败
            </h2>
            <p style="color: #6b7280; margin-bottom: 24px;">
              ${error.message || '应用初始化过程中发生错误'}
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button onclick="location.reload()" style="
                padding: 10px 24px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              ">
                重试
              </button>
              <button onclick="window.location.href='/admin-v2'" style="
                padding: 10px 24px;
                background: #e5e7eb;
                color: #374151;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              ">
                使用V2版本
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * 切换到主应用界面
   */
  switchToMainApp() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContent = document.getElementById('app-content');
    const app = document.getElementById('app');
    
    console.log('🔄 Switching to main app...');
    console.log('  Loading screen found:', !!loadingScreen);
    console.log('  App content found:', !!appContent);
    console.log('  App container found:', !!app);
    
    // 强制移除加载画面
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
      loadingScreen.style.visibility = 'hidden';
      // 完全移除元素以确保不会干扰
      setTimeout(() => {
        if (loadingScreen.parentNode) {
          loadingScreen.remove();
          console.log('🗑️ Loading screen removed from DOM');
        }
      }, 100);
    }
    
    // 强制显示主内容
    if (appContent) {
      appContent.style.display = 'block';
      appContent.style.visibility = 'visible';
      appContent.style.opacity = '1';
      console.log('📱 Switched to main app interface');
    } else {
      console.error('❌ App content element not found!');
      // 创建app-content如果不存在
      const newAppContent = document.createElement('div');
      newAppContent.id = 'app-content';
      newAppContent.style.display = 'block';
      if (app) {
        app.appendChild(newAppContent);
        console.log('✅ Created app-content element');
      }
    }
    
    // 确保app容器可见
    if (app) {
      app.style.display = 'block';
      app.style.visibility = 'visible';
    }
    
    // 设置标志表示界面已经切换
    window.adminV3BootstrapSwitched = true;
    console.log('✅ Bootstrap UI switch completed');
  }

  /**
   * 记录性能指标
   */
  logPerformance() {
    const loadTime = performance.now() - this.startTime;
    console.log(`⚡ Bootstrap time: ${loadTime.toFixed(2)}ms`);
    
    // 标记启动完成
    performanceMonitor.mark('bootstrap-end');
    performanceMonitor.measure('bootstrap-duration', 'bootstrap-start', 'bootstrap-end');
    
    // 记录启动性能
    performanceMonitor.record('bootstrap.loadTime', loadTime, {
      environment: config.environment.isProduction ? 'production' : 'development'
    });
    
    // 生成性能报告
    const report = performanceMonitor.getReport();
    console.log('📊 Performance Report:', report);
    
    // 发送性能数据到分析服务（如果配置了）
    if (config.analytics?.enabled) {
      this.sendAnalytics('bootstrap_performance', {
        loadTime,
        environment: config.environment.isProduction ? 'production' : 'development',
        timestamp: new Date().toISOString(),
        webVitals: report.webVitals
      });
    }
  }

  /**
   * 发送分析数据
   */
  async sendAnalytics(event, data) {
    // 实现分析数据发送逻辑
    // 可以使用 Vercel Analytics 或其他服务
    console.log('📊 Analytics:', event, data);
  }
}

// 自动初始化
const bootstrap = new Bootstrap();

// DOM Ready后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootstrap.init());
} else {
  // DOM already loaded
  bootstrap.init();
}

// 导出给全局使用
window.adminV3Bootstrap = bootstrap;

export { bootstrap };