/**
 * UI Renderer Module
 * 負責渲染AI服務頁面的各種UI組件
 */

export class UIRenderer {
  constructor() {
    this.templates = {
      provider: this.getProviderTemplate.bind(this),
      stats: this.getStatsTemplate.bind(this),
      quickActions: this.getQuickActionsTemplate.bind(this),
      emptyState: this.getEmptyStateTemplate.bind(this)
    };
  }

  /**
   * 渲染服務商卡片
   */
  renderProviderCard(provider) {
    const status = provider.enabled || provider.is_active;
    const statusText = status ? '運行中' : '已停用';
    const statusClass = status ? 'status-active' : 'status-inactive';
    const apiKey = provider.apiKey || provider.api_key || '';
    const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...` : '未配置';
    
    // Get model info
    let modelInfo = '未配置';
    if (provider.models && provider.models.length > 0) {
      modelInfo = provider.models[0];
    } else if (provider.config && provider.config.model) {
      modelInfo = provider.config.model;
    }

    return `
      <div class="provider-card" data-provider-id="${provider.id}">
        <div class="provider-header">
          <div class="provider-info">
            <span class="provider-icon">${this.getProviderIcon(provider.type)}</span>
            <div>
              <h4 class="provider-name">${provider.name}</h4>
              <span class="provider-type">${this.getProviderTypeName(provider.type)}</span>
            </div>
          </div>
          <div class="provider-status ${statusClass}">
            ${statusText}
          </div>
        </div>
        
        <div class="provider-details">
          <div class="detail-item">
            <span class="detail-label">API密鑰:</span>
            <span class="detail-value">${maskedKey}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">模型:</span>
            <span class="detail-value">${modelInfo}</span>
          </div>
        </div>
        
        <div class="provider-actions">
          <button class="btn btn-sm" onclick="window.adminApp.editProvider('${provider.id}')">
            編輯
          </button>
          <button class="btn btn-sm" onclick="window.adminApp.testProvider('${provider.id}')">
            測試
          </button>
          <button class="btn btn-sm btn-${status ? 'warning' : 'success'}" 
                  onclick="window.adminApp.toggleProvider('${provider.id}', ${!status})">
            ${status ? '停用' : '啟用'}
          </button>
          <button class="btn btn-sm btn-danger" 
                  onclick="window.adminApp.deleteProvider('${provider.id}')">
            刪除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染統計卡片
   */
  renderStatsCard(title, value, icon, trend) {
    const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : '';
    const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '';
    
    return `
      <div class="stats-card">
        <div class="stats-icon">${icon}</div>
        <div class="stats-content">
          <div class="stats-title">${title}</div>
          <div class="stats-value">${value}</div>
          ${trend !== undefined ? `
            <div class="stats-trend ${trendClass}">
              <span>${trendIcon} ${Math.abs(trend)}%</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 渲染空狀態
   */
  renderEmptyState(type = 'providers') {
    const messages = {
      providers: {
        icon: '📦',
        title: '還沒有配置服務商',
        description: '點擊上方按鈕添加您的第一個AI服務商',
        action: '添加服務商'
      },
      models: {
        icon: '🤖',
        title: '沒有可用的模型',
        description: '請先配置服務商以使用AI模型',
        action: '配置服務商'
      },
      data: {
        icon: '📊',
        title: '暫無數據',
        description: '系統正在收集數據，請稍後查看',
        action: null
      }
    };

    const message = messages[type] || messages.data;
    
    return `
      <div class="empty-state">
        <div class="empty-icon">${message.icon}</div>
        <h3 class="empty-title">${message.title}</h3>
        <p class="empty-description">${message.description}</p>
        ${message.action ? `
          <button class="btn btn-primary" onclick="window.adminApp.showAddProviderDialog()">
            ${message.action}
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染快速操作按鈕
   */
  renderQuickActions() {
    return `
      <div class="quick-actions">
        <button class="btn btn-primary" onclick="window.adminApp.showAddProviderDialog()">
          <span class="btn-icon">+</span> 添加服務商
        </button>
        <button class="btn" onclick="window.adminApp.importProviders()">
          <span class="btn-icon">📥</span> 導入配置
        </button>
        <button class="btn" onclick="window.adminApp.exportProviders()">
          <span class="btn-icon">📤</span> 導出配置
        </button>
        <button class="btn" onclick="window.adminApp.refreshProviders()">
          <span class="btn-icon">🔄</span> 刷新
        </button>
      </div>
    `;
  }

  /**
   * 渲染頁面標題
   */
  renderPageHeader(title, subtitle) {
    return `
      <div class="page-header">
        <div class="page-title">
          <h2>${title}</h2>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
        </div>
        ${this.renderQuickActions()}
      </div>
    `;
  }

  /**
   * 渲染加載狀態
   */
  renderLoading(message = '加載中...') {
    return `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * 渲染錯誤狀態
   */
  renderError(error) {
    return `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>出錯了</h3>
        <p>${error.message || '發生了未知錯誤'}</p>
        <button class="btn" onclick="window.location.reload()">
          重新加載
        </button>
      </div>
    `;
  }

  /**
   * 渲染表格
   */
  renderTable(headers, rows, emptyMessage = '暫無數據') {
    if (!rows || rows.length === 0) {
      return `
        <div class="table-empty">
          <p>${emptyMessage}</p>
        </div>
      `;
    }

    return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              ${headers.map(header => `
                <th>${header.label}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${headers.map(header => `
                  <td>${this.getCellValue(row, header.key)}</td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * 渲染標籤頁
   */
  renderTabs(tabs, activeTab) {
    return `
      <div class="tabs">
        <div class="tab-list">
          ${tabs.map(tab => `
            <button class="tab-item ${tab.key === activeTab ? 'active' : ''}"
                    data-tab="${tab.key}"
                    onclick="window.adminApp.switchTab('${tab.key}')">
              ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
              ${tab.label}
              ${tab.badge ? `<span class="tab-badge">${tab.badge}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染進度條
   */
  renderProgress(value, max = 100, label = '') {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    return `
      <div class="progress-wrapper">
        ${label ? `<div class="progress-label">${label}</div>` : ''}
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-text">${value} / ${max}</div>
      </div>
    `;
  }

  /**
   * 獲取服務商圖標
   */
  getProviderIcon(type) {
    const icons = {
      openai: '🤖',
      anthropic: '🔮',
      google: '🔍',
      azure: '☁️',
      moonshot: '🌙',
      deepseek: '🌊',
      qwen: '🐉',
      meta: '📘',
      mistral: '🌪️',
      yi: '💫'
    };
    return icons[type] || '🔧';
  }

  /**
   * 獲取服務商類型名稱
   */
  getProviderTypeName(type) {
    const names = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google AI',
      azure: 'Azure OpenAI',
      moonshot: 'Moonshot AI',
      deepseek: 'DeepSeek',
      qwen: 'Qwen',
      meta: 'Meta AI',
      mistral: 'Mistral AI',
      yi: '01.AI'
    };
    return names[type] || type;
  }

  /**
   * 獲取單元格值
   */
  getCellValue(row, key) {
    const keys = key.split('.');
    let value = row;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
    
    if (value instanceof Date) {
      return this.formatDate(value);
    }
    
    return value;
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 格式化數字
   */
  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  /**
   * 獲取服務商模板
   */
  getProviderTemplate() {
    return this.renderProviderCard;
  }

  /**
   * 獲取統計模板
   */
  getStatsTemplate() {
    return this.renderStatsCard;
  }

  /**
   * 獲取快速操作模板
   */
  getQuickActionsTemplate() {
    return this.renderQuickActions;
  }

  /**
   * 獲取空狀態模板
   */
  getEmptyStateTemplate() {
    return this.renderEmptyState;
  }
}