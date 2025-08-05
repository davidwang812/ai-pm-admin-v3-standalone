/**
 * Vercel API Manager Module
 * 管理 Vercel API 配置和測試功能
 */

export class VercelApiManager {
  constructor() {
    this.vercelApiUrl = localStorage.getItem('vercel_api_url') || '';
  }

  /**
   * 獲取 Vercel API URL
   * @returns {string} Vercel API URL
   */
  getUrl() {
    return this.vercelApiUrl;
  }

  /**
   * 設置 Vercel API URL
   * @param {string} url - Vercel API URL
   */
  setUrl(url) {
    this.vercelApiUrl = url;
    localStorage.setItem('vercel_api_url', url);
  }

  /**
   * 保存 Vercel API URL
   * @param {string} url - Vercel API URL
   * @returns {Object} 保存結果
   */
  saveUrl(url) {
    try {
      // 驗證 URL 格式
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

      // 保存 URL
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

  /**
   * 測試 Vercel API 連接
   * @returns {Promise<Object>} 測試結果
   */
  async test() {
    try {
      if (!this.vercelApiUrl) {
        return {
          success: false,
          message: '請先配置 Vercel API URL'
        };
      }

      // 測試 OpenRouter 端點 - 使用正確的端點
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
      
      // 驗證返回數據格式
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

  /**
   * 從 Vercel API 獲取目錄數據
   * @returns {Promise<Object>} 目錄數據
   */
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

  /**
   * 處理目錄數據
   * @param {Object} data - 原始數據
   * @returns {Object} 處理後的目錄數據
   */
  processCatalogData(data) {
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
      updateTime: new Date().toISOString(),
      source: 'vercel'
    };
  }

  /**
   * 提取服務商列表
   * @param {Array} models - 模型列表
   * @returns {Array} 服務商列表
   */
  extractProviders(models) {
    const providers = new Set();
    models.forEach(model => {
      const providerId = model.id.split('/')[0];
      providers.add(providerId);
    });
    return Array.from(providers);
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
   * 渲染 Vercel API 配置 UI
   * @returns {string} HTML 字符串
   */
  renderConfigUI() {
    return `
      <div class="vercel-config" style="
        background: #f0f7ff;
        border: 1px solid #c3d9ff;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      ">
        <h4 style="margin: 0 0 12px 0; font-size: 16px;">
          🚀 Vercel API 配置
          <span style="
            font-size: 12px;
            background: #52c41a;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            margin-left: 8px;
          ">推荐</span>
        </h4>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
          使用 Vercel API 可以绕过代理限制，直接获取最新的 AI 模型数据
        </p>
        <div style="display: flex; gap: 12px; align-items: center;">
          <input 
            type="url" 
            id="vercel-api-url"
            placeholder="https://your-app.vercel.app" 
            value="${this.vercelApiUrl}"
            style="
              flex: 1;
              padding: 8px 12px;
              border: 1px solid #d9d9d9;
              border-radius: 6px;
              font-size: 14px;
            "
          />
          <button class="btn btn-default" onclick="window.adminV3App.currentPage.saveVercelApiUrl()">
            💾 保存
          </button>
          <button class="btn btn-default" onclick="window.adminV3App.currentPage.testVercelApi()">
            🧪 测试
          </button>
          <a 
            href="/vercel-data-fetcher/README.md" 
            target="_blank"
            class="btn btn-default"
            style="text-decoration: none;"
          >
            📖 部署指南
          </a>
        </div>
        <div id="vercel-api-status" style="margin-top: 8px; font-size: 14px;"></div>
      </div>
    `;
  }

  /**
   * 更新狀態顯示
   * @param {string} message - 狀態消息
   * @param {string} type - 消息類型 (success/error/info)
   */
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
}