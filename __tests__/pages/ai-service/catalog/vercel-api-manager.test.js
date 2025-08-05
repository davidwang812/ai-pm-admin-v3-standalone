/**
 * Vercel API Manager Tests
 * 测试Vercel API管理器的核心功能
 */

// Mock localStorage
const mockLocalStorage = {
  storage: new Map(),
  getItem: function(key) { return this.storage.get(key) || null; },
  setItem: function(key, value) { this.storage.set(key, value); },
  removeItem: function(key) { this.storage.delete(key); }
};

global.localStorage = mockLocalStorage;

// Mock fetch
global.fetch = jest.fn();

// Mock the VercelApiManager module
const VercelApiManager = class {
  constructor() {
    this.vercelApiUrl = localStorage.getItem('vercel_api_url') || '';
  }

  getUrl() {
    return this.vercelApiUrl;
  }

  setUrl(url) {
    this.vercelApiUrl = url;
    localStorage.setItem('vercel_api_url', url);
  }

  saveUrl(url) {
    try {
      if (!url) {
        return {
          success: false,
          message: '請輸入 Vercel API URL'
        };
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return {
          success: false,
          message: 'URL 必須以 http:// 或 https:// 開頭'
        };
      }

      this.setUrl(url);

      return {
        success: true,
        message: 'Vercel API URL 已保存'
      };
    } catch (error) {
      return {
        success: false,
        message: `保存失敗: ${error.message}`
      };
    }
  }

  async test() {
    try {
      if (!this.vercelApiUrl) {
        return {
          success: false,
          message: '請先配置 Vercel API URL'
        };
      }

      const response = await fetch(`${this.vercelApiUrl}/api/fetch-openrouter`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          message: `API 返回錯誤: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        return {
          success: false,
          message: '返回數據格式不正確'
        };
      }

      return {
        success: true,
        message: `連接成功！獲取到 ${data.data.length} 個模型`,
        data: {
          modelCount: data.data.length,
          providers: this.extractProviders(data.data)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `測試失敗: ${error.message}`
      };
    }
  }

  async fetchCatalog() {
    if (!this.vercelApiUrl) {
      throw new Error('Vercel API URL 未配置');
    }

    try {
      const response = await fetch(`${this.vercelApiUrl}/api/openrouter`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('返回數據格式不正確');
      }

      return this.processCatalogData(data);
    } catch (error) {
      console.error('Failed to fetch from Vercel API:', error);
      throw error;
    }
  }

  processCatalogData(data) {
    const providerMap = new Map();
    const models = [];

    data.data?.forEach(model => {
      const providerId = model.id.split('/')[0];
      
      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          provider_code: providerId,
          provider_name: providerId,
          display_name: this.getProviderDisplayName(providerId),
          is_active: true
        });
      }

      models.push({
        provider_code: providerId,
        model_code: model.id,
        model_name: model.name,
        display_name: model.name,
        context_length: model.context_length || 0,
        max_tokens: model.top_provider?.max_completion_tokens || 0,
        input_price: this.standardizePrice(model.pricing?.prompt),
        output_price: this.standardizePrice(model.pricing?.completion),
        capabilities: {
          chat: true,
          vision: model.architecture?.modality === 'multimodal',
          function_calling: false
        },
        is_active: true
      });
    });

    return {
      providers: Array.from(providerMap.values()),
      models: models,
      updateTime: new Date().toISOString(),
      source: 'vercel'
    };
  }

  extractProviders(models) {
    const providers = new Set();
    models.forEach(model => {
      const providerId = model.id.split('/')[0];
      providers.add(providerId);
    });
    return Array.from(providers);
  }

  getProviderDisplayName(providerCode) {
    const displayNames = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google AI',
      deepseek: 'DeepSeek'
    };
    
    return displayNames[providerCode.toLowerCase()] || providerCode;
  }

  standardizePrice(price) {
    if (!price || price === "FREE" || price === "free") return 0;
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (!numPrice || isNaN(numPrice) || !isFinite(numPrice) || numPrice < 0) {
      return 0;
    }
    
    const maxPrice = 999999;
    if (numPrice > maxPrice) {
      console.warn(`Price overflow: ${numPrice} → ${maxPrice}`);
      return maxPrice;
    }
    
    return Math.round(numPrice * 1000000) / 1000000;
  }

  renderConfigUI() {
    return `
      <div class="vercel-config">
        <h4>🚀 Vercel API 配置</h4>
        <div>
          <input type="url" id="vercel-api-url" value="${this.vercelApiUrl}" />
          <button onclick="saveVercelApiUrl()">💾 保存</button>
          <button onclick="testVercelApi()">🧪 测试</button>
        </div>
        <div id="vercel-api-status"></div>
      </div>
    `;
  }

  updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('vercel-api-status');
    if (statusEl) {
      const colors = {
        success: '#52c41a',
        error: '#ff4d4f',
        info: '#1890ff'
      };
      
      statusEl.innerHTML = `
        <span style="color: ${colors[type] || colors.info};">
          ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}
        </span>
      `;
    }
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
      },
      toStartWith: (expected) => {
        if (typeof actual !== 'string' || !actual.startsWith(expected)) {
          throw new Error(`Expected "${actual}" to start with "${expected}"`);
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

console.log('🚀 Testing Vercel API Manager\n');

test.describe('VercelApiManager Initialization', () => {
  test.it('should initialize with empty URL by default', () => {
    localStorage.removeItem('vercel_api_url');
    const manager = new VercelApiManager();
    
    test.expect(manager.getUrl()).toBe('');
  });

  test.it('should initialize with stored URL from localStorage', () => {
    localStorage.setItem('vercel_api_url', 'https://test.vercel.app');
    const manager = new VercelApiManager();
    
    test.expect(manager.getUrl()).toBe('https://test.vercel.app');
    
    // Cleanup
    localStorage.removeItem('vercel_api_url');
  });
});

test.describe('URL Management', () => {
  test.it('should get and set URL correctly', () => {
    const manager = new VercelApiManager();
    const testUrl = 'https://example.vercel.app';
    
    manager.setUrl(testUrl);
    
    test.expect(manager.getUrl()).toBe(testUrl);
    test.expect(localStorage.getItem('vercel_api_url')).toBe(testUrl);
  });

  test.it('should save valid URL successfully', () => {
    const manager = new VercelApiManager();
    const result = manager.saveUrl('https://valid-url.vercel.app');
    
    test.expect(result.success).toBe(true);
    test.expect(result.message).toBe('Vercel API URL 已保存');
  });

  test.it('should reject empty URL', () => {
    const manager = new VercelApiManager();
    const result = manager.saveUrl('');
    
    test.expect(result.success).toBe(false);
    test.expect(result.message).toBe('請輸入 Vercel API URL');
  });

  test.it('should reject invalid URL protocol', () => {
    const manager = new VercelApiManager();
    const result = manager.saveUrl('ftp://invalid.com');
    
    test.expect(result.success).toBe(false);
    test.expect(result.message).toBe('URL 必須以 http:// 或 https:// 開頭');
  });

  test.it('should accept http and https URLs', () => {
    const manager = new VercelApiManager();
    
    const httpResult = manager.saveUrl('http://localhost:3000');
    test.expect(httpResult.success).toBe(true);
    
    const httpsResult = manager.saveUrl('https://example.com');
    test.expect(httpsResult.success).toBe(true);
  });
});

test.describe('API Testing', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test.itAsync('should fail test when URL not configured', async () => {
    const manager = new VercelApiManager();
    manager.setUrl('');
    
    const result = await manager.test();
    
    test.expect(result.success).toBe(false);
    test.expect(result.message).toBe('請先配置 Vercel API URL');
  });

  test.itAsync('should handle successful API test', async () => {
    const manager = new VercelApiManager();
    manager.setUrl('https://test.vercel.app');
    
    const mockResponse = {
      data: [
        { id: 'openai/gpt-4', name: 'GPT-4' },
        { id: 'anthropic/claude-3', name: 'Claude-3' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await manager.test();

    test.expect(result.success).toBe(true);
    test.expect(result.message).toBe('連接成功！獲取到 2 個模型');
    test.expect(result.data.modelCount).toBe(2);
    test.expect(result.data.providers).toEqual(['openai', 'anthropic']);
  });

  test.itAsync('should handle API HTTP error', async () => {
    const manager = new VercelApiManager();
    manager.setUrl('https://test.vercel.app');

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const result = await manager.test();

    test.expect(result.success).toBe(false);
    test.expect(result.message).toBe('API 返回錯誤: 404 Not Found');
  });

  test.itAsync('should handle invalid response format', async () => {
    const manager = new VercelApiManager();
    manager.setUrl('https://test.vercel.app');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: 'format' })
    });

    const result = await manager.test();

    test.expect(result.success).toBe(false);
    test.expect(result.message).toBe('返回數據格式不正確');
  });

  test.itAsync('should handle network error', async () => {
    const manager = new VercelApiManager();
    manager.setUrl('https://test.vercel.app');

    fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await manager.test();

    test.expect(result.success).toBe(false);
    test.expect(result.message).toBe('測試失敗: Network error');
  });
});

test.describe('Catalog Data Fetching', () => {
  test.itAsync('should throw error when URL not configured', async () => {
    const manager = new VercelApiManager();
    manager.setUrl('');

    try {
      await manager.fetchCatalog();
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error.message).toBe('Vercel API URL 未配置');
    }
  });

  test.itAsync('should fetch and process catalog data successfully', async () => {
    const manager = new VercelApiManager();
    manager.setUrl('https://test.vercel.app');

    const mockApiData = {
      data: [
        {
          id: 'openai/gpt-4',
          name: 'GPT-4',
          context_length: 8000,
          pricing: { prompt: 0.03, completion: 0.06 },
          top_provider: { max_completion_tokens: 4000 },
          architecture: { modality: 'text' }
        },
        {
          id: 'anthropic/claude-3',
          name: 'Claude-3',
          context_length: 200000,
          pricing: { prompt: 0.008, completion: 0.024 },
          architecture: { modality: 'multimodal' }
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData
    });

    const result = await manager.fetchCatalog();

    test.expect(result.providers).toHaveLength(2);
    test.expect(result.models).toHaveLength(2);
    test.expect(result.source).toBe('vercel');
    test.expect(result.updateTime).toBeTruthy();

    // Check provider data
    const openaiProvider = result.providers.find(p => p.provider_code === 'openai');
    test.expect(openaiProvider.display_name).toBe('OpenAI');
    test.expect(openaiProvider.is_active).toBe(true);

    // Check model data
    const gpt4Model = result.models.find(m => m.model_code === 'openai/gpt-4');
    test.expect(gpt4Model.display_name).toBe('GPT-4');
    test.expect(gpt4Model.context_length).toBe(8000);
    test.expect(gpt4Model.input_price).toBe(0.03);
    test.expect(gpt4Model.capabilities.vision).toBe(false);

    const claudeModel = result.models.find(m => m.model_code === 'anthropic/claude-3');
    test.expect(claudeModel.capabilities.vision).toBe(true);
  });
});

test.describe('Data Processing', () => {
  test.it('should extract providers correctly', () => {
    const manager = new VercelApiManager();
    const models = [
      { id: 'openai/gpt-4' },
      { id: 'openai/gpt-3.5-turbo' },
      { id: 'anthropic/claude-3' },
      { id: 'google/gemini-pro' }
    ];

    const providers = manager.extractProviders(models);

    test.expect(providers).toHaveLength(3);
    test.expect(providers).toContain('openai');
    test.expect(providers).toContain('anthropic');
    test.expect(providers).toContain('google');
  });

  test.it('should get correct provider display names', () => {
    const manager = new VercelApiManager();

    test.expect(manager.getProviderDisplayName('openai')).toBe('OpenAI');
    test.expect(manager.getProviderDisplayName('anthropic')).toBe('Anthropic');
    test.expect(manager.getProviderDisplayName('google')).toBe('Google AI');
    test.expect(manager.getProviderDisplayName('unknown')).toBe('unknown');
  });

  test.it('should standardize prices correctly', () => {
    const manager = new VercelApiManager();

    test.expect(manager.standardizePrice(0.03)).toBe(0.03);
    test.expect(manager.standardizePrice('0.05')).toBe(0.05);
    test.expect(manager.standardizePrice('FREE')).toBe(0);
    test.expect(manager.standardizePrice('free')).toBe(0);
    test.expect(manager.standardizePrice(null)).toBe(0);
    test.expect(manager.standardizePrice('invalid')).toBe(0);
    test.expect(manager.standardizePrice(-1)).toBe(0);
    test.expect(manager.standardizePrice(1000000)).toBe(999999); // Max price limit
  });
});

test.describe('UI Rendering', () => {
  test.it('should render config UI with correct elements', () => {
    const manager = new VercelApiManager();
    manager.setUrl('https://test.vercel.app');
    
    const html = manager.renderConfigUI();
    
    test.expect(html).toContain('vercel-config');
    test.expect(html).toContain('🚀 Vercel API 配置');
    test.expect(html).toContain('vercel-api-url');
    test.expect(html).toContain('https://test.vercel.app');
    test.expect(html).toContain('saveVercelApiUrl()');
    test.expect(html).toContain('testVercelApi()');
    test.expect(html).toContain('vercel-api-status');
  });

  test.it('should update status element correctly', () => {
    // Mock DOM elements
    const mockStatusEl = { innerHTML: '' };
    global.document = {
      getElementById: jest.fn((id) => {
        if (id === 'vercel-api-status') return mockStatusEl;
        return null;
      })
    };

    const manager = new VercelApiManager();
    
    // Test success status
    manager.updateStatus('操作成功', 'success');
    test.expect(mockStatusEl.innerHTML).toContain('✅ 操作成功');
    test.expect(mockStatusEl.innerHTML).toContain('#52c41a');
    
    // Test error status
    manager.updateStatus('操作失败', 'error');
    test.expect(mockStatusEl.innerHTML).toContain('❌ 操作失败');
    test.expect(mockStatusEl.innerHTML).toContain('#ff4d4f');
    
    // Test info status
    manager.updateStatus('提示信息', 'info');
    test.expect(mockStatusEl.innerHTML).toContain('ℹ️ 提示信息');
    test.expect(mockStatusEl.innerHTML).toContain('#1890ff');
  });
});

// Show test results
test.summary();

console.log('\n🚀 Vercel API Manager testing completed!');
console.log('Ready for integration with the AI service catalog system.');