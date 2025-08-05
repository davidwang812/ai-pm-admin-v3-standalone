/**
 * AI Service Management Page
 * V3版本 - 从V2迁移
 */

import { ProviderConfig } from './provider-config.js';
import { CatalogManager } from './catalog/catalog-manager.js';
import { VercelApiManager } from './catalog/vercel-api-manager.js';
import { UnifiedConfig } from './unified-config.js';
import { LoadBalance } from './load-balance.js';
import { LoadBalanceEnhanced } from './load-balance-enhanced.js';
import { CostAnalysis } from './cost-analysis.js';
import { DataSources } from './data-sources.js';

export class AIServicePage {
  constructor(app) {
    this.app = app || window.adminV3App || {};
    this.state = this.app?.state || {};
    
    // Ensure app has necessary properties
    if (!this.app.api) {
      this.app.api = {
        getProviderCatalog: async () => ({ providers: [], models: [] }),
        getProviders: async () => ({ success: false, providers: {} }),
        getUnifiedConfig: async () => ({ success: false, data: {} }),
        saveUnifiedConfig: async (config) => ({ success: false, message: 'API not available' })
      };
    }
    
    // Add showToast if it doesn't exist
    this.initShowToast();
    
    this.currentTab = 'providers';
    
    // Initialize all modules with proper app context
    this.modules = {
      providers: new ProviderConfig(this.app),
      catalog: new CatalogManager(this.app),
      unified: new UnifiedConfig(this.app),
      balance: new LoadBalance(this.app),
      balanceEnhanced: new LoadBalanceEnhanced(this.app),
      cost: new CostAnalysis(this.app),
      dataSources: new DataSources(this.app)
    };
    
    // Initialize Vercel API manager
    this.vercelApiManager = new VercelApiManager();
    
    // Make modules accessible to V3 app
    if (window.adminV3App) {
      window.adminV3App.catalogManager = this.modules.catalog;
      window.adminV3App.aiServicePage = this;
    }
  }
  
