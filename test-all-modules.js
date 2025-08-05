/**
 * Admin V3 Standalone - 全模块集成测试
 * 测试所有已完成模块的功能
 */

// 测试配置
const testConfig = {
  host: 'http://localhost:3000', // 本地开发服务器
  timeout: 5000
};

// 模拟浏览器环境
if (typeof window === 'undefined') {
  global.window = {
    location: { hostname: 'localhost', href: testConfig.host },
    localStorage: {
      storage: {},
      getItem(key) { return this.storage[key] || null; },
      setItem(key, value) { this.storage[key] = value; },
      removeItem(key) { delete this.storage[key]; },
      clear() { this.storage = {}; }
    },
    adminV3App: null,
    Chart: { getChart: () => null } // 模拟Chart.js
  };
  global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, appendChild: () => {} })
  };
  global.localStorage = window.localStorage;
  global.fetch = async () => ({ ok: false, json: async () => ({}) });
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.requestIdleCallback = (cb) => setTimeout(cb, 0);
}

// 测试工具函数
function createMockApp() {
  return {
    config: {
      api: { timeout: 5000 },
      ui: { toast: { duration: 3000 } }
    },
    showToast: (type, message) => {
      console.log(`[${type.toUpperCase()}] ${message}`);
    },
    api: null, // 模拟无API情况，使用mock数据
    state: {},
    modules: new Map()
  };
}

// 测试结果记录
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

