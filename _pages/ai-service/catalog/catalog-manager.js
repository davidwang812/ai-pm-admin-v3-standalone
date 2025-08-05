/**
 * Catalog Manager Module
 * 管理 AI 服務商和模型目錄的所有功能
 */

export class CatalogManager {
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

  /**
   * Render the catalog view
   * @returns {Promise<string>} HTML string
   */
  async render() {
    console.log('📚 CatalogManager.render() starting...');
    
    // Get catalog data
    const catalogData = await this.getCatalogData();
    
    // Get Vercel API URL from localStorage
    const vercelApiUrl = localStorage.getItem('vercel_data_fetcher_url') || 'https://vercel-data-fetcher.vercel.app';
    
    return `
      <div class="catalog-container">
        <!-- Vercel API Configuration -->
        <div class="vercel-config" style="
          background: #f0f7ff;
          border: 1px solid #c3d9ff;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        ">
          <h4 style="margin: 0 0 12px 0; font-size: 16px;">
            🚀 Vercel Data Fetcher 配置
            <span style="
              font-size: 12px;
              background: #52c41a;
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              margin-left: 8px;
            ">推薦</span>
          </h4>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
            使用 Vercel API 可以繞過代理限制，直接獲取最新的 AI 模型數據
          </p>
          <div style="display: flex; gap: 12px; align-items: center;">
            <input 
              type="url" 
              id="vercel-data-fetcher-url"
              placeholder="https://vercel-data-fetcher.vercel.app" 
              value="${vercelApiUrl}"
              style="
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #d9d9d9;
                border-radius: 6px;
                font-size: 14px;
              "
            />
            <button class="btn btn-default" onclick="window.adminV3App.currentPage.saveVercelDataFetcherUrl()">
              💾 保存
            </button>
            <button class="btn btn-default" onclick="window.adminV3App.currentPage.testVercelDataFetcher()">
              🧪 測試
            </button>
            <a 
              href="https://github.com/davidwang812/AI_Product_Manager/tree/main/vercel-data-fetcher" 
              target="_blank"
              class="btn btn-default"
              style="text-decoration: none;"
            >
              📖 部署指南
            </a>
          </div>
          <div id="vercel-data-fetcher-status" style="margin-top: 8px; font-size: 14px;"></div>
        </div>
        
        <div class="catalog-header">
          <h3>提供商目錄</h3>
          <div class="catalog-actions">
            <button class="btn btn-primary" id="btn-refresh-catalog">
              🔄 刷新目錄
            </button>
            <button class="btn btn-success" id="btn-save-catalog">
              💾 保存到數據庫
            </button>
          </div>
        </div>
        
        <div class="catalog-stats">
          <div class="stat-card">
            <div class="stat-label">提供商数量</div>
            <div class="stat-value">${catalogData.providers ? catalogData.providers.length : 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">模型总数</div>
            <div class="stat-value">${catalogData.models ? catalogData.models.length : 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">最后更新</div>
            <div class="stat-value">${catalogData.updateTime ? new Date(catalogData.updateTime).toLocaleString() : '未更新'}</div>
          </div>
        </div>
        
        <div class="catalog-search">
          <input type="text" id="catalog-search" class="form-control" placeholder="搜索提供商或模型...">
        </div>
        
        <div class="catalog-list">
          ${this.renderCatalogList(catalogData)}
        </div>
      </div>
    `;
  }

