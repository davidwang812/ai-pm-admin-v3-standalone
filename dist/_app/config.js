/**
 * Admin V3 Configuration
 * 全局配置管理
 */

export const config = {
  // 应用基础信息
  app: {
    name: 'AI Product Manager Admin V3',
    version: '3.0.0',
    description: 'Vercel Optimized Admin Panel',
    buildDate: '2025-01-28',
    updateChannel: 'production'
  },

  // 环境配置（由bootstrap动态设置）
  environment: {
    isVercel: false,
    isLocal: false,
    isProduction: false,
    apiEndpoint: ''
  },

  // API配置
  api: {
    timeout: 5000, // 5秒超时（比V2的8秒更快失败）
    retryAttempts: 2,
    retryDelay: 1000,
    
    // Railway后端API URL
    railwayApiUrl: 'https://aiproductmanager-production.up.railway.app/api',
    
    // Vercel Data Fetcher URL (更新为你的实际部署URL)
    vercelDataFetcherUrl: 'https://vercel-provider-e1eoj9j1q-david-wangs-projects-354116b4.vercel.app',
    
    // API路径配置
    endpoints: {
      // 认证
      auth: {
        login: '/auth/login',
        logout: '/auth/logout',
        verify: '/auth/verify'
      },
      
      // 供应商
      providers: {
        list: '/providers',
        catalog: '/providers/catalog',
        save: '/providers/save',
        test: '/providers/test'
      },
      
      // 配置
      config: {
        load: '/config/load',
        save: '/config/save'
      },
      
      // 分析
      analytics: {
        dashboard: '/analytics/dashboard',
        cost: '/analytics/cost'
      }
    }
  },

  // 缓存策略
  cache: {
    enabled: true,
    ttl: {
      catalog: 24 * 60 * 60 * 1000, // 24小时
      config: 60 * 60 * 1000,        // 1小时
      providers: 5 * 60 * 1000,      // 5分钟
      analytics: 60 * 1000           // 1分钟
    },
    storage: {
      preferIndexedDB: true,
      fallbackToLocalStorage: true
    }
  },

  // 性能优化
  performance: {
    lazyLoadDelay: 200,
    debounceDelay: 300,
    throttleDelay: 100,
    
    // Bundle分割策略
    codeSplitting: {
      enabled: true,
      chunkSizeLimit: 30000, // 30KB per chunk
      preloadStrategy: 'hover' // hover | viewport | none
    }
  },

  // UI配置
  ui: {
    theme: 'light',
    animations: true,
    
    // 布局配置（保持与V2一致）
    layout: {
      sidebarWidth: 240,
      headerHeight: 60,
      contentPadding: 24
    },
    
    // Toast通知配置
    toast: {
      duration: 3000,
      position: 'top-right'
    }
  },

  // 分析配置
  analytics: {
    enabled: false, // 生产环境可以启用
    provider: 'vercel', // vercel | google | custom
    events: {
      trackPageViews: true,
      trackErrors: true,
      trackPerformance: true
    }
  },

  // 功能开关
  features: {
    // 核心功能
    dashboard: true,
    aiService: true,
    userManagement: true,
    billing: true,
    
    // 高级功能
    loadBalancing: true,
    costAnalysis: true,
    realtimeSync: false, // V3暂时关闭WebSocket
    
    // 实验性功能
    edgeFunctions: true,
    kvStore: true
  },

  // 安全配置
  security: {
    // CSP配置
    csp: {
      enabled: false, // Vercel会处理CSP
      reportOnly: true
    },
    
    // Token配置
    token: {
      storage: 'localStorage', // localStorage | sessionStorage | cookie
      key: 'admin_token_v3',
      refreshBeforeExpiry: 5 * 60 * 1000 // 提前5分钟刷新
    }
  },

  // 调试配置
  debug: {
    enabled: true, // 生产环境设为false
    logLevel: 'info', // error | warn | info | debug
    showPerformanceMetrics: true,
    showApiCalls: true
  }
};

// 允许通过URL参数覆盖配置（仅开发环境）
if (window.location.hostname === 'localhost') {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('debug')) {
    config.debug.enabled = params.get('debug') === 'true';
  }
  
  if (params.has('cache')) {
    config.cache.enabled = params.get('cache') === 'true';
  }
  
  if (params.has('api')) {
    config.environment.apiEndpoint = params.get('api');
  }
}

// 不冻结config对象，允许环境检测时修改
// Object.freeze(config);

export default config;