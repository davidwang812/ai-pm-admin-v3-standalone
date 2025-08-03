/**
 * AI Service Page
 * V3 AI服务管理页面 - 模块化拆分、懒加载优化
 */

import state from '../../_core/state.js';
import cache from '../../_core/cache.js';
import apiClient from '../../_core/api-client.js';
import lazyLoader from '../../_app/lazy-loader.js';

export class AIServicePage {
  constructor(app) {
    this.app = app;
    this.modules = new Map();
    this.activeTab = 'providers';
    this.initialized = false;
  }

  /**
   * 渲染页面
   */
  async render() {
    // 返回初始HTML结构
    const html = this.getInitialHTML();
    
    // 异步初始化
    setTimeout(() => this.initialize(), 0);
    
    return html;
  }

  /**
   * 获取初始HTML
   */
  getInitialHTML() {
    return `
      <div class="ai-service-container">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1>AI 服务管理</h1>
          <div class="header-actions">
            <button class="btn-primary" onclick="adminV3App.showProviderModal()">
              <span class="icon">➕</span>
              添加服务商
            </button>
          </div>
        </div>

        <!-- 标签页 -->
        <div class="tabs-container">
          <div class="tabs-header">
            <button class="tab-item active" data-tab="providers" onclick="adminV3App.switchTab('providers')">
              <span class="tab-icon">🤖</span>
              服务商配置
            </button>
            <button class="tab-item" data-tab="unified" onclick="adminV3App.switchTab('unified')">
              <span class="tab-icon">🔧</span>
              统一配置
            </button>
            <button class="tab-item" data-tab="balance" onclick="adminV3App.switchTab('balance')">
              <span class="tab-icon">⚖️</span>
              负载均衡
            </button>
            <button class="tab-item" data-tab="cost" onclick="adminV3App.switchTab('cost')">
              <span class="tab-icon">💰</span>
              成本分析
            </button>
            <button class="tab-item" data-tab="catalog" onclick="adminV3App.switchTab('catalog')">
              <span class="tab-icon">📚</span>
              模型目录
            </button>
          </div>
          
          <div class="tabs-content" id="tabContent">
            <div class="tab-pane active" data-tab="providers">
              <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>加载服务商配置...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .ai-service-container {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .page-header h1 {
          margin: 0;
          font-size: 28px;
          color: #1f2937;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .tabs-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .tabs-header {
          display: flex;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
        }

        .tab-item {
          flex: 1;
          padding: 16px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          position: relative;
        }

        .tab-item:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .tab-item.active {
          color: #667eea;
          background: white;
        }

        .tab-item.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #667eea;
        }

        .tab-icon {
          font-size: 18px;
        }

        .tabs-content {
          padding: 24px;
          min-height: 500px;
        }

        .tab-pane {
          display: none;
        }

        .tab-pane.active {
          display: block;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* 服务商列表样式 */
        .providers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .provider-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          transition: all 0.2s;
          position: relative;
        }

        .provider-card:hover {
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .provider-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 16px;
        }

        .provider-name {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .provider-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .provider-status.active {
          background: #d1fae5;
          color: #065f46;
        }

        .provider-status.inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .provider-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .info-label {
          color: #6b7280;
        }

        .info-value {
          color: #1f2937;
          font-weight: 500;
        }

        .provider-actions {
          display: flex;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-action {
          flex: 1;
          padding: 8px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: #f9fafb;
          border-color: #667eea;
          color: #667eea;
        }
      </style>
    `;
  }

  /**
   * 初始化页面
   */
  async initialize() {
    console.log('🤖 Initializing AI Service page...');
    
    try {
      // 加载初始标签内容
      await this.loadTabContent(this.activeTab);
      
      // 预加载其他标签模块
      this.preloadModules();
      
      // 绑定全局方法
      this.bindGlobalMethods();
      
      this.initialized = true;
      console.log('✅ AI Service page initialized');
      
    } catch (error) {
      console.error('Failed to initialize AI Service page:', error);
      this.showError(error);
    }
  }

  /**
   * 加载标签内容
   */
  async loadTabContent(tabName) {
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) return;
    