  renderCatalogList(catalogData) {
    if (!catalogData.providers || catalogData.providers.length === 0) {
      return '<div class="empty-state">暂无目录数据，请刷新获取</div>';
    }
    
    // Group models by provider - handle both provider_code and code field names
    const modelsByProvider = {};
    if (catalogData.models) {
      catalogData.models.forEach(model => {
        const providerCode = model.provider_code || model.provider;
        if (providerCode) {
          if (!modelsByProvider[providerCode]) {
            modelsByProvider[providerCode] = [];
          }
          modelsByProvider[providerCode].push(model);
        }
      });
    }
    
    return `
      <div class="catalog-table-wrapper">
        <table class="catalog-table">
          <thead>
            <tr>
              <th>服务商</th>
              <th>状态</th>
              <th>模型数量</th>
              <th>主要模型</th>
              <th>价格范围</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${catalogData.providers.map(provider => {
              // Standardize provider data to handle field mapping inconsistencies
              const normalizedProvider = this.normalizeProviderData(provider);
              const providerCode = normalizedProvider.providerCode;
              const models = modelsByProvider[providerCode] || [];
              const activeModels = models.filter(m => m.is_active !== false);
              const priceRange = this.calculatePriceRange(models);
              
              return `
                <tr class="provider-row">
                  <td>
                    <div class="provider-info">
                      <strong>${normalizedProvider.displayName}</strong>
                      ${normalizedProvider.description ? `<br><small class="text-muted">${normalizedProvider.description}</small>` : ''}
                    </div>
                  </td>
                  <td>
                    <span class="status-badge ${normalizedProvider.isActive ? 'status-active' : 'status-inactive'}">
                      ${normalizedProvider.isActive ? '✅ 启用' : '⭕ 禁用'}
                    </span>
                  </td>
                  <td>
                    <span class="model-count">${activeModels.length} / ${models.length}</span>
                  </td>
                  <td>
                    <div class="model-list">
                      ${models.slice(0, 2).map(model => `
                        <div class="model-chip">
                          ${model.display_name || model.model_code}
                        </div>
                      `).join('')}
                      ${models.length > 2 ? `<span class="more-models">+${models.length - 2}</span>` : ''}
                    </div>
                  </td>
                  <td>
                    <div class="price-range">
                      <small>输入: $${priceRange.minInput.toFixed(4)} - $${priceRange.maxInput.toFixed(4)}</small><br>
                      <small>输出: $${priceRange.minOutput.toFixed(4)} - $${priceRange.maxOutput.toFixed(4)}</small>
                    </div>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn btn-sm btn-default" onclick="window.adminV3App.viewProviderModels('${providerCode}')">
                        📊 查看
                      </button>
                      <button class="btn btn-sm ${normalizedProvider.isActive ? 'btn-warning' : 'btn-success'}" 
                              onclick="window.adminV3App.toggleCatalogProvider('${providerCode}', ${!normalizedProvider.isActive})">
                        ${normalizedProvider.isActive ? '⏸️ 禁用' : '▶️ 启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  calculatePriceRange(models) {
    if (!models || models.length === 0) {
      return { minInput: 0, maxInput: 0, minOutput: 0, maxOutput: 0 };
    }
    
    const inputPrices = models.map(m => m.input_price || 0).filter(p => p > 0);
    const outputPrices = models.map(m => m.output_price || 0).filter(p => p > 0);
    
    return {
      minInput: inputPrices.length > 0 ? Math.min(...inputPrices) : 0,
      maxInput: inputPrices.length > 0 ? Math.max(...inputPrices) : 0,
      minOutput: outputPrices.length > 0 ? Math.min(...outputPrices) : 0,
      maxOutput: outputPrices.length > 0 ? Math.max(...outputPrices) : 0
    };
  }

  bindEvents() {
    console.log('📚 Binding CatalogManager events');
    // Events are bound in the parent component
  }

  handleSearch(searchTerm) {
    console.log('Searching for:', searchTerm);
    // Implement search logic
  }

  async fetchCatalogData() {
    console.log('Fetching catalog data...');
    return await this.getCatalogData(true);
  }

  async saveCatalogToDB() {
    console.log('Saving catalog to database...');
    try {
      await this.app.api.saveCatalogData(this.currentCatalogData);
      this.app.showToast('success', '目录已保存到数据库');
    } catch (error) {
      this.app.showToast('error', '保存失败: ' + error.message);
    }
  }

  /**
   * 獲取目錄數據
   * @param {boolean} forceRefresh - 是否強制刷新
   * @returns {Promise<Object>} 目錄數據
   */
  async getCatalogData(forceRefresh = false) {
    if (!forceRefresh && this.currentCatalogData.providers.length > 0) {
      return this.currentCatalogData;
    }

    // 1. 嘗試從本地緩存獲取
    const cachedCatalog = localStorage.getItem('provider_catalog');
    if (cachedCatalog && !forceRefresh) {
      try {
        const data = JSON.parse(cachedCatalog);
        this.currentCatalogData = data;
        return data;
      } catch (e) {
        console.error('Failed to parse cached catalog:', e);
      }
    }

    // 2. 從 API 獲取
    try {
      const result = await Promise.race([
        this.app.api.getProviderCatalog(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      if (result && result.success && result.providers) {
        this.currentCatalogData = result;
        localStorage.setItem('provider_catalog', JSON.stringify(result));
        return result;
      }
    } catch (error) {
      console.warn('Failed to fetch catalog from API:', error.message);
    }

    // 3. 使用默認數據
    return this.getDefaultCatalogData();
  }

  /**
   * 保存目錄到數據庫
   * @param {Object} catalogData - 要保存的目錄數據
   * @returns {Promise<Object>} 保存結果
   */
  async saveCatalog(catalogData) {
    try {
      // 標準化價格數據
      if (catalogData.models) {
        catalogData.models = catalogData.models.map(model => ({
          ...model,
          input_price: this.standardizePrice(model.input_price),
          output_price: this.standardizePrice(model.output_price)
        }));
      }

      // 保存到數據庫
      const result = await this.app.api.saveCatalog(catalogData);
      
      if (result.success) {
        // 更新本地緩存
        this.currentCatalogData = catalogData;
        localStorage.setItem('provider_catalog', JSON.stringify(catalogData));
      }

      return result;
    } catch (error) {
      console.error('Failed to save catalog:', error);
      throw error;
    }
  }

  /**
   * 從 OpenRouter 更新目錄
   * @returns {Promise<Object>} 更新結果
   */
  async updateFromOpenRouter() {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.processOpenRouterData(data);
    } catch (error) {
      console.error('Failed to fetch from OpenRouter:', error);
      throw error;
    }
  }

  /**
   * 從 Vercel API 更新目錄
   * @param {string} vercelUrl - Vercel API URL
   * @returns {Promise<Object>} 更新結果
   */
  async updateFromVercel(vercelUrl) {
    try {
      const response = await fetch(`${vercelUrl}/api/openrouter`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.processOpenRouterData(data);
    } catch (error) {
      console.error('Failed to fetch from Vercel:', error);
      throw error;
    }
  }

  /**
   * 處理 OpenRouter 數據格式
   * @param {Object} data - OpenRouter API 響應
   * @returns {Object} 標準化的目錄數據
   */
  processOpenRouterData(data) {
    const providerMap = new Map();
    const models = [];

    data.data?.forEach(model => {
      const providerId = model.id.split('/')[0];
      
      // 收集服務商
      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          provider_code: providerId,
          provider_name: providerId,
          display_name: this.getProviderDisplayName(providerId),
          is_active: true
        });
      }

      // 處理模型
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
      updateTime: new Date().toISOString()
    };
  }

  /**
   * 標準化價格
   * @param {number|string} price - 原始價格
   * @returns {number} 標準化後的價格
   */
  standardizePrice(price) {
    if (!price || price === "FREE" || price === "free") return 0;
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (!numPrice || isNaN(numPrice) || !isFinite(numPrice) || numPrice < 0) {
      return 0;
    }
    
    // 限制最大值為 999999
    const maxPrice = 999999;
    if (numPrice > maxPrice) {
      console.warn(`Price overflow: ${numPrice} → ${maxPrice}`);
      return maxPrice;
    }
    
    // 保留 6 位小數
    return Math.round(numPrice * 1000000) / 1000000;
  }

  /**
   * 獲取服務商顯示名稱
   * @param {string} providerCode - 服務商代碼
   * @returns {string} 顯示名稱
   */
  getProviderDisplayName(providerCode) {
    const displayNames = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google AI',
      deepseek: 'DeepSeek',
      meta: 'Meta AI',
      mistralai: 'Mistral AI',
      cohere: 'Cohere',
      qwen: 'Qwen',
      'zhipu': 'Zhipu AI',
      'moonshot': 'Moonshot AI',
      'baidu': 'Baidu AI',
      'alibaba': 'Alibaba AI',
      'together': 'Together AI',
      'perplexity': 'Perplexity',
      'groq': 'Groq',
      'databricks': 'Databricks',
      'azure': 'Azure OpenAI'
    };
    
    return displayNames[providerCode.toLowerCase()] || providerCode;
  }

  /**
   * 獲取默認目錄數據
   * @returns {Object} 默認目錄數據
   */
  getDefaultCatalogData() {
    // 最小化的默認數據，僅包含必要的服務商
    return {
      providers: [
        { 
          provider_code: 'openai', 
          display_name: 'OpenAI',
          description: 'Leading AI research company',
          is_active: true 
        },
        { 
          provider_code: 'anthropic', 
          display_name: 'Anthropic',
          description: 'AI safety company',
          is_active: true 
        },
        { 
          provider_code: 'google', 
          display_name: 'Google AI',
          description: 'Google AI with Gemini models',
          is_active: true 
        }
      ],
      models: [
        {
          provider_code: 'openai',
          model_code: 'gpt-4o',
          display_name: 'GPT-4o',
          context_length: 128000,
          input_price: 0.005,
          output_price: 0.015,
          is_active: true
        },
        {
          provider_code: 'anthropic',
          model_code: 'claude-3-5-sonnet-20241022',
          display_name: 'Claude 3.5 Sonnet',
          context_length: 200000,
          input_price: 0.003,
          output_price: 0.015,
          is_active: true
        },
        {
          provider_code: 'google',
          model_code: 'gemini-1.5-pro',
          display_name: 'Gemini 1.5 Pro',
          context_length: 1048576,
          input_price: 0.00125,
          output_price: 0.005,
          is_active: true
        }
      ],
      updateTime: new Date().toISOString()
    };
  }

  /**
   * 保存 Vercel Data Fetcher URL
   */
  saveVercelDataFetcherUrl() {
    const urlInput = document.getElementById('vercel-data-fetcher-url');
    const statusEl = document.getElementById('vercel-data-fetcher-status');
    
    if (!urlInput || !statusEl) return;
    
    const url = urlInput.value.trim();
    
    if (!url) {
      statusEl.innerHTML = '<span style="color: #ff4d4f;">❌ 請輸入 Vercel API URL</span>';
      return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      statusEl.innerHTML = '<span style="color: #ff4d4f;">❌ URL 必須以 http:// 或 https:// 開頭</span>';
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('vercel_data_fetcher_url', url);
    statusEl.innerHTML = '<span style="color: #52c41a;">✅ Vercel Data Fetcher URL 已保存</span>';
    
    // Clear status after 3 seconds
    setTimeout(() => {
      statusEl.innerHTML = '';
    }, 3000);
  }
  
  /**
   * 測試 Vercel Data Fetcher 連接
   */
  async testVercelDataFetcher() {
    const urlInput = document.getElementById('vercel-data-fetcher-url');
    const statusEl = document.getElementById('vercel-data-fetcher-status');
    
    if (!urlInput || !statusEl) return;
    
    const url = urlInput.value.trim();
    
    if (!url) {
      statusEl.innerHTML = '<span style="color: #ff4d4f;">❌ 請先配置 Vercel Data Fetcher URL</span>';
      return;
    }
    
    statusEl.innerHTML = '<span style="color: #1890ff;">⏳ 正在測試連接...</span>';
    
    try {
      // Fix: Ensure proper URL construction without double slashes
      const apiUrl = url.endsWith('/') ? `${url}api/fetch-openrouter` : `${url}/api/fetch-openrouter`;
      // Test OpenRouter endpoint
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.models && data.models.length > 0) {
        statusEl.innerHTML = `
          <span style="color: #52c41a;">
            ✅ 連接成功！獲取到 ${data.models.length} 個模型
            <br>數據源: ${data.source}
            <br>更新時間: ${new Date(data.timestamp).toLocaleString('zh-TW')}
          </span>
        `;
        
        // Auto-save the URL if test is successful
        localStorage.setItem('vercel_data_fetcher_url', url);
        
        // Optionally refresh catalog with new data
        setTimeout(() => {
          if (confirm('測試成功！是否立即刷新目錄數據？')) {
            this.refreshCatalogFromVercel();
          }
        }, 1000);
      } else {
        throw new Error('返回數據格式不正確');
      }
    } catch (error) {
      statusEl.innerHTML = `<span style="color: #ff4d4f;">❌ 測試失敗: ${error.message}</span>`;
    }
  }
  
  /**
   * 從 Vercel Data Fetcher 刷新目錄
   */
  async refreshCatalogFromVercel() {
    const url = localStorage.getItem('vercel_data_fetcher_url');
    if (!url) {
      alert('請先配置 Vercel Data Fetcher URL');
      return;
    }
    
    try {
      // Show loading
      const contentEl = document.getElementById('app-content');
      if (contentEl) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'catalog-loading';
        loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 9999;';
        loadingDiv.innerHTML = '⏳ 正在從 Vercel 獲取數據...';
        document.body.appendChild(loadingDiv);
      }
      
      // Fix: Ensure proper URL construction without double slashes
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      
      // Fetch from both endpoints
      const headers = {
        'Accept': 'application/json'
      };
      
      const [openRouterResponse, liteLLMResponse] = await Promise.allSettled([
        fetch(`${baseUrl}/api/fetch-openrouter`, { headers }),
        fetch(`${baseUrl}/api/fetch-litellm`, { headers })
      ]);
      
      const models = [];
      const providers = new Map();
      
      // Process OpenRouter data
      if (openRouterResponse.status === 'fulfilled' && openRouterResponse.value.ok) {
        const openRouterData = await openRouterResponse.value.json();
        if (openRouterData.success && openRouterData.models) {
          openRouterData.models.forEach(model => {
            models.push(model);
            if (!providers.has(model.provider)) {
              providers.set(model.provider, {
                provider_code: model.provider,
                display_name: this.getProviderDisplayName(model.provider),
                is_active: true
              });
            }
          });
        }
      }
      
      // Process LiteLLM data
      if (liteLLMResponse.status === 'fulfilled' && liteLLMResponse.value.ok) {
        const liteLLMData = await liteLLMResponse.value.json();
        if (liteLLMData.success && liteLLMData.models) {
          liteLLMData.models.forEach(model => {
            // Check if model already exists
            const exists = models.some(m => m.id === model.id);
            if (!exists) {
              models.push(model);
              if (!providers.has(model.provider)) {
                providers.set(model.provider, {
                  provider_code: model.provider,
                  display_name: this.getProviderDisplayName(model.provider),
                  is_active: true
                });
              }
            }
          });
        }
      }
      
      // Update catalog data
      this.currentCatalogData = {
        providers: Array.from(providers.values()),
        models: models,
        updateTime: new Date().toISOString(),
        source: 'vercel'
      };
      
      // Remove loading
      const loadingDiv = document.getElementById('catalog-loading');
      if (loadingDiv) {
        loadingDiv.remove();
      }
      
      // Refresh display
      await this.app.router.handleRoute();
      
      alert(`✅ 成功獲取數據！\n提供商: ${providers.size} 個\n模型: ${models.length} 個`);
      
    } catch (error) {
      console.error('Failed to refresh from Vercel:', error);
      alert(`刷新失敗: ${error.message}`);
      
      // Remove loading
      const loadingDiv = document.getElementById('catalog-loading');
      if (loadingDiv) {
        loadingDiv.remove();
      }
    }
  }