  initShowToast() {
    if (!this.app.showToast) {
      this.app.showToast = (type, message) => {
        console.log(`[${type.toUpperCase()}] ${message}`);
        const toast = document.createElement('div');
        
        // Choose color based on type
        let bgColor = '#faad14'; // default info/warning
        if (type === 'success') bgColor = '#52c41a';
        else if (type === 'error') bgColor = '#ff4d4f';
        else if (type === 'warning') bgColor = '#faad14';
        else if (type === 'info') bgColor = '#1890ff';
        
        toast.style.cssText = `
          position: fixed; top: 20px; right: 20px; padding: 12px 20px;
          background: ${bgColor};
          color: white; border-radius: 4px; z-index: 10000; font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15); animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.style.animation = 'slideOut 0.3s ease';
          setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
      };
      
      // Add animation styles
      if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  /**
   * 组件挂载后的生命周期
   */
  async mounted() {
    console.log('📌 AIServicePage mounted, binding events...');
    
    // 使用setTimeout确保DOM完全渲染
    setTimeout(() => {
      this.bindEvents();
    }, 0);
  }
  
  async render() {
    console.log('🎨 AIServicePage.render() starting...');
    console.log('📍 Current tab:', this.currentTab);
    
    const tabContent = await this.renderTabContent();
    
    // 确保tabContent是字符串
    if (typeof tabContent !== 'string') {
      console.error('❌ Tab content is not a string:', typeof tabContent);
      tabContent = String(tabContent || '');
    }
    
    // 直接返回HTML字符串，不要使用模板字符串以避免转义问题
    const html = '<div class="ai-service-container">' +
      '<div class="page-header">' +
        '<h2>🤖 AI服务管理</h2>' +
      '</div>' +
      '<div class="service-tabs">' +
        '<button class="tab-btn ' + (this.currentTab === 'providers' ? 'active' : '') + '" data-tab="providers">服务商配置</button>' +
        '<button class="tab-btn ' + (this.currentTab === 'unified' ? 'active' : '') + '" data-tab="unified">统一配置</button>' +
        '<button class="tab-btn ' + (this.currentTab === 'balance' ? 'active' : '') + '" data-tab="balance">负载均衡</button>' +
        '<button class="tab-btn ' + (this.currentTab === 'balanceEnhanced' ? 'active' : '') + '" data-tab="balanceEnhanced">负载均衡Pro</button>' +
        '<button class="tab-btn ' + (this.currentTab === 'cost' ? 'active' : '') + '" data-tab="cost">成本分析</button>' +
        '<button class="tab-btn ' + (this.currentTab === 'catalog' ? 'active' : '') + '" data-tab="catalog">提供商目录</button>' +
        '<button class="tab-btn ' + (this.currentTab === 'dataSources' ? 'active' : '') + '" data-tab="dataSources">数据源</button>' +
      '</div>' +
      '<div class="tab-content" id="ai-service-content">' +
        tabContent +
      '</div>' +
    '</div>';
    
    console.log('✅ AIServicePage.render() completed, HTML length:', html.length);
    return html;
  }

  async renderTabContent() {
    console.log('🔄 Rendering tab:', this.currentTab);
    
    try {
      let content = '';
      switch (this.currentTab) {
        case 'providers':
          content = await this.modules.providers.render();
          break;
          
        case 'unified':
          content = await this.modules.unified.render();
          break;
          
        case 'balance':
          content = await this.modules.balance.render();
          break;
          
        case 'cost':
          content = await this.modules.cost.render();
          break;
          
        case 'catalog':
          console.log('📚 Rendering catalog tab...');
          content = await this.renderProviderCatalog();
          console.log('📚 Catalog content length:', content ? content.length : 0);
          
          // Double check the content
          if (!content || content.length === 0) {
            console.error('❌ Catalog render returned empty content!');
            content = '<div class="error-state">目录内容为空，请刷新页面重试</div>';
          }
          break;
          
        case 'dataSources':
          content = await this.modules.dataSources.render();
          break;
          
        default:
          content = `<div class="empty-state">请选择一个标签页</div>`;
      }
      
      console.log(`✅ Tab ${this.currentTab} rendered, content length: ${content ? content.length : 0}`);
      return content;
      
    } catch (error) {
      console.error('❌ Error rendering tab content:', error, error.stack);
      return `
        <div class="error-state">
          <h3>加载失败</h3>
          <p>${error.message}</p>
          <pre>${error.stack}</pre>
          <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
        </div>
      `;
    }
  }

  async renderProviderCatalog() {
    console.log('🎯 renderProviderCatalog called');
    // Use the catalog manager for rendering
    const html = await this.modules.catalog.render();
    console.log('📊 Catalog HTML length:', html ? html.length : 0);
    return html;
  }

  async afterRender() {
    console.log('🔗 AIServicePage afterRender called');
    this.bindEvents();
  }

  bindEvents() {
    console.log('🔗 Binding AIServicePage events...');
    
    // Tab switching
    const tabButtons = document.querySelectorAll('.service-tabs .tab-btn');
    console.log(`📌 Found ${tabButtons.length} tab buttons`);
    
    tabButtons.forEach(btn => {
      // Remove any existing listeners first
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const tab = e.currentTarget.dataset.tab;
        console.log('🔄 Tab clicked:', tab);
        
        if (!tab) {
          console.error('❌ No tab data attribute found');
          return;
        }
        
        this.currentTab = tab;
        
        // Update active tab
        document.querySelectorAll('.service-tabs .tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === tab);
        });
        
        // Render new content
        const contentEl = document.getElementById('ai-service-content');
        if (contentEl) {
          console.log('📝 Rendering content for tab:', tab);
          contentEl.innerHTML = '<div class="loading">加载中...</div>';
          
          try {
            const html = await this.renderTabContent();
            console.log(`✅ Content rendered for ${tab}, length: ${html ? html.length : 0}`);
            
            if (!html || html.length === 0) {
              throw new Error('Rendered content is empty');
            }
            
            contentEl.innerHTML = html;
            this.bindTabEvents();
            
            // Verify content was inserted
            console.log(`📊 Content element now has ${contentEl.innerHTML.length} characters`);
            
          } catch (error) {
            console.error('❌ Failed to render tab:', error);
            contentEl.innerHTML = `
              <div class="error-state">
                <h3>加载失败</h3>
                <p>错误: ${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">刷新页面</button>
              </div>
            `;
          }
        } else {
          console.error('❌ Content element not found');
        }
      });
    });
    
    // Bind events for current tab
    this.bindTabEvents();
  }

  bindTabEvents() {
    console.log('🔗 Binding events for tab:', this.currentTab);
    
    // Delegate to appropriate module
    const module = this.modules[this.currentTab];
    if (module && typeof module.bindEvents === 'function') {
      module.bindEvents();
    }
    
    // Special handling for catalog tab
    if (this.currentTab === 'catalog') {
      this.bindCatalogEvents();
    }
  }

  bindCatalogEvents() {
    // Catalog-specific event bindings
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.modules.catalog.handleSearch(e.target.value);
      });
    }
    
    const refreshBtn = document.getElementById('btn-refresh-catalog');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.modules.catalog.fetchCatalogData();
      });
    }
    
    const saveBtn = document.getElementById('btn-save-catalog');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.modules.catalog.saveCatalogToDB();
      });
    }
  }

  // Utility methods
  formatNumber(num) {
    if (!num) return '-';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  }

  getProviderTypeName(type) {
    const typeNames = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'baidu': '百度',
      'alibaba': '阿里云',
      'azure': 'Azure',
      'aws': 'AWS',
      'custom': '自定义'
    };
    return typeNames[type] || type;
  }

  // Data source methods (delegated to DataSources module)
  toggleDataSource(source, enabled) {
    this.modules.dataSources.toggleDataSource(source, enabled);
  }

  async testDataSources() {
    await this.modules.dataSources.testDataSources();
  }

  async refreshDataSources() {
    await this.modules.dataSources.refreshDataSources();
  }

  // Vercel-specific methods
  updateVercelUrl(url) {
    this.modules.dataSources.updateVercelUrl(url);
  }

  async testVercelConnection() {
    await this.modules.dataSources.testVercelConnection();
  }

  deployVercel() {
    this.modules.dataSources.deployVercel();
  }
  
  /**
   * 清理组件
   */
  destroy() {
    console.log('🧹 Destroying AI Service page...');
    
    // 清理各个模块
    for (const [name, module] of Object.entries(this.modules)) {
      if (module && typeof module.destroy === 'function') {
        try {
          module.destroy();
        } catch (error) {
          console.error(`Error destroying module ${name}:`, error);
        }
      }
    }
    
    // 清理其他资源
    this.modules.clear();
    
    console.log('✅ AI Service page destroyed');
  }
}

// Export as default for V3 compatibility
export default AIServicePage;