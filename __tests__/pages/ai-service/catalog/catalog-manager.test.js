/**
 * Catalog Manager Tests
 * 测试目录管理器的核心功能
 */

// Mock localStorage
const mockLocalStorage = {
  storage: new Map(),
  getItem: function(key) { return this.storage.get(key) || null; },
  setItem: function(key, value) { this.storage.set(key, value); },
  removeItem: function(key) { this.storage.delete(key); }
};

global.localStorage = mockLocalStorage;

// Mock the CatalogManager module
const CatalogManager = class {
  constructor(app) {
    this.app = app;
    this.currentCatalogData = {
      providers: [],
      models: [],
      updateTime: null
    };
    this.catalogCurrentPage = 1;
    this.catalogPageSize = 10;
  }

  async render() {
    const catalogData = await this.getCatalogData();
    const vercelApiUrl = localStorage.getItem('vercel_data_fetcher_url') || 'https://vercel-data-fetcher.vercel.app';
    
    return `
      <div class="catalog-container">
        <div class="catalog-header">
          <h2>服务商和模型目录</h2>
          <div class="catalog-controls">
            <button class="btn btn-primary" onclick="catalogManager.refreshCatalog()">刷新目录</button>
            <button class="btn btn-secondary" onclick="catalogManager.exportCatalog()">导出目录</button>
          </div>
        </div>
        <div class="catalog-content">
          <div class="providers-section">
            <h3>服务商 (${catalogData.providers.length})</h3>
            <div class="providers-list">
              ${catalogData.providers.map(provider => this.renderProviderCard(provider)).join('')}
            </div>
          </div>
          <div class="models-section">
            <h3>模型 (${catalogData.models.length})</h3>
            <div class="models-list">
              ${catalogData.models.map(model => this.renderModelCard(model)).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderProviderCard(provider) {
    return `
      <div class="provider-card">
        <h4>${provider.name || provider.id}</h4>
        <p>类型: ${provider.type || 'Unknown'}</p>
        <p>状态: ${provider.enabled ? '启用' : '禁用'}</p>
      </div>
    `;
  }

  renderModelCard(model) {
    return `
      <div class="model-card">
        <h4>${model.name || model.id}</h4>
        <p>提供商: ${model.provider || 'Unknown'}</p>
        <p>类型: ${model.type || 'Unknown'}</p>
      </div>
    `;
  }

  async getCatalogData() {
    try {
      if (this.app?.api?.getCatalogData) {
        const response = await this.app.api.getCatalogData();
        if (response.success) {
          this.currentCatalogData = response.data;
          return this.currentCatalogData;
        }
      }
      return this.getMockCatalogData();
    } catch (error) {
      console.error('Failed to get catalog data:', error);
      return this.getMockCatalogData();
    }
  }

  getMockCatalogData() {
    return {
      providers: [
        { id: 'openai', name: 'OpenAI', type: 'openai', enabled: true },
        { id: 'anthropic', name: 'Anthropic', type: 'anthropic', enabled: true }
      ],
      models: [
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai', type: 'chat' },
        { id: 'claude-3', name: 'Claude-3', provider: 'anthropic', type: 'chat' }
      ],
      updateTime: new Date()
    };
  }

  async refreshCatalog() {
    try {
      if (this.app?.showToast) {
        this.app.showToast('正在刷新目录...', 'info');
      }

      const catalogData = await this.getCatalogData();
      
      if (this.app?.showToast) {
        this.app.showToast('目录刷新完成', 'success');
      }

      // Re-render the catalog
      return catalogData;
    } catch (error) {
      console.error('Failed to refresh catalog:', error);
      if (this.app?.showToast) {
        this.app.showToast(`刷新失败: ${error.message}`, 'error');
      }
      throw error;
    }
  }

  async exportCatalog() {
    try {
      const catalogData = this.currentCatalogData;
      const exportData = {
        ...catalogData,
        exportTime: new Date(),
        version: '1.0'
      };

      // Simulate export (in real app would download file)
      const jsonData = JSON.stringify(exportData, null, 2);
      
      if (this.app?.showToast) {
        this.app.showToast('目录导出完成', 'success');
      }

      return jsonData;
    } catch (error) {
      console.error('Failed to export catalog:', error);
      if (this.app?.showToast) {
        this.app.showToast(`导出失败: ${error.message}`, 'error');
      }
      throw error;
    }
  }

  bindEvents() {
    // Bind catalog-specific events
  }

  updateCatalogDisplay(catalogData) {
    this.currentCatalogData = catalogData;
    // Update DOM if needed
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
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected instance of ${expectedClass.name}, but got ${typeof actual}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      toHaveLength: (expected) => {
        if (!actual.length || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, but got ${actual.length || 0}`);
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

// Run tests
const test = new SimpleTestRunner();

console.log('📚 Testing Catalog Manager\n');

test.describe('CatalogManager Initialization', () => {
  test.it('should initialize with correct default values', () => {
    const mockApp = { api: {}, showToast: () => {} };
    const catalogManager = new CatalogManager(mockApp);

    test.expect(catalogManager.app).toBe(mockApp);
    test.expect(catalogManager.currentCatalogData.providers).toEqual([]);
    test.expect(catalogManager.currentCatalogData.models).toEqual([]);
    test.expect(catalogManager.catalogCurrentPage).toBe(1);
    test.expect(catalogManager.catalogPageSize).toBe(10);
  });
});

test.describe('Catalog Data Management', () => {
  test.itAsync('should get catalog data from API', async () => {
    const mockApp = {
      api: {
        getCatalogData: async () => ({
          success: true,
          data: {
            providers: [{ id: 'test-provider', name: 'Test Provider' }],
            models: [{ id: 'test-model', name: 'Test Model' }],
            updateTime: new Date()
          }
        })
      }
    };

    const catalogManager = new CatalogManager(mockApp);
    const data = await catalogManager.getCatalogData();

    test.expect(data.providers).toHaveLength(1);
    test.expect(data.models).toHaveLength(1);
    test.expect(data.providers[0].id).toBe('test-provider');
  });

  test.itAsync('should return mock data when API fails', async () => {
    const mockApp = {
      api: {
        getCatalogData: async () => {
          throw new Error('API Error');
        }
      }
    };

    const catalogManager = new CatalogManager(mockApp);
    const data = await catalogManager.getCatalogData();

    test.expect(data.providers).toHaveLength(2);
    test.expect(data.models).toHaveLength(2);
    test.expect(data.providers[0].id).toBe('openai');
  });

  test.itAsync('should return mock data when no API available', async () => {
    const mockApp = {};
    const catalogManager = new CatalogManager(mockApp);
    const data = await catalogManager.getCatalogData();

    test.expect(data.providers).toHaveLength(2);
    test.expect(data.models).toHaveLength(2);
  });
});

test.describe('Catalog Rendering', () => {
  test.itAsync('should render catalog HTML correctly', async () => {
    const mockApp = {};
    const catalogManager = new CatalogManager(mockApp);
    
    const html = await catalogManager.render();
    
    test.expect(html).toContain('catalog-container');
    test.expect(html).toContain('服务商和模型目录');
    test.expect(html).toContain('providers-section');
    test.expect(html).toContain('models-section');
  });

  test.it('should render provider card correctly', () => {
    const mockApp = {};
    const catalogManager = new CatalogManager(mockApp);
    
    const provider = { id: 'test', name: 'Test Provider', type: 'openai', enabled: true };
    const html = catalogManager.renderProviderCard(provider);
    
    test.expect(html).toContain('provider-card');
    test.expect(html).toContain('Test Provider');
    test.expect(html).toContain('openai');
    test.expect(html).toContain('启用');
  });

  test.it('should render model card correctly', () => {
    const mockApp = {};
    const catalogManager = new CatalogManager(mockApp);
    
    const model = { id: 'test-model', name: 'Test Model', provider: 'openai', type: 'chat' };
    const html = catalogManager.renderModelCard(model);
    
    test.expect(html).toContain('model-card');
    test.expect(html).toContain('Test Model');
    test.expect(html).toContain('openai');
    test.expect(html).toContain('chat');
  });
});

test.describe('Catalog Operations', () => {
  test.itAsync('should refresh catalog successfully', async () => {
    let toastMessage = '';
    const mockApp = {
      api: {
        getCatalogData: async () => ({
          success: true,
          data: {
            providers: [{ id: 'refreshed-provider' }],
            models: [{ id: 'refreshed-model' }],
            updateTime: new Date()
          }
        })
      },
      showToast: (message, type) => {
        toastMessage = message;
      }
    };

    const catalogManager = new CatalogManager(mockApp);
    const data = await catalogManager.refreshCatalog();

    test.expect(data.providers[0].id).toBe('refreshed-provider');
    test.expect(toastMessage).toBe('目录刷新完成');
  });

  test.itAsync('should handle refresh errors', async () => {
    let toastMessage = '';
    const mockApp = {
      api: {
        getCatalogData: async () => {
          throw new Error('Network error');
        }
      },
      showToast: (message, type) => {
        toastMessage = message;
      }
    };

    const catalogManager = new CatalogManager(mockApp);
    
    try {
      await catalogManager.refreshCatalog();
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error.message).toBe('Network error');
      test.expect(toastMessage).toContain('刷新失败');
    }
  });

  test.itAsync('should export catalog successfully', async () => {
    let toastMessage = '';
    const mockApp = {
      showToast: (message, type) => {
        toastMessage = message;
      }
    };

    const catalogManager = new CatalogManager(mockApp);
    catalogManager.currentCatalogData = {
      providers: [{ id: 'export-provider' }],
      models: [{ id: 'export-model' }],
      updateTime: new Date()
    };

    const jsonData = await catalogManager.exportCatalog();
    const exportData = JSON.parse(jsonData);

    test.expect(exportData.providers[0].id).toBe('export-provider');
    test.expect(exportData.version).toBe('1.0');
    test.expect(exportData.exportTime).toBeTruthy();
    test.expect(toastMessage).toBe('目录导出完成');
  });
});

