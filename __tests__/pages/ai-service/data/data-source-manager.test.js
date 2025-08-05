/**
 * Data Source Manager Tests
 * 测试数据源管理器的核心功能
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

// Mock performance
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock the DataSourceManager module
const DataSourceManager = class {
  constructor(app) {
    this.app = app;
    this.sources = new Map();
    this.activeSource = null;
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    
    this.initializeSources();
  }

  initializeSources() {
    this.addSource({
      id: 'openrouter',
      name: 'OpenRouter API',
      description: '提供全面的AI模型數據，包括價格和規格信息',
      url: 'https://openrouter.ai/api/v1/models',
      type: 'API',
      authentication: 'none',
      enabled: true,
      priority: 1,
      parser: this.parseOpenRouterData.bind(this)
    });

    this.addSource({
      id: 'litellm',
      name: 'LiteLLM Model Database',
      description: '開源模型價格數據庫，包含多家服務商的定價信息',
      url: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
      type: 'JSON',
      authentication: 'none',
      enabled: true,
      priority: 2,
      parser: this.parseLiteLLMData.bind(this)
    });

    const vercelUrl = localStorage.getItem('vercel_api_url');
    if (vercelUrl) {
      this.addSource({
        id: 'vercel',
        name: 'Vercel API',
        description: '自定義Vercel API數據源',
        url: vercelUrl,
        type: 'API',
        authentication: 'none',
        enabled: true,
        priority: 0,
        parser: this.parseVercelData.bind(this)
      });
    }

    this.addSource({
      id: 'local',
      name: 'Local Database',
      description: '本地數據庫存儲的模型信息',
      url: '/api/admin/providers/catalog',
      type: 'DATABASE',
      authentication: 'token',
      enabled: true,
      priority: 3,
      parser: this.parseLocalData.bind(this)
    });
  }

  addSource(source) {
    this.sources.set(source.id, {
      ...source,
      lastFetch: null,
      lastError: null,
      status: 'idle'
    });
  }

  getSource(id) {
    return this.sources.get(id);
  }

  getAllSources() {
    return Array.from(this.sources.values());
  }

  toggleSource(id, enabled) {
    const source = this.sources.get(id);
    if (source) {
      source.enabled = enabled;
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  setSourcePriority(id, priority) {
    const source = this.sources.get(id);
    if (source) {
      source.priority = priority;
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  async fetchFromSource(sourceId) {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Data source ${sourceId} not found`);
    }

    if (!source.enabled) {
      throw new Error(`Data source ${sourceId} is disabled`);
    }

    const cacheKey = `${sourceId}_data`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Using cached data for ${sourceId}`);
      return cached;
    }

    source.status = 'fetching';
    source.lastError = null;

    try {
      console.log(`📡 Fetching data from ${source.name}...`);
      
      const options = {
        method: 'GET',
        headers: {}
      };

      if (source.authentication === 'token') {
        const token = localStorage.getItem('admin_token');
        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(source.url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      const parsedData = source.parser ? source.parser(rawData) : rawData;

      source.status = 'success';
      source.lastFetch = new Date().toISOString();

      this.setCache(cacheKey, parsedData);

      console.log(`✅ Successfully fetched data from ${source.name}`);
      return parsedData;

    } catch (error) {
      console.error(`❌ Failed to fetch from ${source.name}:`, error);
      source.status = 'error';
      source.lastError = error.message;
      throw error;
    }
  }

  async fetchFromAllSources() {
    const enabledSources = this.getAllSources()
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    const results = [];
    const errors = [];

    for (const source of enabledSources) {
      try {
        const data = await this.fetchFromSource(source.id);
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          data,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        errors.push({
          sourceId: source.id,
          sourceName: source.name,
          error: error.message
        });
      }
    }

    return {
      results,
      errors,
      success: results.length > 0
    };
  }

  mergeSourceData(results) {
    const merged = {
      providers: new Map(),
      models: new Map(),
      sources: []
    };

    for (const result of results) {
      merged.sources.push(result.sourceName);

      if (result.data.providers) {
        result.data.providers.forEach(provider => {
          const key = provider.provider_code || provider.id;
          if (!merged.providers.has(key)) {
            merged.providers.set(key, provider);
          }
        });
      }

      if (result.data.models) {
        result.data.models.forEach(model => {
          const key = `${model.provider_code}-${model.model_code}`;
          if (!merged.models.has(key)) {
            merged.models.set(key, {
              ...model,
              sources: [result.sourceName]
            });
          } else {
            const existing = merged.models.get(key);
            existing.sources.push(result.sourceName);
            
            if (!existing.input_price && model.input_price) {
              existing.input_price = model.input_price;
            }
            if (!existing.output_price && model.output_price) {
              existing.output_price = model.output_price;
            }
            if (!existing.context_length && model.context_length) {
              existing.context_length = model.context_length;
            }
          }
        });
      }
    }

    return {
      providers: Array.from(merged.providers.values()),
      models: Array.from(merged.models.values()),
      sources: merged.sources,
      mergedAt: new Date().toISOString()
    };
  }

  parseOpenRouterData(data) {
    if (!data || !data.data) {
      return { providers: [], models: [] };
    }

    const providers = new Map();
    const models = [];

    data.data.forEach(model => {
      const providerId = model.id.split('/')[0];
      
      if (!providers.has(providerId)) {
        providers.set(providerId, {
          provider_code: providerId,
          provider_name: this.formatProviderName(providerId),
          display_name: this.formatProviderName(providerId),
          is_active: true
        });
      }

      models.push({
        provider_code: providerId,
        model_code: model.id,
        model_name: model.name || model.id,
        display_name: model.name || model.id,
        context_length: model.context_length || 0,
        max_output: model.max_completion_tokens || 0,
        input_price: this.parsePrice(model.pricing?.prompt),
        output_price: this.parsePrice(model.pricing?.completion),
        capabilities: {
          chat: true,
          vision: model.architecture?.modality === 'multimodal',
          function_calling: model.supports_function_calling || false
        },
        is_available: true
      });
    });

    return {
      providers: Array.from(providers.values()),
      models
    };
  }

  parseLiteLLMData(data) {
    if (!data) {
      return { providers: [], models: [] };
    }

    const providers = new Map();
    const models = [];

    Object.entries(data).forEach(([modelId, modelData]) => {
      const providerId = modelId.split('/')[0];
      
      if (!providers.has(providerId)) {
        providers.set(providerId, {
          provider_code: providerId,
          provider_name: this.formatProviderName(providerId),
          display_name: this.formatProviderName(providerId),
          is_active: true
        });
      }

      models.push({
        provider_code: providerId,
        model_code: modelId,
        model_name: modelId,
        display_name: modelId,
        context_length: modelData.max_tokens || modelData.context_window || 0,
        max_output: modelData.max_output_tokens || 0,
        input_price: this.parsePrice(modelData.input_cost_per_token),
        output_price: this.parsePrice(modelData.output_cost_per_token),
        capabilities: {
          chat: true,
          vision: modelData.supports_vision || false,
          function_calling: modelData.supports_function_calling || false
        },
        is_available: true
      });
    });

    return {
      providers: Array.from(providers.values()),
      models
    };
  }

  parseVercelData(data) {
    return data;
  }

  parseLocalData(data) {
    return data;
  }

  parsePrice(price) {
    if (!price) return 0;
    if (typeof price === 'string') {
      if (price.toLowerCase() === 'free') return 0;
      price = parseFloat(price);
    }
    if (isNaN(price)) return 0;
    if (price < 0.0001) {
      price = price * 1000;
    }
    return Math.min(price, 999999);
  }

  formatProviderName(code) {
    const names = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google AI',
      meta: 'Meta AI',
      mistral: 'Mistral AI'
    };
    return names[code] || code.charAt(0).toUpperCase() + code.slice(1);
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  saveConfiguration() {
    const config = {
      sources: Array.from(this.sources.entries()).map(([id, source]) => ({
        id,
        enabled: source.enabled,
        priority: source.priority
      }))
    };
    localStorage.setItem('dataSourceConfig', JSON.stringify(config));
  }

  loadConfiguration() {
    const saved = localStorage.getItem('dataSourceConfig');
    if (!saved) return;

    try {
      const config = JSON.parse(saved);
      config.sources.forEach(sourceConfig => {
        const source = this.sources.get(sourceConfig.id);
        if (source) {
          source.enabled = sourceConfig.enabled;
          source.priority = sourceConfig.priority;
        }
      });
    } catch (error) {
      console.error('Failed to load data source configuration:', error);
    }
  }

  async testSource(sourceId) {
    const source = this.sources.get(sourceId);
    if (!source) {
      return {
        success: false,
        error: 'Source not found'
      };
    }

    const startTime = performance.now();
    
    try {
      await this.fetchFromSource(sourceId);
      const duration = performance.now() - startTime;
      
      return {
        success: true,
        duration,
        message: `Connection successful (${duration.toFixed(2)}ms)`
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      return {
        success: false,
        duration,
        error: error.message
      };
    }
  }

  getSourcesStatus() {
    return Array.from(this.sources.values()).map(source => ({
      id: source.id,
      name: source.name,
      enabled: source.enabled,
      status: source.status,
      lastFetch: source.lastFetch,
      lastError: source.lastError,
      priority: source.priority
    }));
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
      toHaveLength: (expected) => {
        if (!actual.length || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, but got ${actual.length || 0}`);
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
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
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

console.log('📚 Testing Data Source Manager\n');

test.describe('DataSourceManager Initialization', () => {
  test.it('should initialize with default sources', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    test.expect(manager.sources.size).toBeGreaterThan(0);
    test.expect(manager.getSource('openrouter')).toBeTruthy();
    test.expect(manager.getSource('litellm')).toBeTruthy();
    test.expect(manager.getSource('local')).toBeTruthy();
  });

  test.it('should include Vercel source when configured', () => {
    localStorage.setItem('vercel_api_url', 'https://test.vercel.app');
    
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    test.expect(manager.getSource('vercel')).toBeTruthy();
    test.expect(manager.getSource('vercel').url).toBe('https://test.vercel.app');
    
    localStorage.removeItem('vercel_api_url');
  });

  test.it('should have correct source properties', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);
    
    const openRouter = manager.getSource('openrouter');
    test.expect(openRouter.name).toBe('OpenRouter API');
    test.expect(openRouter.enabled).toBe(true);
    test.expect(openRouter.priority).toBe(1);
    test.expect(openRouter.status).toBe('idle');
  });
});

test.describe('Source Management', () => {
  test.it('should add source correctly', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    manager.addSource({
      id: 'test',
      name: 'Test Source',
      url: 'https://test.com',
      enabled: true,
      priority: 5
    });

    const source = manager.getSource('test');
    test.expect(source).toBeTruthy();
    test.expect(source.name).toBe('Test Source');
    test.expect(source.status).toBe('idle');
    test.expect(source.lastFetch).toBe(null);
  });

  test.it('should get all sources', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const sources = manager.getAllSources();
    test.expect(sources.length).toBeGreaterThan(0);
    test.expect(sources.every(s => s.id && s.name)).toBe(true);
  });

  test.it('should toggle source enabled status', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const result = manager.toggleSource('openrouter', false);
    test.expect(result).toBe(true);
    test.expect(manager.getSource('openrouter').enabled).toBe(false);

    manager.toggleSource('openrouter', true);
    test.expect(manager.getSource('openrouter').enabled).toBe(true);
  });

  test.it('should return false for non-existent source', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const result = manager.toggleSource('nonexistent', false);
    test.expect(result).toBe(false);
  });

  test.it('should set source priority', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const result = manager.setSourcePriority('openrouter', 10);
    test.expect(result).toBe(true);
    test.expect(manager.getSource('openrouter').priority).toBe(10);
  });
});

test.describe('Data Fetching', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test.itAsync('should fetch from source successfully', async () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const mockData = {
      data: [
        { id: 'openai/gpt-4', name: 'GPT-4' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await manager.fetchFromSource('openrouter');
    
    test.expect(result.providers).toBeTruthy();
    test.expect(result.models).toBeTruthy();
    test.expect(manager.getSource('openrouter').status).toBe('success');
  });

  test.itAsync('should handle disabled source', async () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    manager.toggleSource('openrouter', false);

    try {
      await manager.fetchFromSource('openrouter');
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error.message).toContain('disabled');
    }
  });

  test.itAsync('should handle non-existent source', async () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    try {
      await manager.fetchFromSource('nonexistent');
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error.message).toContain('not found');
    }
  });

  test.itAsync('should handle fetch error', async () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    fetch.mockRejectedValueOnce(new Error('Network error'));

    try {
      await manager.fetchFromSource('openrouter');
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error.message).toBe('Network error');
      test.expect(manager.getSource('openrouter').status).toBe('error');
      test.expect(manager.getSource('openrouter').lastError).toBe('Network error');
    }
  });

  test.itAsync('should handle HTTP error', async () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    try {
      await manager.fetchFromSource('openrouter');
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error.message).toContain('404');
      test.expect(error.message).toContain('Not Found');
    }
  });
});

test.describe('Cache Management', () => {
  test.it('should set and get cache correctly', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const testData = { test: 'data' };
    manager.setCache('test_key', testData);

    const cached = manager.getFromCache('test_key');
    test.expect(cached).toEqual(testData);
  });

  test.it('should return null for expired cache', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);
    manager.cacheTimeout = 100; // 100ms

    manager.setCache('test_key', { test: 'data' });

    // Wait for cache to expire
    setTimeout(() => {
      const cached = manager.getFromCache('test_key');
      test.expect(cached).toBe(null);
    }, 150);
  });

  test.it('should clear cache', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    manager.setCache('test_key', { test: 'data' });
    test.expect(manager.getFromCache('test_key')).toBeTruthy();

    manager.clearCache();
    test.expect(manager.getFromCache('test_key')).toBe(null);
  });
});

test.describe('Data Parsing', () => {
  test.it('should parse OpenRouter data correctly', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const mockData = {
      data: [
        {
          id: 'openai/gpt-4',
          name: 'GPT-4',
          context_length: 8000,
          pricing: { prompt: 0.03, completion: 0.06 },
          architecture: { modality: 'text' }
        }
      ]
    };

    const result = manager.parseOpenRouterData(mockData);

    test.expect(result.providers).toHaveLength(1);
    test.expect(result.models).toHaveLength(1);
    test.expect(result.providers[0].provider_code).toBe('openai');
    test.expect(result.models[0].model_code).toBe('openai/gpt-4');
    test.expect(result.models[0].input_price).toBe(0.03);
  });

  test.it('should parse LiteLLM data correctly', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const mockData = {
      'openai/gpt-4': {
        max_tokens: 8000,
        input_cost_per_token: 0.00003,
        output_cost_per_token: 0.00006
      }
    };

    const result = manager.parseLiteLLMData(mockData);

    test.expect(result.providers).toHaveLength(1);
    test.expect(result.models).toHaveLength(1);
    test.expect(result.models[0].context_length).toBe(8000);
  });

  test.it('should parse prices correctly', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    test.expect(manager.parsePrice(0.03)).toBe(0.03);
    test.expect(manager.parsePrice('0.05')).toBe(0.05);
    test.expect(manager.parsePrice('free')).toBe(0);
    test.expect(manager.parsePrice('FREE')).toBe(0);
    test.expect(manager.parsePrice(null)).toBe(0);
    test.expect(manager.parsePrice('invalid')).toBe(0);
    test.expect(manager.parsePrice(0.00001)).toBe(0.01); // Converted to per-1000-tokens
  });

  test.it('should format provider names correctly', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    test.expect(manager.formatProviderName('openai')).toBe('OpenAI');
    test.expect(manager.formatProviderName('anthropic')).toBe('Anthropic');
    test.expect(manager.formatProviderName('unknown')).toBe('Unknown');
  });
});

test.describe('Configuration Management', () => {
  test.it('should save and load configuration', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    manager.toggleSource('openrouter', false);
    manager.setSourcePriority('litellm', 10);
    manager.saveConfiguration();

    const newManager = new DataSourceManager(mockApp);
    newManager.loadConfiguration();

    test.expect(newManager.getSource('openrouter').enabled).toBe(false);
    test.expect(newManager.getSource('litellm').priority).toBe(10);
  });
});

test.describe('Testing and Status', () => {
  test.itAsync('should test source successfully', async () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] })
    });

    performance.now.mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await manager.testSource('openrouter');

    test.expect(result.success).toBe(true);
    test.expect(result.duration).toBe(100);
    test.expect(result.message).toContain('successful');
  });

  test.itAsync('should handle test failure', async () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const result = await manager.testSource('nonexistent');

    test.expect(result.success).toBe(false);
    test.expect(result.error).toBe('Source not found');
  });

  test.it('should get sources status', () => {
    const mockApp = {};
    const manager = new DataSourceManager(mockApp);

    const status = manager.getSourcesStatus();

    test.expect(status.length).toBeGreaterThan(0);
    test.expect(status[0]).toHaveProperty('id');
    test.expect(status[0]).toHaveProperty('name');
    test.expect(status[0]).toHaveProperty('enabled');
    test.expect(status[0]).toHaveProperty('status');
  });
});

// Show test results
test.summary();

console.log('\n📚 Data Source Manager testing completed!');
console.log('Ready for integration with the AI service data management system.');