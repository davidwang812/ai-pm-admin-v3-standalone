/**
 * Data Source Manager
 * 管理AI服務的數據源配置和獲取
 */

export class DataSourceManager {
  constructor(app) {
    this.app = app;
    this.sources = new Map();
    this.activeSource = null;
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    
    // Initialize default sources
    this.initializeSources();
  }

  /**
   * 初始化數據源
   */
  initializeSources() {
    // OpenRouter API
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

    // LiteLLM Database
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

    // Vercel API (if configured)
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

    // Local Database
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

  /**
   * 添加數據源
   */
  addSource(source) {
    this.sources.set(source.id, {
      ...source,
      lastFetch: null,
      lastError: null,
      status: 'idle'
    });
  }

  /**
   * 獲取數據源
   */
  getSource(id) {
    return this.sources.get(id);
  }

  /**
   * 獲取所有數據源
   */
  getAllSources() {
    return Array.from(this.sources.values());
  }

  /**
   * 啟用/禁用數據源
   */
  toggleSource(id, enabled) {
    const source = this.sources.get(id);
    if (source) {
      source.enabled = enabled;
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  /**
   * 設置數據源優先級
   */
  setSourcePriority(id, priority) {
    const source = this.sources.get(id);
    if (source) {
      source.priority = priority;
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  /**
   * 從數據源獲取數據
   */
  async fetchFromSource(sourceId) {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Data source ${sourceId} not found`);
    }

    if (!source.enabled) {
      throw new Error(`Data source ${sourceId} is disabled`);
    }

    // Check cache
    const cacheKey = `${sourceId}_data`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Using cached data for ${sourceId}`);
      return cached;
    }

    // Update status
    source.status = 'fetching';
    source.lastError = null;

    try {
      console.log(`📡 Fetching data from ${source.name}...`);
      
      let response;
      const options = {
        method: 'GET',
        headers: {}
      };

      // Add authentication if needed
      if (source.authentication === 'token') {
        const token = localStorage.getItem('admin_token');
        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`;
        }
      }

      response = await fetch(source.url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      const parsedData = source.parser ? source.parser(rawData) : rawData;

      // Update source status
      source.status = 'success';
      source.lastFetch = new Date().toISOString();

      // Cache the data
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

  /**
   * 從所有啟用的數據源獲取數據
   */
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

  /**
   * 合併多個數據源的數據
   */
  mergeSourceData(results) {
    const merged = {
      providers: new Map(),
      models: new Map(),
      sources: []
    };

    for (const result of results) {
      merged.sources.push(result.sourceName);

      // Merge providers
      if (result.data.providers) {
        result.data.providers.forEach(provider => {
          const key = provider.provider_code || provider.id;
          if (!merged.providers.has(key)) {
            merged.providers.set(key, provider);
          }
        });
      }

      // Merge models with source tracking
      if (result.data.models) {
        result.data.models.forEach(model => {
          const key = `${model.provider_code}-${model.model_code}`;
          if (!merged.models.has(key)) {
            merged.models.set(key, {
              ...model,
              sources: [result.sourceName]
            });
          } else {
            // Update with better data if available
            const existing = merged.models.get(key);
            existing.sources.push(result.sourceName);
            
            // Use the most complete data
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

  /**
   * 解析OpenRouter數據
   */
  parseOpenRouterData(data) {
    if (!data || !data.data) {
      return { providers: [], models: [] };
    }

    const providers = new Map();
    const models = [];

    data.data.forEach(model => {
      // Extract provider from model ID
      const providerId = model.id.split('/')[0];
      
      // Add provider if not exists
      if (!providers.has(providerId)) {
        providers.set(providerId, {
          provider_code: providerId,
          provider_name: this.formatProviderName(providerId),
          display_name: this.formatProviderName(providerId),
          is_active: true
        });
      }

      // Add model
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

  /**
   * 解析LiteLLM數據
   */
  parseLiteLLMData(data) {
    if (!data) {
      return { providers: [], models: [] };
    }

    const providers = new Map();
    const models = [];

    Object.entries(data).forEach(([modelId, modelData]) => {
      // Extract provider from model ID
      const providerId = modelId.split('/')[0];
      
      // Add provider if not exists
      if (!providers.has(providerId)) {
        providers.set(providerId, {
          provider_code: providerId,
          provider_name: this.formatProviderName(providerId),
          display_name: this.formatProviderName(providerId),
          is_active: true
        });
      }

      // Add model
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

  /**
   * 解析Vercel數據
   */
  parseVercelData(data) {
    // Vercel data is usually already in the correct format
    return data;
  }

  /**
   * 解析本地數據
   */
  parseLocalData(data) {
    // Local data is already in the correct format
    return data;
  }

  /**
   * 解析價格
   */
  parsePrice(price) {
    if (!price) return 0;
    if (typeof price === 'string') {
      if (price.toLowerCase() === 'free') return 0;
      price = parseFloat(price);
    }
    if (isNaN(price)) return 0;
    // Convert per-token price to per-1000-tokens if needed
    if (price < 0.0001) {
      price = price * 1000;
    }
    return Math.min(price, 999999);
  }

  /**
   * 格式化提供商名稱
   */
  formatProviderName(code) {
    const names = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google AI',
      meta: 'Meta AI',
      mistral: 'Mistral AI',
      cohere: 'Cohere',
      together: 'Together AI',
      deepseek: 'DeepSeek',
      qwen: 'Qwen'
    };
    return names[code] || code.charAt(0).toUpperCase() + code.slice(1);
  }

  /**
   * 緩存管理
   */
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

  /**
   * 保存配置
   */
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

  /**
   * 加載配置
   */
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

  /**
   * 測試數據源連接
   */
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

  /**
   * 獲取數據源狀態
   */
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
}