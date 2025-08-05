/**
 * AI Service Page Tests
 * 测试AI服务主页面
 */

import { AIServicePage } from '../../../_pages/ai-service/index.js';
import { createMockDocument, fireEvent } from '../../helpers/dom-mocks.js';
import { MockApiClient, setupCommonMocks } from '../../helpers/api-mocks.js';

describe('AIServicePage', () => {
  let page;
  let mockDocument;
  let mockApi;
  let mockApp;

  beforeEach(() => {
    // Setup DOM
    mockDocument = createMockDocument();
    global.document = mockDocument;
    
    // Setup API
    mockApi = new MockApiClient();
    setupCommonMocks(mockApi);
    
    // Setup app context
    mockApp = {
      api: mockApi,
      showToast: jest.fn(),
      showLoading: jest.fn(),
      hideLoading: jest.fn()
    };
    
    // Create page instance
    page = new AIServicePage(mockApp);
  });

  afterEach(() => {
    page.destroy();
    mockDocument._reset();
  });

  describe('initialization', () => {
    it('should initialize with default tab', () => {
      expect(page.currentTab).toBe('provider-config');
      expect(page.modules).toBeDefined();
      expect(page.modules.size).toBe(0);
    });

    it('should set available tabs', () => {
      const tabs = page.getAvailableTabs();
      
      expect(tabs).toContain('provider-config');
      expect(tabs).toContain('unified-config');
      expect(tabs).toContain('cost-analysis');
      expect(tabs).toContain('load-balance');
      expect(tabs).toContain('provider-catalog');
      expect(tabs).toContain('data-sources');
    });
  });

  describe('rendering', () => {
    it('should render page structure', async () => {
      const html = await page.render();
      
      expect(html).toContain('ai-service-page');
      expect(html).toContain('page-header');
      expect(html).toContain('tab-nav');
      expect(html).toContain('tab-content');
    });

    it('should render all tab buttons', async () => {
      const html = await page.render();
      
      expect(html).toContain('服务商配置');
      expect(html).toContain('统一配置');
      expect(html).toContain('成本分析');
      expect(html).toContain('负载均衡');
      expect(html).toContain('服务商目录');
      expect(html).toContain('数据源');
    });

    it('should mark current tab as active', async () => {
      page.currentTab = 'cost-analysis';
      const html = await page.render();
      
      expect(html).toContain('data-tab="cost-analysis" class="tab-button active"');
    });
  });

  describe('tab switching', () => {
    beforeEach(async () => {
      const html = await page.render();
      const container = mockDocument.createElement('div');
      container.innerHTML = html;
      mockDocument.body.appendChild(container);
      
      await page.afterRender();
    });

    it('should switch tabs on button click', async () => {
      const tabButton = mockDocument.querySelector('[data-tab="unified-config"]');
      
      fireEvent(tabButton, 'click');
      
      expect(page.currentTab).toBe('unified-config');
    });

    it('should update active button state', async () => {
      const oldButton = mockDocument.querySelector('[data-tab="provider-config"]');
      const newButton = mockDocument.querySelector('[data-tab="cost-analysis"]');
      
      fireEvent(newButton, 'click');
      
      expect(oldButton.classList.contains('active')).toBe(false);
      expect(newButton.classList.contains('active')).toBe(true);
    });

    it('should load tab module on switch', async () => {
      const loadModuleSpy = jest.spyOn(page, 'loadTabModule');
      
      await page.switchTab('unified-config');
      
      expect(loadModuleSpy).toHaveBeenCalledWith('unified-config');
    });

    it('should render tab content after switch', async () => {
      const contentEl = mockDocument.getElementById('tab-content');
      
      await page.switchTab('cost-analysis');
      
      expect(contentEl.innerHTML).toContain('cost-analysis');
    });
  });

  describe('module loading', () => {
    it('should lazy load tab modules', async () => {
      const module = await page.loadTabModule('provider-config');
      
      expect(module).toBeDefined();
      expect(page.modules.has('provider-config')).toBe(true);
    });

    it('should reuse loaded modules', async () => {
      const module1 = await page.loadTabModule('unified-config');
      const module2 = await page.loadTabModule('unified-config');
      
      expect(module1).toBe(module2);
    });

    it('should handle module load errors', async () => {
      // Mock import to fail
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('Module not found'));
      
      await page.loadTabModule('non-existent');
      
      expect(mockApp.showToast).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('加载失败')
      );
      
      global.import = originalImport;
    });
  });

  describe('module lifecycle', () => {
    it('should call module render method', async () => {
      const mockModule = {
        render: jest.fn().mockResolvedValue('<div>Mock Content</div>'),
        bindEvents: jest.fn()
      };
      
      page.modules.set('test-tab', mockModule);
      
      await page.renderTabContent('test-tab');
      
      expect(mockModule.render).toHaveBeenCalled();
    });

    it('should call module bindEvents after render', async () => {
      const mockModule = {
        render: jest.fn().mockResolvedValue('<div>Mock Content</div>'),
        bindEvents: jest.fn()
      };
      
      page.modules.set('test-tab', mockModule);
      
      await page.renderTabContent('test-tab');
      
      expect(mockModule.bindEvents).toHaveBeenCalled();
    });

    it('should destroy previous module on tab switch', async () => {
      const mockModule = {
        render: jest.fn().mockResolvedValue('<div>Mock Content</div>'),
        destroy: jest.fn()
      };
      
      page.modules.set('old-tab', mockModule);
      page.currentModule = mockModule;
      
      await page.switchTab('new-tab');
      
      expect(mockModule.destroy).toHaveBeenCalled();
    });
  });

  describe('data management', () => {
    it('should share app context with modules', async () => {
      const module = await page.loadTabModule('provider-config');
      
      expect(module.app).toBe(mockApp);
      expect(module.api).toBe(mockApi);
    });

    it('should pass data between modules', () => {
      const testData = { key: 'value' };
      
      page.setSharedData('test', testData);
      expect(page.getSharedData('test')).toEqual(testData);
    });

    it('should notify modules of data changes', () => {
      const mockModule = {
        onDataChange: jest.fn()
      };
      
      page.modules.set('test-tab', mockModule);
      page.notifyDataChange('providers', { updated: true });
      
      expect(mockModule.onDataChange).toHaveBeenCalledWith('providers', { updated: true });
    });
  });

  describe('error handling', () => {
    it('should show error message on render failure', async () => {
      const mockModule = {
        render: jest.fn().mockRejectedValue(new Error('Render failed'))
      };
      
      page.modules.set('error-tab', mockModule);
      
      const content = await page.renderTabContent('error-tab');
      
      expect(content).toContain('加载失败');
      expect(mockApp.showToast).toHaveBeenCalledWith('error', expect.any(String));
    });

    it('should handle missing module gracefully', async () => {
      const content = await page.renderTabContent('non-existent');
      
      expect(content).toContain('模块未找到');
    });
  });

  describe('performance', () => {
    it('should show loading state during module load', async () => {
      await page.loadTabModule('cost-analysis');
      
      expect(mockApp.showLoading).toHaveBeenCalled();
      expect(mockApp.hideLoading).toHaveBeenCalled();
    });

    it('should debounce rapid tab switches', async () => {
      const renderSpy = jest.spyOn(page, 'renderTabContent');
      
      // Rapid clicks
      await page.switchTab('tab1');
      await page.switchTab('tab2');
      await page.switchTab('tab3');
      
      // Should only render the last one
      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(renderSpy).toHaveBeenCalledWith('tab3');
    });
  });

  describe('cleanup', () => {
    it('should destroy all modules on page destroy', () => {
      const mockModules = {
        module1: { destroy: jest.fn() },
        module2: { destroy: jest.fn() }
      };
      
      page.modules = new Map(Object.entries(mockModules));
      
      page.destroy();
      
      expect(mockModules.module1.destroy).toHaveBeenCalled();
      expect(mockModules.module2.destroy).toHaveBeenCalled();
      expect(page.modules.size).toBe(0);
    });

    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(mockDocument, 'removeEventListener');
      
      page.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});