/**
 * Event Handlers Module
 * 集中管理AI服務頁面的所有事件處理
 */

export class EventHandlers {
  constructor(app, page) {
    this.app = app;
    this.page = page;
    this.listeners = new Map();
  }

  /**
   * 初始化所有事件監聽器
   */
  initializeEventListeners() {
    // Tab switching
    this.attachTabListeners();
    
    // Provider actions
    this.attachProviderListeners();
    
    // Catalog actions
    this.attachCatalogListeners();
    
    // Data source actions
    this.attachDataSourceListeners();
    
    // Form submissions
    this.attachFormListeners();
    
    // Modal events
    this.attachModalListeners();
  }

  /**
   * 附加標籤切換監聽器
   */
  attachTabListeners() {
    this.delegateEvent('.tab-button', 'click', (e) => {
      const tab = e.target.dataset.tab;
      if (tab) {
        this.handleTabSwitch(tab);
      }
    });
  }

  /**
   * 附加服務商相關監聽器
   */
  attachProviderListeners() {
    // Add provider
    this.delegateEvent('.add-provider-btn', 'click', (e) => {
      const type = e.target.dataset.providerType;
      this.app.addProvider(type);
    });

    // Edit provider
    this.delegateEvent('.edit-provider-btn', 'click', (e) => {
      const id = e.target.dataset.providerId;
      this.app.editProvider(id);
    });

    // Test provider
    this.delegateEvent('.test-provider-btn', 'click', (e) => {
      const id = e.target.dataset.providerId;
      this.app.testProvider(id);
    });

    // Toggle provider
    this.delegateEvent('.toggle-provider-btn', 'click', (e) => {
      const id = e.target.dataset.providerId;
      const enabled = e.target.dataset.enabled === 'true';
      this.app.toggleProvider(id, !enabled);
    });

    // Delete provider
    this.delegateEvent('.delete-provider-btn', 'click', (e) => {
      const id = e.target.dataset.providerId;
      if (confirm('確定要刪除此服務商配置嗎？')) {
        this.app.deleteProvider(id);
      }
    });
  }

  /**
   * 附加目錄相關監聽器
   */
  attachCatalogListeners() {
    // Pagination
    this.delegateEvent('.pagination-btn', 'click', (e) => {
      const page = parseInt(e.target.dataset.page);
      if (page) {
        this.page.changeCatalogPage(page);
      }
    });

    // Update catalog
    this.delegateEvent('#update-catalog-btn', 'click', async (e) => {
      await this.handleCatalogUpdate();
    });

    // Save catalog
    this.delegateEvent('#save-catalog-btn', 'click', async (e) => {
      await this.handleCatalogSave();
    });

    // Export catalog
    this.delegateEvent('#export-catalog-btn', 'click', (e) => {
      this.handleCatalogExport();
    });

    // Cancel update
    this.delegateEvent('#cancel-update', 'click', (e) => {
      this.handleCancelUpdate();
    });

    // Refresh catalog
    this.delegateEvent('#refresh-catalog-btn', 'click', async (e) => {
      await this.handleCatalogRefresh();
    });
  }

  /**
   * 附加數據源相關監聽器
   */
  attachDataSourceListeners() {
    // Toggle data source
    this.delegateEvent('.data-source-toggle', 'change', (e) => {
      const source = e.target.dataset.source;
      const enabled = e.target.checked;
      this.handleDataSourceToggle(source, enabled);
    });

    // Test data source
    this.delegateEvent('.test-source-btn', 'click', async (e) => {
      const source = e.target.dataset.source;
      await this.handleDataSourceTest(source);
    });

    // Save Vercel API
    this.delegateEvent('#save-vercel-btn', 'click', async (e) => {
      await this.page.vercelApiManager.saveUrl();
    });

    // Test Vercel API
    this.delegateEvent('#test-vercel-btn', 'click', async (e) => {
      await this.page.vercelApiManager.test();
    });
  }

  /**
   * 附加表單監聽器
   */
  attachFormListeners() {
    // Unified config form
    this.delegateEvent('#unified-config-form', 'submit', async (e) => {
      e.preventDefault();
      await this.handleUnifiedConfigSave(e.target);
    });

    // Load balance form
    this.delegateEvent('#load-balance-form', 'submit', async (e) => {
      e.preventDefault();
      await this.handleLoadBalanceSave(e.target);
    });

    // Cost analysis form
    this.delegateEvent('#cost-filter-form', 'submit', async (e) => {
      e.preventDefault();
      await this.handleCostFilter(e.target);
    });
  }

