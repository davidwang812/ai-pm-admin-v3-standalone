/**
 * UI Renderer Tests
 * 测试UI渲染模块
 */

import { UIRenderer } from '../../../_pages/ai-service/ui/ui-renderer.js';

describe('UIRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new UIRenderer();
    // Mock window.adminV3App
    global.window = { adminV3App: {} };
  });

  describe('initialization', () => {
    it('should initialize with template methods', () => {
      expect(renderer.templates).toBeDefined();
      expect(renderer.templates.provider).toBeInstanceOf(Function);
      expect(renderer.templates.stats).toBeInstanceOf(Function);
      expect(renderer.templates.quickActions).toBeInstanceOf(Function);
      expect(renderer.templates.emptyState).toBeInstanceOf(Function);
    });
  });

  describe('renderProviderCard', () => {
    it('should render active provider card', () => {
      const provider = {
        id: '1',
        name: 'OpenAI',
        type: 'openai',
        enabled: true,
        apiKey: 'sk-1234567890abcdef',
        models: ['gpt-4', 'gpt-3.5-turbo']
      };
      
      const html = renderer.renderProviderCard(provider);
      
      expect(html).toContain('provider-card');
      expect(html).toContain('data-provider-id="1"');
      expect(html).toContain('OpenAI');
      expect(html).toContain('運行中');
      expect(html).toContain('status-active');
      expect(html).toContain('sk-12345...');
      expect(html).toContain('gpt-4');
    });

    it('should render inactive provider card', () => {
      const provider = {
        id: '2',
        name: 'Anthropic',
        type: 'anthropic',
        is_active: false,
        api_key: '',
        config: { model: 'claude-3' }
      };
      
      const html = renderer.renderProviderCard(provider);
      
      expect(html).toContain('已停用');
      expect(html).toContain('status-inactive');
      expect(html).toContain('未配置'); // No API key
      expect(html).toContain('claude-3'); // Model from config
    });

    it('should handle missing data gracefully', () => {
      const provider = {
        id: '3',
        name: 'Test Provider',
        type: 'unknown'
      };
      
      const html = renderer.renderProviderCard(provider);
      
      expect(html).toContain('Test Provider');
      expect(html).toContain('🔧'); // Default icon
      expect(html).toContain('unknown'); // Unknown type
      expect(html).toContain('未配置'); // No API key
      expect(html).toContain('未配置'); // No models
    });

    it('should include all action buttons', () => {
      const provider = { id: '1', name: 'Test', enabled: true };
      const html = renderer.renderProviderCard(provider);
      
      expect(html).toContain('editProvider(\'1\')');
      expect(html).toContain('testProvider(\'1\')');
      expect(html).toContain('toggleProvider(\'1\', false)');
      expect(html).toContain('deleteProvider(\'1\')');
      expect(html).toContain('停用'); // Disable button for active provider
    });
  });

  describe('renderStatsCard', () => {
    it('should render stats card with trend up', () => {
      const html = renderer.renderStatsCard('總請求數', '1,234', '📊', 15);
      
      expect(html).toContain('stats-card');
      expect(html).toContain('總請求數');
      expect(html).toContain('1,234');
      expect(html).toContain('📊');
      expect(html).toContain('trend-up');
      expect(html).toContain('↑ 15%');
    });

    it('should render stats card with trend down', () => {
      const html = renderer.renderStatsCard('錯誤率', '2.5%', '⚠️', -8);
      
      expect(html).toContain('trend-down');
      expect(html).toContain('↓ 8%');
    });

    it('should render stats card without trend', () => {
      const html = renderer.renderStatsCard('活躍用戶', '456', '👥');
      
      expect(html).not.toContain('stats-trend');
      expect(html).not.toContain('↑');
      expect(html).not.toContain('↓');
    });
  });

  describe('renderEmptyState', () => {
    it('should render providers empty state', () => {
      const html = renderer.renderEmptyState('providers');
      
      expect(html).toContain('empty-state');
      expect(html).toContain('📦');
      expect(html).toContain('還沒有配置服務商');
      expect(html).toContain('showAddProviderDialog()');
    });

    it('should render models empty state', () => {
      const html = renderer.renderEmptyState('models');
      
      expect(html).toContain('🤖');
      expect(html).toContain('沒有可用的模型');
    });

    it('should render data empty state without action', () => {
      const html = renderer.renderEmptyState('data');
      
      expect(html).toContain('📊');
      expect(html).toContain('暫無數據');
      expect(html).not.toContain('<button');
    });

    it('should handle unknown type', () => {
      const html = renderer.renderEmptyState('unknown');
      
      expect(html).toContain('📊'); // Default to data
      expect(html).toContain('暫無數據');
    });
  });

  describe('renderPageHeader', () => {
    it('should render header with title and subtitle', () => {
      const html = renderer.renderPageHeader('AI服務管理', '管理您的AI服務商配置');
      
      expect(html).toContain('page-header');
      expect(html).toContain('<h2>AI服務管理</h2>');
      expect(html).toContain('管理您的AI服務商配置');
      expect(html).toContain('quick-actions'); // Should include quick actions
    });

    it('should render header without subtitle', () => {
      const html = renderer.renderPageHeader('配置管理');
      
      expect(html).toContain('配置管理');
      expect(html).not.toContain('page-subtitle');
    });
  });

  describe('renderTable', () => {
    it('should render table with data', () => {
      const headers = [
        { key: 'name', label: '名稱' },
        { key: 'status', label: '狀態' },
        { key: 'created', label: '創建時間' }
      ];
      
      const rows = [
        { name: 'Provider 1', status: true, created: new Date('2025-01-01') },
        { name: 'Provider 2', status: false, created: null }
      ];
      
      const html = renderer.renderTable(headers, rows);
      
      expect(html).toContain('data-table');
      expect(html).toContain('<th>名稱</th>');
      expect(html).toContain('<th>狀態</th>');
      expect(html).toContain('Provider 1');
      expect(html).toContain('✅'); // Boolean true
      expect(html).toContain('❌'); // Boolean false
      expect(html).toContain('-'); // Null value
    });

    it('should render empty table message', () => {
      const html = renderer.renderTable([], [], '沒有找到數據');
      
      expect(html).toContain('table-empty');
      expect(html).toContain('沒有找到數據');
    });

    it('should handle nested object values', () => {
      const headers = [{ key: 'user.name', label: '用戶名' }];
      const rows = [{ user: { name: 'John' } }];
      
      const html = renderer.renderTable(headers, rows);
      
      expect(html).toContain('John');
    });
  });

  describe('renderTabs', () => {
    it('should render tabs with active tab', () => {
      const tabs = [
        { key: 'providers', label: '服務商', icon: '🏢' },
        { key: 'models', label: '模型', icon: '🤖', badge: '12' },
        { key: 'logs', label: '日誌' }
      ];
      
      const html = renderer.renderTabs(tabs, 'models');
      
      expect(html).toContain('tabs');
      expect(html).toContain('data-tab="providers"');
      expect(html).toContain('data-tab="models"');
      expect(html).toContain('class="tab-item active"'); // Active tab
      expect(html).toContain('🏢'); // Icon
      expect(html).toContain('<span class="tab-badge">12</span>'); // Badge
      expect(html).toContain('switchTab(\'providers\')');
    });

    it('should render tabs without icons or badges', () => {
      const tabs = [{ key: 'tab1', label: 'Tab 1' }];
      const html = renderer.renderTabs(tabs, 'tab1');
      
      expect(html).not.toContain('tab-icon');
      expect(html).not.toContain('tab-badge');
    });
  });

  describe('renderProgress', () => {
    it('should render progress bar', () => {
      const html = renderer.renderProgress(75, 100, '處理進度');
      
      expect(html).toContain('progress-wrapper');
      expect(html).toContain('處理進度');
      expect(html).toContain('width: 75%');
      expect(html).toContain('75 / 100');
    });

    it('should cap progress at 100%', () => {
      const html = renderer.renderProgress(150, 100);
      
      expect(html).toContain('width: 100%');
    });

    it('should handle zero progress', () => {
      const html = renderer.renderProgress(0, 100);
      
      expect(html).toContain('width: 0%');
    });
  });

  describe('renderLoading', () => {
    it('should render loading state', () => {
      const html = renderer.renderLoading('正在載入數據...');
      
      expect(html).toContain('loading-state');
      expect(html).toContain('spinner');
      expect(html).toContain('正在載入數據...');
    });

    it('should use default message', () => {
      const html = renderer.renderLoading();
      
      expect(html).toContain('加載中...');
    });
  });

  describe('renderError', () => {
    it('should render error state', () => {
      const error = { message: '網絡連接失敗' };
      const html = renderer.renderError(error);
      
      expect(html).toContain('error-state');
      expect(html).toContain('⚠️');
      expect(html).toContain('出錯了');
      expect(html).toContain('網絡連接失敗');
      expect(html).toContain('window.location.reload()');
    });

    it('should handle error without message', () => {
      const html = renderer.renderError({});
      
      expect(html).toContain('發生了未知錯誤');
    });
  });

  describe('utility methods', () => {
    it('should get provider icons', () => {
      expect(renderer.getProviderIcon('openai')).toBe('🤖');
      expect(renderer.getProviderIcon('google')).toBe('🔍');
      expect(renderer.getProviderIcon('unknown')).toBe('🔧');
    });

    it('should get provider type names', () => {
      expect(renderer.getProviderTypeName('openai')).toBe('OpenAI');
      expect(renderer.getProviderTypeName('anthropic')).toBe('Anthropic');
      expect(renderer.getProviderTypeName('custom')).toBe('custom');
    });

    it('should format numbers', () => {
      expect(renderer.formatNumber(0)).toBe('0');
      expect(renderer.formatNumber(999)).toBe('999');
      expect(renderer.formatNumber(1500)).toBe('1.5K');
      expect(renderer.formatNumber(2500000)).toBe('2.5M');
    });

    it('should format dates', () => {
      const date = new Date('2025-01-15T10:30:00');
      const formatted = renderer.formatDate(date);
      
      expect(formatted).toContain('2025');
      expect(formatted).toContain('01');
      expect(formatted).toContain('15');
    });

    it('should get cell values', () => {
      const row = {
        name: 'Test',
        status: true,
        date: new Date('2025-01-01'),
        nested: { value: 'nested' },
        nullValue: null
      };
      
      expect(renderer.getCellValue(row, 'name')).toBe('Test');
      expect(renderer.getCellValue(row, 'status')).toBe('✅');
      expect(renderer.getCellValue(row, 'nested.value')).toBe('nested');
      expect(renderer.getCellValue(row, 'nullValue')).toBe('-');
      expect(renderer.getCellValue(row, 'missing')).toBe('-');
    });
  });

  describe('template methods', () => {
    it('should return render functions', () => {
      expect(renderer.getProviderTemplate()).toBeInstanceOf(Function);
      expect(renderer.getStatsTemplate()).toBeInstanceOf(Function);
      expect(renderer.getQuickActionsTemplate()).toBeInstanceOf(Function);
      expect(renderer.getEmptyStateTemplate()).toBeInstanceOf(Function);
    });
  });
});