  /**
   * 比較兩個目錄數據集
   * @param {Object} currentData - 當前數據
   * @param {Object} newData - 新數據
   * @returns {Object} 比較結果
   */
  compareCatalogs(currentData, newData) {
    const result = {
      hasChanges: false,
      providers: {
        new: [],
        updated: [],
        removed: []
      },
      models: {
        new: [],
        updated: [],
        removed: [],
        priceChanges: []
      }
    };

    // 比較服務商
    const currentProviders = new Map(currentData.providers?.map(p => [p.provider_code, p]) || []);
    const newProviders = new Map(newData.providers?.map(p => [p.provider_code, p]) || []);

    newProviders.forEach((provider, code) => {
      if (!currentProviders.has(code)) {
        result.providers.new.push(provider);
      } else if (JSON.stringify(currentProviders.get(code)) !== JSON.stringify(provider)) {
        result.providers.updated.push(provider);
      }
    });

    currentProviders.forEach((provider, code) => {
      if (!newProviders.has(code)) {
        result.providers.removed.push(provider);
      }
    });

    // 比較模型
    const currentModels = new Map(currentData.models?.map(m => [`${m.provider_code}:${m.model_code}`, m]) || []);
    const newModels = new Map(newData.models?.map(m => [`${m.provider_code}:${m.model_code}`, m]) || []);

    newModels.forEach((model, key) => {
      const currentModel = currentModels.get(key);
      if (!currentModel) {
        result.models.new.push(model);
      } else {
        // 檢查價格變化
        if (currentModel.input_price !== model.input_price || currentModel.output_price !== model.output_price) {
          result.models.priceChanges.push({
            ...model,
            old_input_price: currentModel.input_price,
            old_output_price: currentModel.output_price
          });
        }
        if (JSON.stringify(currentModel) !== JSON.stringify(model)) {
          result.models.updated.push(model);
        }
      }
    });

    currentModels.forEach((model, key) => {
      if (!newModels.has(key)) {
        result.models.removed.push(model);
      }
    });

    // 計算是否有變化
    result.hasChanges = 
      result.providers.new.length > 0 ||
      result.providers.updated.length > 0 ||
      result.providers.removed.length > 0 ||
      result.models.new.length > 0 ||
      result.models.updated.length > 0 ||
      result.models.removed.length > 0;

    return result;
  }