  /**
   * 附加模態框監聽器
   */
  attachModalListeners() {
    // Close modal on overlay click
    this.delegateEvent('.modal-overlay', 'click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.remove();
      }
    });

    // Close modal button
    this.delegateEvent('.modal-close', 'click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) {
        modal.remove();
      }
    });

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
          modal.remove();
        }
      }
    });
  }

  /**
   * 處理標籤切換
   */
  handleTabSwitch(tab) {
    console.log('Switching to tab:', tab);
    
    // Update active state
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update page state and re-render
    this.page.currentTab = tab;
    this.page.renderTabContent().then(content => {
      const container = document.getElementById('ai-service-content');
      if (container) {
        container.innerHTML = content;
        // Re-initialize event listeners for new content
        this.initializeEventListeners();
      }
    });
  }

  /**
   * 處理目錄更新
   */
  async handleCatalogUpdate() {
    try {
      this.app.showToast('info', '開始更新目錄...');
      
      // Show progress modal
      this.showProgressModal('更新中', '正在獲取最新的服務商和模型數據...');
      
      // Call update method
      await this.page.updateCatalogFromSources();
      
      this.app.showToast('success', '目錄更新成功！');
      this.closeProgressModal();
      
      // Refresh the page
      this.page.renderTabContent().then(content => {
        document.getElementById('ai-service-content').innerHTML = content;
        this.initializeEventListeners();
      });
    } catch (error) {
      console.error('Update catalog failed:', error);
      this.app.showToast('error', `更新失敗: ${error.message}`);
      this.closeProgressModal();
    }
  }

  /**
   * 處理目錄保存
   */
  async handleCatalogSave() {
    try {
      const catalogData = await this.page.catalogManager.getCatalogData();
      const result = await this.page.catalogManager.saveCatalog(catalogData);
      
      if (result.success) {
        this.app.showToast('success', `成功保存 ${result.savedCount} 個模型到數據庫`);
      } else {
        throw new Error(result.error || '保存失敗');
      }
    } catch (error) {
      console.error('Save catalog failed:', error);
      this.app.showToast('error', `保存失敗: ${error.message}`);
    }
  }

  /**
   * 處理目錄導出
   */
  handleCatalogExport() {
    try {
      const catalogData = this.page.currentCatalogData || this.page.catalogManager.getCatalogData();
      
      // Create download link
      const dataStr = JSON.stringify(catalogData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `catalog-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      this.app.showToast('success', '目錄已導出');
    } catch (error) {
      console.error('Export failed:', error);
      this.app.showToast('error', `導出失敗: ${error.message}`);
    }
  }

  /**
   * 處理取消更新
   */
  handleCancelUpdate() {
    if (this.page.currentUpdateController) {
      this.page.currentUpdateController.abort();
      this.page.currentUpdateController = null;
    }
    
    this.closeProgressModal();
    this.app.showToast('info', '已取消更新');
  }

  /**
   * 處理目錄刷新
   */
  async handleCatalogRefresh() {
    try {
      this.app.showToast('info', '正在刷新目錄...');
      
      // Clear cache
      localStorage.removeItem('provider_catalog');
      localStorage.removeItem('provider_catalog_temp');
      
      // Reload data
      await this.page.loadCachedCatalogData();
      
      // Re-render
      this.page.renderTabContent().then(content => {
        document.getElementById('ai-service-content').innerHTML = content;
        this.initializeEventListeners();
      });
      
      this.app.showToast('success', '目錄已刷新');
    } catch (error) {
      console.error('Refresh failed:', error);
      this.app.showToast('error', `刷新失敗: ${error.message}`);
    }
  }

  /**
   * 處理數據源切換
   */
  handleDataSourceToggle(source, enabled) {
    this.page.dataSourceConfig[source] = { 
      ...this.page.dataSourceConfig[source], 
      enabled 
    };
    
    localStorage.setItem('dataSourceConfig', JSON.stringify(this.page.dataSourceConfig));
    
    this.app.showToast('success', `${enabled ? '啟用' : '禁用'} ${source}`);
  }

  /**
   * 處理數據源測試
   */
  async handleDataSourceTest(source) {
    try {
      this.app.showToast('info', `測試 ${source}...`);
      
      // Implement test logic based on source
      const testUrl = source === 'openrouter' 
        ? 'https://openrouter.ai/api/v1/models'
        : 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
      
      const response = await fetch(testUrl);
      
      if (response.ok) {
        this.app.showToast('success', `${source} 連接成功`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.app.showToast('error', `${source} 連接失敗: ${error.message}`);
    }
  }

  /**
   * 顯示進度模態框
   */
  showProgressModal(title, message) {
    const modal = document.createElement('div');
    modal.id = 'progress-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="width: 400px;">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <button class="btn" id="cancel-progress">取消</button>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('cancel-progress')?.addEventListener('click', () => {
      this.handleCancelUpdate();
    });
  }

  /**
   * 關閉進度模態框
   */
  closeProgressModal() {
    document.getElementById('progress-modal')?.remove();
  }

  /**
   * 事件委託helper
   */
  delegateEvent(selector, event, handler) {
    document.addEventListener(event, (e) => {
      const target = e.target.closest(selector);
      if (target) {
        handler(e);
      }
    });
  }

  /**
   * 清理所有事件監聽器
   */
  cleanup() {
    // Remove all delegated events
    this.listeners.forEach((handler, key) => {
      const [element, event] = key.split(':');
      document.removeEventListener(event, handler);
    });
    this.listeners.clear();
  }
}