async function runTest(name, testFn) {
  console.log(`\n🧪 测试: ${name}`);
  try {
    await testFn();
    testResults.passed++;
    console.log(`✅ 通过`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
    console.error(`❌ 失败:`, error.message);
  }
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始 Admin V3 Standalone 全模块集成测试...\n');

  // 1. 测试用户管理模块
  await runTest('用户管理模块 - UserManager', async () => {
    const { UserManager } = await import('./_pages/user/user-manager.js');
    const mockApp = createMockApp();
    const userManager = new UserManager(mockApp);
    
    // 测试加载用户
    const users = await userManager.loadUsers();
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Failed to load mock users');
    }
    
    // 测试过滤功能
    await userManager.filterUsers({ status: 'active' });
    if (userManager.currentFilter.status !== 'active') {
      throw new Error('Filter not applied correctly');
    }
    
    // 测试搜索功能
    await userManager.searchUsers('admin');
    if (userManager.currentFilter.searchQuery !== 'admin') {
      throw new Error('Search query not set correctly');
    }
  });

  await runTest('用户管理模块 - UserComponents', async () => {
    const { UserComponents } = await import('./_pages/user/user-components.js');
    const { UserManager } = await import('./_pages/user/user-manager.js');
    
    const mockApp = createMockApp();
    const userManager = new UserManager(mockApp);
    const components = new UserComponents(userManager);
    
    // 测试渲染用户表格
    const users = await userManager.loadUsers();
    const tableHtml = components.renderUserTable(users);
    if (!tableHtml.includes('user-table')) {
      throw new Error('User table not rendered correctly');
    }
    
    // 测试渲染用户详情
    const detailHtml = components.renderUserDetailModal(users[0]);
    if (!detailHtml.includes('user-detail-modal')) {
      throw new Error('User detail modal not rendered correctly');
    }
  });

  // 2. 测试计费管理模块
  await runTest('计费管理模块 - BillingManager', async () => {
    const { BillingManager } = await import('./_pages/billing/billing-manager.js');
    const mockApp = createMockApp();
    const billingManager = new BillingManager(mockApp);
    
    // 测试加载订阅计划
    const plans = await billingManager.loadSubscriptionPlans();
    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error('Failed to load subscription plans');
    }
    
    // 测试加载订单
    const orders = await billingManager.loadOrders();
    if (!Array.isArray(orders) || orders.length === 0) {
      throw new Error('Failed to load orders');
    }
    
    // 测试收入统计
    const stats = await billingManager.getRevenueStats();
    if (!stats || typeof stats.totalRevenue !== 'number') {
      throw new Error('Failed to get revenue stats');
    }
  });

  await runTest('计费管理模块 - BillingComponents', async () => {
    const { BillingComponents } = await import('./_pages/billing/billing-components.js');
    const { BillingManager } = await import('./_pages/billing/billing-manager.js');
    
    const mockApp = createMockApp();
    const billingManager = new BillingManager(mockApp);
    const components = new BillingComponents(billingManager);
    
    // 测试渲染订阅计划
    const plans = await billingManager.loadSubscriptionPlans();
    const plansHtml = components.renderSubscriptionPlans(plans);
    if (!plansHtml.includes('plan-card')) {
      throw new Error('Subscription plans not rendered correctly');
    }
    
    // 测试渲染订单表格
    const orders = await billingManager.loadOrders();
    const ordersHtml = components.renderOrdersTable(orders);
    if (!ordersHtml.includes('orders-table')) {
      throw new Error('Orders table not rendered correctly');
    }
  });

  // 3. 测试Dashboard页面
  await runTest('Dashboard页面', async () => {
    const { DashboardPage } = await import('./_pages/dashboard/index.js');
    const mockApp = createMockApp();
    const dashboard = new DashboardPage(mockApp);
    
    // 测试渲染
    const html = await dashboard.render();
    if (!html.includes('dashboard-container')) {
      throw new Error('Dashboard page not rendered correctly');
    }
    
    // 测试获取初始HTML
    const initialHtml = dashboard.getInitialHTML();
    if (!initialHtml.includes('stats-grid')) {
      throw new Error('Dashboard initial HTML missing stats grid');
    }
  });

  // 4. 测试AI服务管理页面
  await runTest('AI服务管理页面', async () => {
    const { AIServicePage } = await import('./_pages/ai-service/index.js');
    const mockApp = createMockApp();
    const aiService = new AIServicePage(mockApp);
    
    // 测试渲染
    const html = await aiService.render();
    if (!html.includes('ai-service-container')) {
      throw new Error('AI Service page not rendered correctly');
    }
    
    // 测试标签切换
    aiService.currentTab = 'unified';
    const tabContent = await aiService.renderTabContent();
    if (typeof tabContent !== 'string') {
      throw new Error('Tab content should be a string');
    }
  });

  // 5. 测试核心模块
  await runTest('Auth模块', async () => {
    const authManager = (await import('./_core/auth.js')).default;
    
    // 测试加载存储的认证信息
    authManager.clearAuth();
    const loaded = authManager.loadStoredAuth();
    if (loaded) {
      throw new Error('Should not load auth when storage is empty');
    }
    
    // 测试token解析
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Vg30C57s3l90JNap_VgMhKZjfc-p7SoBXaSAy8c6BS8';
    const payload = authManager.parseToken(mockToken);
    if (!payload || payload.name !== 'John Doe') {
      throw new Error('Failed to parse JWT token');
    }
  });

  await runTest('Router模块', async () => {
    const Router = (await import('./_core/router.js')).default;
    const router = new Router();
    
    // 测试路由注册
    const routes = [
      { path: '/', component: () => '<div>Home</div>' },
      { path: '/test', component: () => '<div>Test</div>' }
    ];
    
    router.init(routes);
    if (router.routes.size !== 2) {
      throw new Error('Routes not registered correctly');
    }
  });

  await runTest('Cache模块', async () => {
    const cache = (await import('./_core/cache.js')).default;
    
    // 测试缓存操作
    await cache.set('test', 'key1', { data: 'test value' });
    const cached = await cache.get('test', 'key1');
    if (!cached || cached.data !== 'test value') {
      throw new Error('Cache get/set failed');
    }
    
    // 测试删除
    await cache.delete('test', 'key1');
    const deleted = await cache.get('test', 'key1');
    if (deleted) {
      throw new Error('Cache delete failed');
    }
  });

  await runTest('State模块', async () => {
    const stateManager = (await import('./_core/state.js')).default;
    
    // 测试状态管理
    stateManager.set('test.value', 42);
    const value = stateManager.get('test.value');
    if (value !== 42) {
      throw new Error('State get/set failed');
    }
    
    // 测试订阅
    let notified = false;
    const unsubscribe = stateManager.subscribe('test', () => {
      notified = true;
    });
    stateManager.set('test.value', 100);
    if (!notified) {
      throw new Error('State subscription failed');
    }
    unsubscribe();
  });

  // 6. 测试工具类
  await runTest('Logger工具', async () => {
    const { Logger } = await import('./_utils/logger.js');
    const logger = new Logger('TestModule');
    
    // 测试各种日志级别
    logger.info('Test info message');
    logger.warn('Test warning');
    logger.error('Test error');
    logger.debug('Test debug');
    
    // 如果没有抛出错误，则测试通过
  });

  // 打印测试结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总:');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📈 通过率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ 失败的测试:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }
  
  console.log('\n✨ 测试完成！');
  
  // 返回是否所有测试都通过
  return testResults.failed === 0;
}

// 运行测试
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});