    // 显示加载状态
    const tabPane = this.getOrCreateTabPane(tabName);
    tabPane.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    `;
    
    // 激活标签
    this.activateTab(tabName);
    
    try {
      // 根据标签加载对应模块
      switch (tabName) {
        case 'providers':
          await this.loadProvidersModule();
          break;
        case 'unified':
          await this.loadUnifiedModule();
          break;
        case 'balance':
          await this.loadBalanceModule();
          break;
        case 'cost':
          await this.loadCostModule();
          break;
        case 'catalog':
          await this.loadCatalogModule();
          break;
      }
    } catch (error) {
      console.error(`Failed to load tab content: ${tabName}`, error);
      tabPane.innerHTML = `
        <div class="error-container">
          <p>加载失败：${error.message}</p>
          <button onclick="location.reload()">重试</button>
        </div>
      `;
    }
  }

  /**
   * 加载服务商模块
   */
  async loadProvidersModule() {
    // 从缓存或API获取数据
    const providers = await this.getProviders();
    
    // 渲染服务商列表
    const tabPane = document.querySelector('.tab-pane[data-tab="providers"]');
    if (!tabPane) return;
    
    if (!providers || providers.length === 0) {
      tabPane.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🤖</div>
          <h3>暂无服务商配置</h3>
          <p>点击"添加服务商"按钮配置您的第一个AI服务商</p>
          <button class="btn-primary" onclick="adminV3App.showProviderModal()">
            添加服务商
          </button>
        </div>
      `;
      return;
    }
    
    tabPane.innerHTML = `
      <div class="providers-grid">
        ${providers.map(provider => this.renderProviderCard(provider)).join('')}
      </div>
    `;
  }

  /**
   * 渲染服务商卡片
   */
  renderProviderCard(provider) {
    const statusClass = provider.enabled ? 'active' : 'inactive';
    const statusText = provider.enabled ? '启用' : '停用';
    
    return `
      <div class="provider-card" data-provider-id="${provider.id}">
        <div class="provider-header">
          <div class="provider-name">
            ${this.getProviderIcon(provider.provider)}
            <span>${provider.name || provider.provider}</span>
          </div>
          <span class="provider-status ${statusClass}">${statusText}</span>
        </div>
        
        <div class="provider-info">
          <div class="info-item">
            <span class="info-label">API端点</span>
            <span class="info-value">${this.truncate(provider.base_url, 25)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">模型</span>
            <span class="info-value">${provider.models?.length || 0} 个</span>
          </div>
          <div class="info-item">
            <span class="info-label">优先级</span>
            <span class="info-value">${provider.priority || 0}</span>
          </div>
          <div class="info-item">
            <span class="info-label">健康状态</span>
            <span class="info-value">${this.getHealthStatus(provider)}</span>
          </div>
        </div>
        
        <div class="provider-actions">
          <button class="btn-action" onclick="adminV3App.editProvider('${provider.id}')">
            编辑
          </button>
          <button class="btn-action" onclick="adminV3App.testProvider('${provider.id}')">
            测试
          </button>
          <button class="btn-action" onclick="adminV3App.toggleProvider('${provider.id}')">
            ${provider.enabled ? '停用' : '启用'}
          </button>
          <button class="btn-action" onclick="adminV3App.deleteProvider('${provider.id}')">
            删除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 加载统一配置模块
   */
  async loadUnifiedModule() {
    // 延迟加载统一配置模块
    if (!this.modules.has('unified')) {
      const module = await lazyLoader.load('./modules/unified-config.js');
      this.modules.set('unified', module);
    }
    
    const UnifiedConfig = this.modules.get('unified');
    const instance = new UnifiedConfig(this);
    await instance.render();
  }

  /**
   * 加载负载均衡模块
   */
  async loadBalanceModule() {
    if (!this.modules.has('balance')) {
      const module = await lazyLoader.load('./modules/load-balance.js');
      this.modules.set('balance', module);
    }
    
    const LoadBalance = this.modules.get('balance');
    const instance = new LoadBalance(this);
    await instance.render();
  }

  /**
   * 加载成本分析模块
   */
  async loadCostModule() {
    if (!this.modules.has('cost')) {
      const module = await lazyLoader.load('./modules/cost-analysis.js');
      this.modules.set('cost', module);
    }
    
    const CostAnalysis = this.modules.get('cost');
    const instance = new CostAnalysis(this);
    await instance.render();
  }

  /**
   * 加载模型目录模块
   */
  async loadCatalogModule() {
    const tabPane = document.querySelector('.tab-pane[data-tab="catalog"]');
    if (!tabPane) return;
    
    // 从缓存或API获取目录数据
    const catalog = await this.getCatalog();
    
    tabPane.innerHTML = `
      <div class="catalog-container">
        <div class="catalog-header">
          <input type="text" placeholder="搜索模型..." class="search-input" onkeyup="adminV3App.searchCatalog(this.value)">
          <button class="btn-refresh" onclick="adminV3App.refreshCatalog()">
            刷新目录
          </button>
        </div>
        <div class="catalog-stats">
          <span>共 ${catalog.length} 个模型</span>
          <span>来自 ${this.countProviders(catalog)} 个服务商</span>
        </div>
        <div class="catalog-list" id="catalogList">
          ${this.renderCatalogList(catalog)}
        </div>
      </div>
    `;
  }

  /**
   * 获取服务商数据
   */
  async getProviders() {
    // 先从缓存获取
    const cached = await cache.get('providers', 'list');
    if (cached) {
      return cached;
    }
    
    // 从API获取
    // 使用模拟数据（V3优化期间）
    console.log('🔧 Using mock data for AI providers');
    const mockData = [
      {
        id: 'openai',
        name: 'OpenAI',
        type: 'chat',
        status: 'active',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        config: { apiKey: '***', baseURL: 'https://api.openai.com/v1' },
        metrics: { requests: 1234, errors: 5, latency: 120 }
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        type: 'chat',
        status: 'active',
        models: ['claude-3-opus', 'claude-3-sonnet'],
        config: { apiKey: '***', baseURL: 'https://api.anthropic.com' },
        metrics: { requests: 856, errors: 2, latency: 95 }
      },
      {
        id: 'google',
        name: 'Google AI',
        type: 'chat',
        status: 'inactive',
        models: ['gemini-pro'],
        config: { apiKey: '***', baseURL: 'https://generativelanguage.googleapis.com' },
        metrics: { requests: 234, errors: 0, latency: 150 }
      }
    ];
    
    await cache.set('providers', 'list', mockData);
    return mockData;
  }

  /**
   * 获取目录数据
   */
  async getCatalog() {
    // 先从缓存获取
    const cached = await cache.get('catalog', 'all');
    if (cached) {
      return cached;
    }
    
    // 从Vercel Function获取
    try {
      const response = await fetch('/api/providers/openrouter');
      const data = await response.json();
      if (data.success) {
        await cache.set('catalog', 'all', data.models);
        return data.models;
      }
    } catch (error) {
      console.error('Failed to load catalog:', error);
    }
    
    return [];
  }

  /**
   * 预加载其他模块
   */
  preloadModules() {
    // 使用懒加载器预加载
    lazyLoader.preloadBatch([
      { path: './modules/unified-config.js', priority: 'medium' },
      { path: './modules/load-balance.js', priority: 'low' },
      { path: './modules/cost-analysis.js', priority: 'low' }
    ]);
  }

  /**
   * 绑定全局方法
   */
  bindGlobalMethods() {
    if (!window.adminV3App) {
      window.adminV3App = {};
    }
    
    // 绑定方法到全局
    window.adminV3App.switchTab = (tab) => this.switchTab(tab);
    window.adminV3App.showProviderModal = () => this.showProviderModal();
    window.adminV3App.editProvider = (id) => this.editProvider(id);
    window.adminV3App.testProvider = (id) => this.testProvider(id);
    window.adminV3App.toggleProvider = (id) => this.toggleProvider(id);
    window.adminV3App.deleteProvider = (id) => this.deleteProvider(id);
    window.adminV3App.refreshCatalog = () => this.refreshCatalog();
    window.adminV3App.searchCatalog = (query) => this.searchCatalog(query);
  }

  /**
   * 切换标签
   */
  async switchTab(tabName) {
    if (tabName === this.activeTab) return;
    
    this.activeTab = tabName;
    await this.loadTabContent(tabName);
  }

  /**
   * 激活标签UI
   */
  activateTab(tabName) {
    // 更新标签头
    document.querySelectorAll('.tab-item').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // 更新标签内容
    document.querySelectorAll('.tab-pane').forEach(pane => {
      if (pane.dataset.tab === tabName) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  }

  /**
   * 获取或创建标签面板
   */
  getOrCreateTabPane(tabName) {
    let pane = document.querySelector(`.tab-pane[data-tab="${tabName}"]`);
    
    if (!pane) {
      pane = document.createElement('div');
      pane.className = 'tab-pane';
      pane.dataset.tab = tabName;
      document.getElementById('tabContent').appendChild(pane);
    }
    
    return pane;
  }

  /**
   * 工具方法
   */
  getProviderIcon(provider) {
    const icons = {
      openai: '🟢',
      anthropic: '🔵',
      google: '🔴',
      azure: '🔷',
      cohere: '🟣',
      huggingface: '🤗',
      default: '🤖'
    };
    return icons[provider.toLowerCase()] || icons.default;
  }

  truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.slice(0, length) + '...' : str;
  }

  getHealthStatus(provider) {
    if (provider.health?.status === 'healthy') {
      return '✅ 健康';
    } else if (provider.health?.status === 'degraded') {
      return '⚠️ 降级';
    } else if (provider.health?.status === 'unhealthy') {
      return '❌ 异常';
    }
    return '❓ 未知';
  }

  countProviders(catalog) {
    const providers = new Set(catalog.map(model => model.provider));
    return providers.size;
  }

  renderCatalogList(catalog) {
    // 简化的目录列表渲染
    return catalog.slice(0, 20).map(model => `
      <div class="catalog-item">
        <div class="model-name">${model.id}</div>
        <div class="model-info">
          <span>Context: ${model.context_length}</span>
          <span>Price: $${model.input_price}/M</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * 显示错误
   */
  showError(error) {
    const container = document.querySelector('.ai-service-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h2>加载失败</h2>
          <p style="color: #ef4444;">${error.message || '未知错误'}</p>
          <button onclick="location.reload()" class="btn-primary">重试</button>
        </div>
      `;
    }
  }
}

// 导出默认
export default AIServicePage;