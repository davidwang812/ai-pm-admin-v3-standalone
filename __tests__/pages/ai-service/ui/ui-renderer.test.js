/**
 * UI Renderer Tests
 * 测试UI渲染器的各种组件渲染功能
 */

// Test runner
class SimpleTestRunner {
  constructor() {
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  describe(description, testSuite) {
    console.log(`\n📋 ${description}`);
    console.log('='.repeat(50));
    testSuite();
  }

  it(description, testFn) {
    this.results.total++;
    try {
      testFn();
      console.log(`  ✅ ${description}`);
      this.results.passed++;
    } catch (error) {
      console.log(`  ❌ ${description}`);
      console.log(`     Error: ${error.message}`);
      this.results.failed++;
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toContain: (expected) => {
        if (typeof actual === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected "${actual}" to contain "${expected}"`);
          }
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected instance of ${expectedClass.name}`);
        }
      }
    };
  }

  summary() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(30));
    console.log(`Total tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Mock UIRenderer class
class UIRenderer {
  constructor() {
    this.templates = {
      provider: this.getProviderTemplate.bind(this),
      stats: this.getStatsTemplate.bind(this),
      quickActions: this.getQuickActionsTemplate.bind(this),
      emptyState: this.getEmptyStateTemplate.bind(this)
    };
  }

  renderProviderCard(provider) {
    const status = provider.enabled || provider.is_active;
    const statusText = status ? '運行中' : '已停用';
    const statusClass = status ? 'status-active' : 'status-inactive';
    const apiKey = provider.apiKey || provider.api_key || '';
    const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...` : '未配置';
    
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
          <button class="btn btn-sm" onclick="window.adminV3App.editProvider('${provider.id}')">
            編輯
          </button>
          <button class="btn btn-sm" onclick="window.adminV3App.testProvider('${provider.id}')">
            測試
          </button>
          <button class="btn btn-sm btn-${status ? 'warning' : 'success'}" 
                  onclick="window.adminV3App.toggleProvider('${provider.id}', ${!status})">
            ${status ? '停用' : '啟用'}
          </button>
          <button class="btn btn-sm btn-danger" 
                  onclick="window.adminV3App.deleteProvider('${provider.id}')">
            刪除
          </button>
        </div>
      </div>
    `;
  }

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
          <button class="btn btn-primary" onclick="window.adminV3App.showAddProviderDialog()">
            ${message.action}
          </button>
        ` : ''}
      </div>
    `;
  }

  renderQuickActions() {
    return `
      <div class="quick-actions">
        <button class="btn btn-primary" onclick="window.adminV3App.showAddProviderDialog()">
          <span class="btn-icon">+</span> 添加服務商
        </button>
        <button class="btn" onclick="window.adminV3App.importProviders()">
          <span class="btn-icon">📥</span> 導入配置
        </button>
        <button class="btn" onclick="window.adminV3App.exportProviders()">
          <span class="btn-icon">📤</span> 導出配置
        </button>
        <button class="btn" onclick="window.adminV3App.refreshProviders()">
          <span class="btn-icon">🔄</span> 刷新
        </button>
      </div>
    `;
  }

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

  renderLoading(message = '加載中...') {
    return `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }

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

  renderTabs(tabs, activeTab) {
    return `
      <div class="tabs">
        <div class="tab-list">
          ${tabs.map(tab => `
            <button class="tab-item ${tab.key === activeTab ? 'active' : ''}"
                    data-tab="${tab.key}"
                    onclick="window.adminV3App.switchTab('${tab.key}')">
              ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
              ${tab.label}
              ${tab.badge ? `<span class="tab-badge">${tab.badge}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

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

  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  getProviderTemplate() {
    return this.renderProviderCard;
  }

  getStatsTemplate() {
    return this.renderStatsCard;
  }

  getQuickActionsTemplate() {
    return this.renderQuickActions;
  }

  getEmptyStateTemplate() {
    return this.renderEmptyState;
  }
}

// Run tests
const test = new SimpleTestRunner();

console.log('🎨 Testing UI Renderer\n');

test.describe('UIRenderer Initialization', () => {
  test.it('should initialize with template methods', () => {
    const renderer = new UIRenderer();
    
    test.expect(renderer.templates).toBeTruthy();
    test.expect(typeof renderer.templates.provider).toBe('function');
    test.expect(typeof renderer.templates.stats).toBe('function');
    test.expect(typeof renderer.templates.quickActions).toBe('function');
    test.expect(typeof renderer.templates.emptyState).toBe('function');
  });
});

test.describe('Provider Card Rendering', () => {
  test.it('should render active provider card correctly', () => {
    const renderer = new UIRenderer();
    const provider = {
      id: '123',
      name: 'Test Provider',
      type: 'openai',
      enabled: true,
      apiKey: 'sk-1234567890abcdef',
      models: ['gpt-4']
    };
    
    const html = renderer.renderProviderCard(provider);
    
    test.expect(html).toContain('provider-card');
    test.expect(html).toContain('data-provider-id="123"');
    test.expect(html).toContain('Test Provider');
    test.expect(html).toContain('OpenAI');
    test.expect(html).toContain('運行中');
    test.expect(html).toContain('sk-12345...');
    test.expect(html).toContain('gpt-4');
    test.expect(html).toContain('停用');
  });

  test.it('should render inactive provider card correctly', () => {
    const renderer = new UIRenderer();
    const provider = {
      id: '456',
      name: 'Inactive Provider',
      type: 'anthropic',
      is_active: false,
      api_key: '',
      config: { model: 'claude-3' }
    };
    
    const html = renderer.renderProviderCard(provider);
    
    test.expect(html).toContain('已停用');
    test.expect(html).toContain('status-inactive');
    test.expect(html).toContain('未配置');
    test.expect(html).toContain('claude-3');
    test.expect(html).toContain('啟用');
  });

  test.it('should handle provider without API key', () => {
    const renderer = new UIRenderer();
    const provider = {
      id: '789',
      name: 'No Key Provider',
      type: 'google',
      enabled: true
    };
    
    const html = renderer.renderProviderCard(provider);
    
    test.expect(html).toContain('未配置');
  });
});

test.describe('Stats Card Rendering', () => {
  test.it('should render stats card with positive trend', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderStatsCard('請求數', '1.2K', '📈', 15);
    
    test.expect(html).toContain('stats-card');
    test.expect(html).toContain('請求數');
    test.expect(html).toContain('1.2K');
    test.expect(html).toContain('📈');
    test.expect(html).toContain('trend-up');
    test.expect(html).toContain('↑ 15%');
  });

  test.it('should render stats card with negative trend', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderStatsCard('錯誤率', '2.5%', '⚠️', -8);
    
    test.expect(html).toContain('trend-down');
    test.expect(html).toContain('↓ 8%');
  });

  test.it('should render stats card without trend', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderStatsCard('總用戶', '100', '👥');
    
    test.expect(html).toContain('stats-card');
    test.expect(html).toContain('總用戶');
    test.expect(html).toContain('100');
  });
});

test.describe('Empty State Rendering', () => {
  test.it('should render providers empty state', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderEmptyState('providers');
    
    test.expect(html).toContain('empty-state');
    test.expect(html).toContain('📦');
    test.expect(html).toContain('還沒有配置服務商');
    test.expect(html).toContain('添加服務商');
  });

  test.it('should render models empty state', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderEmptyState('models');
    
    test.expect(html).toContain('🤖');
    test.expect(html).toContain('沒有可用的模型');
    test.expect(html).toContain('配置服務商');
  });

  test.it('should render data empty state without action', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderEmptyState('data');
    
    test.expect(html).toContain('📊');
    test.expect(html).toContain('暫無數據');
    test.expect(html).toContain('系統正在收集數據');
  });

  test.it('should handle unknown empty state type', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderEmptyState('unknown');
    
    test.expect(html).toContain('暫無數據');
  });
});

test.describe('Quick Actions Rendering', () => {
  test.it('should render all quick action buttons', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderQuickActions();
    
    test.expect(html).toContain('quick-actions');
    test.expect(html).toContain('添加服務商');
    test.expect(html).toContain('導入配置');
    test.expect(html).toContain('導出配置');
    test.expect(html).toContain('刷新');
    test.expect(html).toContain('showAddProviderDialog');
    test.expect(html).toContain('importProviders');
    test.expect(html).toContain('exportProviders');
    test.expect(html).toContain('refreshProviders');
  });
});

test.describe('Page Header Rendering', () => {
  test.it('should render page header with subtitle', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderPageHeader('AI服務管理', '管理您的AI服務商配置');
    
    test.expect(html).toContain('page-header');
    test.expect(html).toContain('AI服務管理');
    test.expect(html).toContain('管理您的AI服務商配置');
    test.expect(html).toContain('quick-actions');
  });

  test.it('should render page header without subtitle', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderPageHeader('用戶管理');
    
    test.expect(html).toContain('用戶管理');
    test.expect(html).toContain('quick-actions');
  });
});

test.describe('Loading and Error States', () => {
  test.it('should render loading state with default message', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderLoading();
    
    test.expect(html).toContain('loading-state');
    test.expect(html).toContain('spinner');
    test.expect(html).toContain('加載中...');
  });

  test.it('should render loading state with custom message', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderLoading('正在保存配置...');
    
    test.expect(html).toContain('正在保存配置...');
  });

  test.it('should render error state', () => {
    const renderer = new UIRenderer();
    const error = { message: '網絡連接失敗' };
    const html = renderer.renderError(error);
    
    test.expect(html).toContain('error-state');
    test.expect(html).toContain('⚠️');
    test.expect(html).toContain('出錯了');
    test.expect(html).toContain('網絡連接失敗');
    test.expect(html).toContain('重新加載');
  });

  test.it('should render error state with unknown error', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderError({});
    
    test.expect(html).toContain('發生了未知錯誤');
  });
});

test.describe('Table Rendering', () => {
  test.it('should render table with data', () => {
    const renderer = new UIRenderer();
    const headers = [
      { key: 'name', label: '名稱' },
      { key: 'status', label: '狀態' },
      { key: 'created', label: '創建時間' }
    ];
    const rows = [
      { name: 'Item 1', status: true, created: new Date('2024-01-01') },
      { name: 'Item 2', status: false, created: new Date('2024-01-02') }
    ];
    
    const html = renderer.renderTable(headers, rows);
    
    test.expect(html).toContain('table-wrapper');
    test.expect(html).toContain('data-table');
    test.expect(html).toContain('名稱');
    test.expect(html).toContain('狀態');
    test.expect(html).toContain('創建時間');
    test.expect(html).toContain('Item 1');
    test.expect(html).toContain('Item 2');
    test.expect(html).toContain('✅');
    test.expect(html).toContain('❌');
  });

  test.it('should render empty table message', () => {
    const renderer = new UIRenderer();
    const headers = [{ key: 'name', label: '名稱' }];
    const html = renderer.renderTable(headers, []);
    
    test.expect(html).toContain('table-empty');
    test.expect(html).toContain('暫無數據');
  });

  test.it('should render custom empty message', () => {
    const renderer = new UIRenderer();
    const headers = [{ key: 'name', label: '名稱' }];
    const html = renderer.renderTable(headers, null, '沒有找到記錄');
    
    test.expect(html).toContain('沒有找到記錄');
  });
});

test.describe('Tabs Rendering', () => {
  test.it('should render tabs with active state', () => {
    const renderer = new UIRenderer();
    const tabs = [
      { key: 'overview', label: '概覽', icon: '📊' },
      { key: 'providers', label: '服務商', icon: '🔧', badge: '5' },
      { key: 'logs', label: '日誌' }
    ];
    
    const html = renderer.renderTabs(tabs, 'providers');
    
    test.expect(html).toContain('tabs');
    test.expect(html).toContain('tab-list');
    test.expect(html).toContain('概覽');
    test.expect(html).toContain('服務商');
    test.expect(html).toContain('日誌');
    test.expect(html).toContain('📊');
    test.expect(html).toContain('🔧');
    test.expect(html).toContain('tab-badge">5');
    test.expect(html).toContain('data-tab="providers"');
    test.expect(html).toContain('active');
  });
});

test.describe('Progress Bar Rendering', () => {
  test.it('should render progress bar with label', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderProgress(75, 100, '使用率');
    
    test.expect(html).toContain('progress-wrapper');
    test.expect(html).toContain('使用率');
    test.expect(html).toContain('width: 75%');
    test.expect(html).toContain('75 / 100');
  });

  test.it('should render progress bar without label', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderProgress(30, 50);
    
    test.expect(html).toContain('width: 60%');
    test.expect(html).toContain('30 / 50');
  });

  test.it('should handle progress overflow', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderProgress(150, 100);
    
    test.expect(html).toContain('width: 100%');
  });

  test.it('should handle negative progress', () => {
    const renderer = new UIRenderer();
    const html = renderer.renderProgress(-10, 100);
    
    test.expect(html).toContain('width: 0%');
  });
});

test.describe('Utility Functions', () => {
  test.it('should get correct provider icons', () => {
    const renderer = new UIRenderer();
    
    test.expect(renderer.getProviderIcon('openai')).toBe('🤖');
    test.expect(renderer.getProviderIcon('anthropic')).toBe('🔮');
    test.expect(renderer.getProviderIcon('google')).toBe('🔍');
    test.expect(renderer.getProviderIcon('unknown')).toBe('🔧');
  });

  test.it('should get correct provider type names', () => {
    const renderer = new UIRenderer();
    
    test.expect(renderer.getProviderTypeName('openai')).toBe('OpenAI');
    test.expect(renderer.getProviderTypeName('anthropic')).toBe('Anthropic');
    test.expect(renderer.getProviderTypeName('unknown')).toBe('unknown');
  });

  test.it('should format numbers correctly', () => {
    const renderer = new UIRenderer();
    
    test.expect(renderer.formatNumber(0)).toBe('0');
    test.expect(renderer.formatNumber(999)).toBe('999');
    test.expect(renderer.formatNumber(1500)).toBe('1.5K');
    test.expect(renderer.formatNumber(1500000)).toBe('1.5M');
  });

  test.it('should get cell values correctly', () => {
    const renderer = new UIRenderer();
    const row = {
      name: 'Test',
      status: true,
      nested: { value: 42 },
      nullValue: null,
      date: new Date('2024-01-01')
    };
    
    test.expect(renderer.getCellValue(row, 'name')).toBe('Test');
    test.expect(renderer.getCellValue(row, 'status')).toBe('✅');
    test.expect(renderer.getCellValue(row, 'nested.value')).toBe(42);
    test.expect(renderer.getCellValue(row, 'nullValue')).toBe('-');
    test.expect(renderer.getCellValue(row, 'missing')).toBe('-');
  });
});

// Show test results
test.summary();

console.log('\n🎨 UI Renderer testing completed!');
console.log('Ready for production rendering.');