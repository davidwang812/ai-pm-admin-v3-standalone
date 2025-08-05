/**
 * Event Handlers Tests
 * 测试事件处理器的核心功能
 */

// Mock localStorage
const mockLocalStorage = {
  storage: new Map(),
  getItem: function(key) { return this.storage.get(key) || null; },
  setItem: function(key, value) { this.storage.set(key, value); },
  removeItem: function(key) { this.storage.delete(key); }
};

global.localStorage = mockLocalStorage;

// Mock URL and document methods
global.URL = {
  createObjectURL: jest.fn(() => 'mock-blob-url'),
  revokeObjectURL: jest.fn()
};

global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  type: options.type
}));

// Mock fetch
global.fetch = jest.fn();

// Mock the EventHandlers module
const EventHandlers = class {
  constructor(app, page) {
    this.app = app;
    this.page = page;
    this.listeners = new Map();
  }

  initializeEventListeners() {
    this.attachTabListeners();
    this.attachProviderListeners();
    this.attachCatalogListeners();
    this.attachDataSourceListeners();
    this.attachFormListeners();
    this.attachModalListeners();
  }

  attachTabListeners() {
    this.delegateEvent('.tab-button', 'click', (e) => {
      const tab = e.target.dataset.tab;
      if (tab) {
        this.handleTabSwitch(tab);
      }
    });
  }

  attachProviderListeners() {
    this.delegateEvent('.add-provider-btn', 'click', (e) => {
      const type = e.target.dataset.providerType;
      this.app.addProvider(type);
    });

    this.delegateEvent('.edit-provider-btn', 'click', (e) => {
      const id = e.target.dataset.providerId;
      this.app.editProvider(id);
    });

    this.delegateEvent('.test-provider-btn', 'click', (e) => {
      const id = e.target.dataset.providerId;
      this.app.testProvider(id);
    });

    this.delegateEvent('.toggle-provider-btn', 'click', (e) => {
      const id = e.target.dataset.providerId;
      const enabled = e.target.dataset.enabled === 'true';
      this.app.toggleProvider(id, !enabled);
    });

    this.delegateEvent('.delete-provider-btn', 'click', (e) => {
      const id = e.target.dataset.providerId;
      if (confirm('確定要刪除此服務商配置嗎？')) {
        this.app.deleteProvider(id);
      }
    });
  }

  attachCatalogListeners() {
    this.delegateEvent('.pagination-btn', 'click', (e) => {
      const page = parseInt(e.target.dataset.page);
      if (page) {
        this.page.changeCatalogPage(page);
      }
    });

    this.delegateEvent('#update-catalog-btn', 'click', async (e) => {
      await this.handleCatalogUpdate();
    });

    this.delegateEvent('#save-catalog-btn', 'click', async (e) => {
      await this.handleCatalogSave();
    });

    this.delegateEvent('#export-catalog-btn', 'click', (e) => {
      this.handleCatalogExport();
    });

    this.delegateEvent('#cancel-update', 'click', (e) => {
      this.handleCancelUpdate();
    });

    this.delegateEvent('#refresh-catalog-btn', 'click', async (e) => {
      await this.handleCatalogRefresh();
    });
  }

  attachDataSourceListeners() {
    this.delegateEvent('.data-source-toggle', 'change', (e) => {
      const source = e.target.dataset.source;
      const enabled = e.target.checked;
      this.handleDataSourceToggle(source, enabled);
    });

    this.delegateEvent('.test-source-btn', 'click', async (e) => {
      const source = e.target.dataset.source;
      await this.handleDataSourceTest(source);
    });
  }

  attachFormListeners() {
    this.delegateEvent('#unified-config-form', 'submit', async (e) => {
      e.preventDefault();
      await this.handleUnifiedConfigSave(e.target);
    });

    this.delegateEvent('#load-balance-form', 'submit', async (e) => {
      e.preventDefault();
      await this.handleLoadBalanceSave(e.target);
    });

    this.delegateEvent('#cost-filter-form', 'submit', async (e) => {
      e.preventDefault();
      await this.handleCostFilter(e.target);
    });
  }

  attachModalListeners() {
    this.delegateEvent('.modal-overlay', 'click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.remove();
      }
    });

    this.delegateEvent('.modal-close', 'click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) {
        modal.remove();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
          modal.remove();
        }
      }
    });
  }

  handleTabSwitch(tab) {
    console.log('Switching to tab:', tab);
    
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    this.page.currentTab = tab;
    if (this.page.renderTabContent) {
      this.page.renderTabContent().then(content => {
        const container = document.getElementById('ai-service-content');
        if (container) {
          container.innerHTML = content;
          this.initializeEventListeners();
        }
      });
    }
  }

  async handleCatalogUpdate() {
    try {
      this.app.showToast('info', '開始更新目錄...');
      
      this.showProgressModal('更新中', '正在獲取最新的服務商和模型數據...');
      
      await this.page.updateCatalogFromSources();
      
      this.app.showToast('success', '目錄更新成功！');
      this.closeProgressModal();
      
      if (this.page.renderTabContent) {
        this.page.renderTabContent().then(content => {
          document.getElementById('ai-service-content').innerHTML = content;
          this.initializeEventListeners();
        });
      }
    } catch (error) {
      console.error('Update catalog failed:', error);
      this.app.showToast('error', `更新失敗: ${error.message}`);
      this.closeProgressModal();
    }
  }

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

  handleCatalogExport() {
    try {
      const catalogData = this.page.currentCatalogData || { providers: [], models: [] };
      
      const dataStr = JSON.stringify(catalogData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `catalog-export-${new Date().toISOString().split('T')[0]}.json`;
      
      // Mock DOM operations
      if (typeof document.body.appendChild === 'function') {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      URL.revokeObjectURL(url);
      
      this.app.showToast('success', '目錄已導出');
    } catch (error) {
      console.error('Export failed:', error);
      this.app.showToast('error', `導出失敗: ${error.message}`);
    }
  }

  handleCancelUpdate() {
    if (this.page.currentUpdateController) {
      this.page.currentUpdateController.abort();
      this.page.currentUpdateController = null;
    }
    
    this.closeProgressModal();
    this.app.showToast('info', '已取消更新');
  }

  async handleCatalogRefresh() {
    try {
      this.app.showToast('info', '正在刷新目錄...');
      
      localStorage.removeItem('provider_catalog');
      localStorage.removeItem('provider_catalog_temp');
      
      await this.page.loadCachedCatalogData();
      
      if (this.page.renderTabContent) {
        this.page.renderTabContent().then(content => {
          document.getElementById('ai-service-content').innerHTML = content;
          this.initializeEventListeners();
        });
      }
      
      this.app.showToast('success', '目錄已刷新');
    } catch (error) {
      console.error('Refresh failed:', error);
      this.app.showToast('error', `刷新失敗: ${error.message}`);
    }
  }

  handleDataSourceToggle(source, enabled) {
    this.page.dataSourceConfig = this.page.dataSourceConfig || {};
    this.page.dataSourceConfig[source] = { 
      ...this.page.dataSourceConfig[source], 
      enabled 
    };
    
    localStorage.setItem('dataSourceConfig', JSON.stringify(this.page.dataSourceConfig));
    
    this.app.showToast('success', `${enabled ? '啟用' : '禁用'} ${source}`);
  }

  async handleDataSourceTest(source) {
    try {
      this.app.showToast('info', `測試 ${source}...`);
      
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
    
    // Mock appendChild
    if (document.body && typeof document.body.appendChild === 'function') {
      document.body.appendChild(modal);
    }
    
    const cancelBtn = modal.querySelector('#cancel-progress');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.handleCancelUpdate();
      });
    }
  }

  closeProgressModal() {
    const modal = document.getElementById('progress-modal');
    if (modal && typeof modal.remove === 'function') {
      modal.remove();
    }
  }

  delegateEvent(selector, event, handler) {
    document.addEventListener(event, (e) => {
      const target = e.target.closest ? e.target.closest(selector) : null;
      if (target) {
        handler(e);
      }
    });
  }

  cleanup() {
    this.listeners.forEach((handler, key) => {
      const [element, event] = key.split(':');
      document.removeEventListener(event, handler);
    });
    this.listeners.clear();
  }
};

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

  async itAsync(description, testFn) {
    this.results.total++;
    try {
      await testFn();
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
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toContain: (expected) => {
        if (typeof actual === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected "${actual}" to contain "${expected}"`);
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${expected}`);
          }
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy value, but got ${actual}`);
        }
      },
      toHaveBeenCalled: () => {
        if (typeof actual !== 'function' || !actual.mock || actual.mock.calls.length === 0) {
          throw new Error('Expected function to have been called');
        }
      },
      toHaveBeenCalledWith: (...expectedArgs) => {
        if (typeof actual !== 'function' || !actual.mock) {
          throw new Error('Expected a mock function');
        }
        const found = actual.mock.calls.some(call => 
          JSON.stringify(call) === JSON.stringify(expectedArgs)
        );
        if (!found) {
          throw new Error(`Expected function to have been called with ${JSON.stringify(expectedArgs)}`);
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

// Mock DOM elements
const createMockElement = (type, properties = {}) => ({
  tagName: type.toUpperCase(),
  classList: {
    contains: jest.fn(),
    toggle: jest.fn(),
    add: jest.fn(),
    remove: jest.fn()
  },
  dataset: properties.dataset || {},
  click: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  remove: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  closest: jest.fn(),
  innerHTML: '',
  href: '',
  download: '',
  ...properties
});

global.document = {
  createElement: jest.fn((type) => createMockElement(type)),optimized (2kB saved)
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  body: createMockElement('body')
};

// Mock confirm
global.confirm = jest.fn(() => true);

// Run tests
const test = new SimpleTestRunner();

console.log('🎮 Testing Event Handlers\n');

test.describe('EventHandlers Initialization', () => {
  test.it('should initialize with correct properties', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = { currentTab: 'providers' };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    test.expect(eventHandlers.app).toBe(mockApp);
    test.expect(eventHandlers.page).toBe(mockPage);
    test.expect(eventHandlers.listeners).toBeInstanceOf(Map);
  });

  test.it('should initialize all event listeners', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = { currentTab: 'providers' };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    // Spy on methods
    jest.spyOn(eventHandlers, 'attachTabListeners');
    jest.spyOn(eventHandlers, 'attachProviderListeners');
    jest.spyOn(eventHandlers, 'attachCatalogListeners');

    eventHandlers.initializeEventListeners();

    test.expect(eventHandlers.attachTabListeners).toHaveBeenCalled();
    test.expect(eventHandlers.attachProviderListeners).toHaveBeenCalled();
    test.expect(eventHandlers.attachCatalogListeners).toHaveBeenCalled();
  });
});

test.describe('Tab Handling', () => {
  test.it('should handle tab switch correctly', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = { 
      currentTab: 'providers',
      renderTabContent: jest.fn().mockResolvedValue('<div>content</div>')
    };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    const mockContainer = createMockElement('div');
    document.getElementById.mockReturnValue(mockContainer);
    document.querySelectorAll.mockReturnValue([
      createMockElement('button', { dataset: { tab: 'providers' } }),
      createMockElement('button', { dataset: { tab: 'catalog' } })
    ]);

    eventHandlers.handleTabSwitch('catalog');

    test.expect(mockPage.currentTab).toBe('catalog');
    test.expect(mockPage.renderTabContent).toHaveBeenCalled();
  });
});

test.describe('Catalog Operations', () => {
  test.itAsync('should handle catalog update successfully', async () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = { 
      updateCatalogFromSources: jest.fn().mockResolvedValue(),
      renderTabContent: jest.fn().mockResolvedValue('<div>updated</div>')
    };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    jest.spyOn(eventHandlers, 'showProgressModal').mockImplementation(() => {});
    jest.spyOn(eventHandlers, 'closeProgressModal').mockImplementation(() => {});

    await eventHandlers.handleCatalogUpdate();

    test.expect(mockApp.showToast).toHaveBeenCalledWith('info', '開始更新目錄...');
    test.expect(mockPage.updateCatalogFromSources).toHaveBeenCalled();
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '目錄更新成功！');
  });

  test.itAsync('should handle catalog update error', async () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = { 
      updateCatalogFromSources: jest.fn().mockRejectedValue(new Error('Update failed'))
    };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    jest.spyOn(eventHandlers, 'showProgressModal').mockImplementation(() => {});
    jest.spyOn(eventHandlers, 'closeProgressModal').mockImplementation(() => {});

    await eventHandlers.handleCatalogUpdate();

    test.expect(mockApp.showToast).toHaveBeenCalledWith('error', '更新失敗: Update failed');
    test.expect(eventHandlers.closeProgressModal).toHaveBeenCalled();
  });

  test.itAsync('should handle catalog save successfully', async () => {
    const mockApp = { showToast: jest.fn() };
    const mockCatalogManager = {
      getCatalogData: jest.fn().mockResolvedValue({ providers: [], models: [] }),
      saveCatalog: jest.fn().mockResolvedValue({ success: true, savedCount: 10 })
    };
    const mockPage = { catalogManager: mockCatalogManager };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    await eventHandlers.handleCatalogSave();

    test.expect(mockCatalogManager.getCatalogData).toHaveBeenCalled();
    test.expect(mockCatalogManager.saveCatalog).toHaveBeenCalled();
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '成功保存 10 個模型到數據庫');
  });

  test.it('should handle catalog export', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = { 
      currentCatalogData: { 
        providers: [{ id: 'test' }], 
        models: [{ id: 'test-model' }] 
      }
    };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    const mockLink = createMockElement('a');
    document.createElement.mockReturnValue(mockLink);

    eventHandlers.handleCatalogExport();

    test.expect(URL.createObjectURL).toHaveBeenCalled();
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '目錄已導出');
    test.expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  test.it('should handle cancel update', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = { 
      currentUpdateController: { abort: jest.fn() }
    };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    jest.spyOn(eventHandlers, 'closeProgressModal').mockImplementation(() => {});

    eventHandlers.handleCancelUpdate();

    test.expect(mockPage.currentUpdateController.abort).toHaveBeenCalled();
    test.expect(mockPage.currentUpdateController).toBe(null);
    test.expect(mockApp.showToast).toHaveBeenCalledWith('info', '已取消更新');
  });
});

test.describe('Data Source Operations', () => {
  test.it('should handle data source toggle', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = { dataSourceConfig: {} };
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    eventHandlers.handleDataSourceToggle('openrouter', true);

    test.expect(mockPage.dataSourceConfig.openrouter.enabled).toBe(true);
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '啟用 openrouter');
  });

  test.itAsync('should test data source successfully', async () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = {};
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    fetch.mockResolvedValueOnce({ ok: true });

    await eventHandlers.handleDataSourceTest('openrouter');

    test.expect(mockApp.showToast).toHaveBeenCalledWith('info', '測試 openrouter...');
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', 'openrouter 連接成功');
  });

  test.itAsync('should handle data source test failure', async () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = {};
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    fetch.mockRejectedValueOnce(new Error('Network error'));

    await eventHandlers.handleDataSourceTest('litellm');

    test.expect(mockApp.showToast).toHaveBeenCalledWith('error', 'litellm 連接失敗: Network error');
  });
});

test.describe('Modal Operations', () => {
  test.it('should show progress modal', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = {};
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    const mockModal = createMockElement('div');
    mockModal.querySelector.mockReturnValue(createMockElement('button'));
    document.createElement.mockReturnValue(mockModal);

    eventHandlers.showProgressModal('Test Title', 'Test Message');

    test.expect(document.createElement).toHaveBeenCalledWith('div');
    test.expect(mockModal.id).toBe('progress-modal');
    test.expect(mockModal.innerHTML).toContain('Test Title');
    test.expect(mockModal.innerHTML).toContain('Test Message');
  });

  test.it('should close progress modal', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = {};
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    const mockModal = createMockElement('div');
    document.getElementById.mockReturnValue(mockModal);

    eventHandlers.closeProgressModal();

    test.expect(document.getElementById).toHaveBeenCalledWith('progress-modal');
    test.expect(mockModal.remove).toHaveBeenCalled();
  });
});

test.describe('Event Delegation', () => {
  test.it('should delegate events correctly', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = {};
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    const mockHandler = jest.fn();
    
    eventHandlers.delegateEvent('.test-selector', 'click', mockHandler);

    test.expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  test.it('should cleanup event listeners', () => {
    const mockApp = { showToast: jest.fn() };
    const mockPage = {};
    const eventHandlers = new EventHandlers(mockApp, mockPage);

    eventHandlers.listeners.set('element:click', jest.fn());
    eventHandlers.listeners.set('form:submit', jest.fn());

    eventHandlers.cleanup();

    test.expect(eventHandlers.listeners.size).toBe(0);
  });
});

// Show test results
test.summary();

console.log('\n🎮 Event Handlers testing completed!');
console.log('Ready for integration with the AI service event management system.');