  /**
   * 獲取服務商的模型列表
   * @param {string} providerCode - 服務商代碼
   * @returns {Array} 模型列表
   */
  getProviderModels(providerCode) {
    return this.currentCatalogData.models?.filter(m => m.provider_code === providerCode) || [];
  }

  /**
   * 切換服務商狀態
   * @param {string} providerCode - 服務商代碼
   * @param {boolean} isActive - 是否啟用
   */
  async toggleProvider(providerCode, isActive) {
    const provider = this.currentCatalogData.providers?.find(p => p.provider_code === providerCode);
    if (provider) {
      provider.is_active = isActive;
      await this.saveCatalog(this.currentCatalogData);
    }
  }

  /**
   * 搜索模型
   * @param {string} query - 搜索關鍵詞
   * @returns {Array} 匹配的模型列表
   */
  searchModels(query) {
    if (!query) return this.currentCatalogData.models || [];
    
    const lowerQuery = query.toLowerCase();
    return this.currentCatalogData.models?.filter(model => 
      model.model_code.toLowerCase().includes(lowerQuery) ||
      model.display_name?.toLowerCase().includes(lowerQuery) ||
      model.provider_code.toLowerCase().includes(lowerQuery)
    ) || [];
  }

  /**
   * 獲取統計信息
   * @returns {Object} 統計信息
   */
  getStatistics() {
    const providers = this.currentCatalogData.providers || [];
    const models = this.currentCatalogData.models || [];

    return {
      totalProviders: providers.length,
      activeProviders: providers.filter(p => p.is_active).length,
      totalModels: models.length,
      activeModels: models.filter(m => m.is_active).length,
      freeModels: models.filter(m => m.input_price === 0 && m.output_price === 0).length,
      avgInputPrice: models.length > 0 
        ? models.reduce((sum, m) => sum + (m.input_price || 0), 0) / models.length 
        : 0,
      avgOutputPrice: models.length > 0
        ? models.reduce((sum, m) => sum + (m.output_price || 0), 0) / models.length
        : 0,
      updateTime: this.currentCatalogData.updateTime
    };
  }

  /**
   * 標準化提供商數據，解決字段映射不一致問題
   * @param {Object} provider - 原始提供商數據
   * @returns {Object} 標準化後的提供商數據
   */
  normalizeProviderData(provider) {
    // 安全檢查
    if (!provider || typeof provider !== 'object') {
      console.warn('CatalogManager: 無效的提供商數據', provider);
      return {
        providerCode: 'unknown',
        displayName: 'Unknown Provider',
        description: '',
        isActive: false
      };
    }

    // 統一字段映射
    const providerCode = provider.provider_code || provider.code || provider.id || 'unknown';
    const displayName = provider.display_name || 
                       provider.provider_name || 
                       provider.name || 
                       providerCode;
    const description = provider.description || provider.desc || '';
    const isActive = provider.is_active !== undefined ? 
                    provider.is_active : 
                    (provider.active !== undefined ? provider.active : true);

    return {
      providerCode: String(providerCode),
      displayName: String(displayName),
      description: String(description),
      isActive: Boolean(isActive),
      // 保留原始數據以備需要
      _original: provider
    };
  }
}