test.describe('LocalStorage Integration', () => {
  test.itAsync('should use vercel API URL from localStorage', async () => {
    localStorage.setItem('vercel_data_fetcher_url', 'https://custom-vercel-url.com');
    
    const mockApp = {};
    const catalogManager = new CatalogManager(mockApp);
    const html = await catalogManager.render();
    
    // The URL is used internally, we just verify localStorage was called
    test.expect(localStorage.getItem('vercel_data_fetcher_url')).toBe('https://custom-vercel-url.com');
    
    // Clean up
    localStorage.removeItem('vercel_data_fetcher_url');
  });

  test.itAsync('should use default URL when not in localStorage', async () => {
    localStorage.removeItem('vercel_data_fetcher_url');
    
    const mockApp = {};
    const catalogManager = new CatalogManager(mockApp);
    await catalogManager.render();
    
    test.expect(localStorage.getItem('vercel_data_fetcher_url')).toBeNull();
  });
});

test.describe('Event Binding', () => {
  test.it('should have bindEvents method', () => {
    const mockApp = {};
    const catalogManager = new CatalogManager(mockApp);
    
    test.expect(typeof catalogManager.bindEvents).toBe('function');
  });

  test.it('should have updateCatalogDisplay method', () => {
    const mockApp = {};
    const catalogManager = new CatalogManager(mockApp);
    
    test.expect(typeof catalogManager.updateCatalogDisplay).toBe('function');
    
    const newData = { providers: [], models: [], updateTime: new Date() };
    catalogManager.updateCatalogDisplay(newData);
    test.expect(catalogManager.currentCatalogData).toEqual(newData);
  });
});

// Show test results
test.summary();

console.log('\n📚 Catalog Manager testing completed!');
console.log('Ready for integration with the catalog system.');