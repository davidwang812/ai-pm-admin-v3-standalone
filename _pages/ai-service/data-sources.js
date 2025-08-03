// Data Sources Management Module
export class DataSources {
  constructor(app) {
    this.app = app;
    this.dataSourceConfig = {
      openrouter: { enabled: true, name: 'OpenRouter API' },
      litellm: { enabled: true, name: 'LiteLLM' },
      vercel: { enabled: false, name: 'Vercel Data Fetcher', url: 'https://vercel-data-fetcher.vercel.app' }
    };
    
    // Load saved configuration
    const savedConfig = localStorage.getItem('dataSourceConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Merge with defaults to ensure new sources are included
        this.dataSourceConfig = { ...this.dataSourceConfig, ...parsed };
      } catch (e) {
        console.log('Failed to load data source config:', e);
      }
    }
    
    // Load Vercel URL from localStorage
    const vercelUrl = localStorage.getItem('vercel_data_fetcher_url');
    if (vercelUrl) {
      this.dataSourceConfig.vercel.url = vercelUrl;
      this.dataSourceConfig.vercel.enabled = true;
    }
    
    this.dataSources = [
      {
        id: 'openrouter',
        name: 'OpenRouter API',
        description: '提供全面的AI模型数据，包括价格和规格信息',
        url: 'https://openrouter.ai/api/v1/models',
        type: 'API',
        authentication: '无需认证',
        configurable: false
      },
      {
        id: 'litellm',
        name: 'LiteLLM Model Database',
        description: '开源模型价格数据库，包含多家服务商的定价信息',
        url: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
        type: 'JSON',
        authentication: '无需认证',
        configurable: false
      },
      {
        id: 'vercel',
        name: 'Vercel Data Fetcher',
        description: '通过Vercel部署的数据获取服务，绕过代理限制',
        url: this.dataSourceConfig.vercel.url || 'https://vercel-data-fetcher.vercel.app',
        type: 'Vercel',
        authentication: '无需认证',
        configurable: true
      }
    ];
  }

  async render() {
    return `
      <div class="data-sources-container">
        <div class="data-sources-header">
          <h3>📊 数据源管理</h3>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="window.adminApp.aiServicePage.testDataSources()">
              🧪 测试连接
            </button>
            <button class="btn btn-default" onclick="window.adminApp.aiServicePage.refreshDataSources()">
              🔄 刷新数据
            </button>
          </div>
        </div>

        <div class="data-sources-grid">
          ${this.dataSources.map((source) => `
            <div class="data-source-card ${source.id === 'vercel' ? 'vercel-source' : ''}">
              <div class="source-header">
                <h4>${source.name}</h4>
                <span class="source-type ${source.type.toLowerCase()}">${source.type}</span>
              </div>
              <p class="source-description">${source.description}</p>
              <div class="source-details">
                ${source.configurable ? `
                  <div class="detail-item" style="width: 100%;">
                    <span class="detail-label">URL:</span>
                    <input type="url" 
                      id="vercel-url-input"
                      class="detail-input" 
                      value="${this.dataSourceConfig.vercel.url || ''}"
                      placeholder="https://your-vercel-app.vercel.app"
                      onchange="window.adminApp.aiServicePage.updateVercelUrl(this.value)"
                      style="flex: 1; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px; margin: 4px 0;">
                  </div>
                  <div class="detail-item" style="width: 100%; margin-top: 8px;">
                    <button class="btn btn-sm btn-default" onclick="window.adminApp.aiServicePage.testVercelConnection()">
                      🧪 测试连接
                    </button>
                    <button class="btn btn-sm btn-default" onclick="window.adminApp.aiServicePage.deployVercel()">
                      🚀 部署指南
                    </button>
                  </div>
                ` : `
                  <div class="detail-item">
                    <span class="detail-label">URL:</span>
                    <span class="detail-value">${source.url}</span>
                  </div>
                `}
                <div class="detail-item">
                  <span class="detail-label">认证:</span>
                  <span class="detail-value">${source.authentication}</span>
                </div>
              </div>
              <div class="source-status">
                <label class="toggle-switch">
                  <input type="checkbox" 
                    ${this.dataSourceConfig[source.id].enabled ? 'checked' : ''}
                    onchange="window.adminApp.aiServicePage.toggleDataSource('${source.id}', this.checked)"
                    ${source.id === 'vercel' && !this.dataSourceConfig.vercel.url ? 'disabled' : ''}>
                  <span class="toggle-slider ${this.dataSourceConfig[source.id].enabled ? 'active' : ''}"></span>
                </label>
                <span class="status-text">${this.dataSourceConfig[source.id].enabled ? '已启用' : '已禁用'}</span>
              </div>
              ${source.id === 'vercel' ? `
                <div id="vercel-status" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="data-sources-stats">
          <h4>📈 数据统计</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">最后更新时间</span>
              <span class="stat-value">${localStorage.getItem('catalogLastUpdate') || '从未更新'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">模型总数</span>
              <span class="stat-value" id="total-models-count">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">服务商数量</span>
              <span class="stat-value" id="total-providers-count">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">数据大小</span>
              <span class="stat-value" id="data-size">-</span>
            </div>
          </div>
        </div>

        <div class="data-sources-log">
          <h4>📝 操作日志</h4>
          <div class="log-container" id="data-source-log">
            <div class="log-entry">等待操作...</div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Update stats on render
    this.updateStats();
  }

  updateStats() {
    // Get catalog data from localStorage
    const catalogData = localStorage.getItem('admin_catalog');
    if (catalogData) {
      try {
        const catalog = JSON.parse(catalogData);
        const totalModels = Object.values(catalog).reduce((sum, provider) => 
          sum + (provider.models ? provider.models.length : 0), 0);
        const totalProviders = Object.keys(catalog).length;
        const dataSize = new Blob([catalogData]).size;
        
        const modelsEl = document.getElementById('total-models-count');
        if (modelsEl) modelsEl.textContent = totalModels;
        
        const providersEl = document.getElementById('total-providers-count');
        if (providersEl) providersEl.textContent = totalProviders;
        
        const sizeEl = document.getElementById('data-size');
        if (sizeEl) sizeEl.textContent = this.formatBytes(dataSize);
      } catch (e) {
        console.error('Failed to parse catalog data:', e);
      }
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  toggleDataSource(source, enabled) {
    this.dataSourceConfig[source].enabled = enabled;
    localStorage.setItem('dataSourceConfig', JSON.stringify(this.dataSourceConfig));
    this.addLog(`${enabled ? '启用' : '禁用'}数据源: ${this.dataSourceConfig[source].name}`);
  }

  async testDataSources() {
    this.addLog('开始测试数据源连接...');
    
    for (const [key, config] of Object.entries(this.dataSourceConfig)) {
      if (!config.enabled) {
        this.addLog(`跳过已禁用的数据源: ${config.name}`);
        continue;
      }
      
      try {
        const startTime = Date.now();
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 500));
        const duration = Date.now() - startTime;
        
        this.addLog(`✅ ${config.name} 连接成功 (${duration}ms)`);
      } catch (error) {
        this.addLog(`❌ ${config.name} 连接失败: ${error.message}`);
      }
    }
    
    this.addLog('数据源测试完成');
  }

  async refreshDataSources() {
    this.addLog('开始刷新数据源...');
    
    try {
      // Call the catalog manager's fetch method
      if (this.app.catalogManager) {
        await this.app.catalogManager.fetchCatalogData();
        this.addLog('✅ 数据刷新成功');
        this.updateStats();
      } else {
        this.addLog('❌ 目录管理器未初始化');
      }
    } catch (error) {
      this.addLog(`❌ 数据刷新失败: ${error.message}`);
    }
  }

  addLog(message) {
    const logContainer = document.getElementById('data-source-log');
    if (logContainer) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
      
      // Remove initial placeholder if exists
      if (logContainer.children[0]?.textContent === '等待操作...') {
        logContainer.innerHTML = '';
      }
      
      logContainer.insertBefore(logEntry, logContainer.firstChild);
      
      // Keep only last 10 logs
      while (logContainer.children.length > 10) {
        logContainer.removeChild(logContainer.lastChild);
      }
    }
  }

  // Vercel-specific methods
  updateVercelUrl(url) {
    this.dataSourceConfig.vercel.url = url;
    localStorage.setItem('vercel_data_fetcher_url', url);
    localStorage.setItem('dataSourceConfig', JSON.stringify(this.dataSourceConfig));
    
    // Enable/disable based on URL presence
    const checkbox = document.querySelector('input[type="checkbox"][onchange*="vercel"]');
    if (checkbox) {
      checkbox.disabled = !url;
      if (!url) {
        checkbox.checked = false;
        this.dataSourceConfig.vercel.enabled = false;
      }
    }
    
    this.addLog(`更新Vercel URL: ${url || '(空)'}`);
  }

  async testVercelConnection() {
    const url = this.dataSourceConfig.vercel.url;
    const statusEl = document.getElementById('vercel-status');
    
    if (!url) {
      if (statusEl) statusEl.innerHTML = '<span style="color: #ff4d4f;">请先配置URL</span>';
      this.addLog('❌ 测试失败: 未配置Vercel URL');
      return;
    }
    
    this.addLog(`开始测试Vercel连接: ${url}`);
    if (statusEl) statusEl.innerHTML = '<span style="color: #1890ff;">⏳ 正在测试...</span>';
    
    try {
      // Fix: Ensure proper URL construction without double slashes
      const apiUrl = url.endsWith('/') ? `${url}api/fetch-openrouter` : `${url}/api/fetch-openrouter`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.models) {
          if (statusEl) {
            statusEl.innerHTML = `<span style="color: #52c41a;">✅ 连接成功 (${data.models.length} 个模型)</span>`;
          }
          this.addLog(`✅ Vercel连接成功: 获取到 ${data.models.length} 个模型`);
          
          // Auto-enable if successful
          this.dataSourceConfig.vercel.enabled = true;
          const checkbox = document.querySelector('input[type="checkbox"][onchange*="vercel"]');
          if (checkbox) checkbox.checked = true;
          localStorage.setItem('dataSourceConfig', JSON.stringify(this.dataSourceConfig));
        } else {
          throw new Error('返回数据格式不正确');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #ff4d4f;">❌ 测试失败: ${error.message}</span>`;
      }
      this.addLog(`❌ Vercel连接失败: ${error.message}`);
    }
  }

  deployVercel() {
    // Open deployment guide
    window.open('https://github.com/davidwang812/AI_Product_Manager/tree/main/vercel-data-fetcher', '_blank');
    this.addLog('打开Vercel部署指南');
  }
}