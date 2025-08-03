// Unified Configuration Module - Advanced Provider & AI Service Management
export class UnifiedConfig {
  constructor(app) {
    this.app = app;
    this.providers = {};
    this.currentConfig = {};
    this.isSaving = false; // 防重复保存标志
  }

  getDefaultConfig() {
    return {
      // Global Parameters
      globalParams: {
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stream: true
      },
      
      // Provider Configurations
      providerConfigs: {
        google: {
          enabled: true,
          apiKey: 'custom',
          status: 'active',
          model: 'default',
          temperature: 'custom',
          topP: 'custom',
          maxLength: 'custom'
        },
        openai: {
          enabled: true,
          apiKey: 'custom',
          status: 'active',
          model: 'default',
          temperature: 'custom',
          topP: 'custom',
          maxLength: 'custom'
        }
      },
      
      // AI Service Applications
      aiServices: {
        questionAI: {
          enabled: true,
          provider: 'openai',
          prompt: '你是一个专业的问答助手，请提供准确、详细的回答。',
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 2000
        },
        drawingAI: {
          enabled: true,
          provider: 'google',
          prompt: '你是一个图像生成助手，请根据用户描述生成高质量的图像。',
          temperature: 0.8,
          topP: 0.95,
          maxTokens: 1000
        },
        assistantAI: {
          enabled: true,
          provider: 'moonshot',
          prompt: '你是一个全能助手，可以帮助用户处理各种任务和问题。',
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 2000
        },
        translationAI: {
          enabled: true,
          provider: 'google',
          prompt: '你是一个专业的翻译助手，请提供准确、自然的翻译。',
          temperature: 0.3,
          topP: 0.8,
          maxTokens: 1500
        },
        ratingAI: {
          enabled: false,
          provider: 'openai',
          prompt: '你是一个专业的评分助手，请客观、公正地评估内容质量。',
          temperature: 0.5,
          topP: 0.8,
          maxTokens: 1000
        }
      }
    };
  }

  async render() {
    console.log('🎨 UnifiedConfig.render() starting...');
    
    // Load current configuration and providers
    let config = this.getDefaultConfig();
    let providers = {};
    
    // First, try to load from localStorage (it may have newer data)
    const savedConfig = localStorage.getItem('unified_config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        config = { ...config, ...parsedConfig };
        console.log('📋 Loaded unified config from localStorage');
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }
    
    const savedProviders = localStorage.getItem('admin_providers');
    if (savedProviders) {
      try {
        providers = JSON.parse(savedProviders);
        console.log('📋 Loaded providers from localStorage');
      } catch (e) {
        console.error('Failed to parse saved providers:', e);
      }
    }
    
    // Then try to get fresher data from API (if available)
    try {
      // Load unified config from API
      const unifiedConfigResponse = await this.app.api.getUnifiedConfig();
      if (unifiedConfigResponse.success && unifiedConfigResponse.data) {
        // Only use API data if it's newer than localStorage
        const apiConfig = unifiedConfigResponse.data;
        if (!savedConfig || (apiConfig.lastUpdated && apiConfig.lastUpdated > config.lastUpdated)) {
          config = { ...config, ...apiConfig };
          console.log('📋 Using newer config from API');
        }
      }
      
      // Load available providers from API
      const providersResponse = await this.app.api.getProviders();
      if (providersResponse.success && providersResponse.providers) {
        providers = providersResponse.providers;
        console.log('📋 Updated providers from API');
      }
    } catch (error) {
      console.log('ℹ️ API not available, using localStorage data:', error.message);
    }
    
    this.currentConfig = config;
    this.providers = providers;
    
    return `
      <div class="unified-config-container">
        <div class="unified-header">
          <h3>🎛️ 统一配置管理</h3>
          <div class="unified-actions">
            <button class="btn btn-primary" id="btn-save-unified">
              💾 保存配置
            </button>
            <button class="btn btn-default" id="btn-reset-unified">
              🔄 重置默认
            </button>
            <button class="btn btn-info" id="btn-sync-providers">
              🔄 同步服务商
            </button>
            <button class="btn btn-default" id="btn-export-unified">
              📤 导出配置
            </button>
          </div>
        </div>

        <!-- Global Parameters Section -->
        <div class="config-section">
          <h4>📊 全局参数设置</h4>
          <div class="global-params-grid">
            <div class="param-item">
              <label>🌡️ 温度 (Temperature)</label>
              <input type="range" id="global-temperature" min="0" max="2" step="0.1" value="${config.globalParams?.temperature || 0.7}">
              <span id="global-temperature-value">${config.globalParams?.temperature || 0.7}</span>
            </div>
            <div class="param-item">
              <label>🎯 Top P</label>
              <input type="range" id="global-top-p" min="0" max="1" step="0.1" value="${config.globalParams?.topP || 0.9}">
              <span id="global-top-p-value">${config.globalParams?.topP || 0.9}</span>
            </div>
            <div class="param-item">
              <label>📝 最大Token数</label>
              <input type="number" id="global-max-tokens" class="form-control" value="${config.globalParams?.maxTokens || 2000}" min="100" max="8000">
            </div>
          </div>
        </div>

        <!-- Main Configuration Table -->
        <div class="config-section">
          <h4>🤖 AI服务商与应用统一配置</h4>
          <div class="unified-table-container">
            ${this.renderUnifiedTable(config, providers)}
          </div>
        </div>

        <!-- AI Service Global Defaults Section -->
        <div class="config-section">
          <h4>🎛️ AI应用全局默认配置</h4>
          <div class="config-section-desc">
            <p class="text-muted">
              这里配置每个AI应用的全局默认参数。这些参数会作为所有服务商的默认值，
              可以通过上方表格的编辑功能为特定服务商定制个性化配置。
            </p>
          </div>
          <div class="ai-services-config">
            ${this.renderAIServicesConfig(config)}
          </div>
        </div>
      </div>
    `;
  }
  
  renderUnifiedTable(config, providers) {
    // 从实际的服务商配置中获取真实数据
    const realProviders = this.extractRealProviders(providers);
    console.log('🔍 Real providers extracted:', realProviders);
    
    const aiServices = ['questionAI', 'drawingAI', 'assistantAI', 'translationAI', 'ratingAI'];
    const serviceNames = {
      questionAI: '提问AI',
      drawingAI: '绘图AI', 
      assistantAI: '建议AI',
      translationAI: '翻译AI',
      ratingAI: '评分AI'
    };
    
    // 如果没有真实服务商，显示提示信息
    if (realProviders.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🤖</div>
          <div class="empty-title">暂无配置的服务商</div>
          <div class="empty-desc">请先在"服务商配置"页面添加AI服务商</div>
          <button class="btn btn-primary" onclick="window.adminApp.router.navigate('/admin-v2/ai-service?tab=provider-config')">
            ➕ 去添加服务商
          </button>
        </div>
      `;
    }
    
    let tableHTML = `
      <table class="unified-config-table">
        <thead>
          <tr>
            <th rowspan="2">AI服务商</th>
            <th colspan="${aiServices.length}">AI应用配置</th>
          </tr>
          <tr>
            ${aiServices.map(service => `<th>${serviceNames[service]}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;
    
    // 为每个真实服务商渲染行
    realProviders.forEach(provider => {
      tableHTML += `
        <tr data-provider-id="${provider.id}" data-provider-type="${provider.type}">
          <td class="provider-name">
            <div class="provider-info">
              <span class="provider-icon">${this.getProviderIcon(provider.type)}</span>
              <div class="provider-details">
                <div class="provider-name-text">${provider.name || provider.typeName}</div>
                <div class="provider-meta">
                  <span class="provider-type">${provider.typeName}</span>
                  <span class="provider-status ${provider.enabled ? 'status-active' : 'status-inactive'}">
                    ${provider.enabled ? '🟢 启用' : '🔴 禁用'}
                  </span>
                </div>
              </div>
            </div>
          </td>
          ${aiServices.map(service => {
            const serviceConfig = config.aiServices?.[service] || {};
            const isAssigned = serviceConfig.provider === provider.type && serviceConfig.providerId === provider.id;
            return `
              <td class="ai-service-cell">
                <div class="service-controls">
                  <label class="switch-xs">
                    <input type="checkbox" 
                           data-service="${service}" 
                           data-provider-type="${provider.type}"
                           data-provider-id="${provider.id}" 
                           ${isAssigned && serviceConfig.enabled ? 'checked' : ''}>
                    <span class="slider-xs"></span>
                  </label>
                  <button class="btn btn-xs" onclick="window.adminApp.aiServicePage.modules.unifiedConfig.editPrompt('${service}', '${provider.type}', '${provider.id}')">
                    ✏️
                  </button>
                </div>
              </td>
            `;
          }).join('')}
        </tr>
      `;
    });
    
    tableHTML += `
        </tbody>
      </table>
    `;
    
    return tableHTML;
  }
  
  renderAIServicesConfig(config) {
    const aiServices = config.aiServices || this.getDefaultConfig().aiServices;
    const realProviders = this.extractRealProviders(this.providers);
    
    const serviceNames = {
      questionAI: '🤔 提问AI',
      drawingAI: '🎨 绘图AI', 
      assistantAI: '🤝 建议AI',
      translationAI: '🌐 翻译AI',
      ratingAI: '⭐ 评分AI'
    };
    
    return Object.keys(aiServices).map(serviceKey => {
      const service = aiServices[serviceKey];
      
      // 找到当前分配的服务商信息
      const assignedProvider = realProviders.find(p => 
        p.type === service.provider && p.id === service.providerId
      );
      
      return `
        <div class="ai-service-config" data-service="${serviceKey}">
          <div class="service-header">
            <h5>${serviceNames[serviceKey]}</h5>
            <div class="service-status">
              <label class="switch">
                <input type="checkbox" id="${serviceKey}-enabled" ${service.enabled ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
              <span class="status-text">${service.enabled ? '启用' : '禁用'}</span>
            </div>
          </div>
          
          <div class="service-config-grid">
            <div class="config-item">
              <label>当前分配服务商</label>
              <div class="assigned-provider">
                ${assignedProvider ? `
                  <div class="provider-display">
                    <span class="provider-icon">${this.getProviderIcon(assignedProvider.type)}</span>
                    <span class="provider-name">${assignedProvider.typeName} - ${assignedProvider.name}</span>
                    <span class="provider-status ${assignedProvider.enabled ? 'status-active' : 'status-inactive'}">
                      ${assignedProvider.enabled ? '🟢' : '🔴'}
                    </span>
                  </div>
                ` : `
                  <div class="no-provider">
                    <span class="text-muted">未分配服务商</span>
                    <small class="help-text">请在上方表格中分配服务商</small>
                  </div>
                `}
              </div>
            </div>
            
            <div class="config-item">
              <label>🌡️ 默认温度 (Temperature)</label>
              <div class="param-control">
                <input type="range" id="${serviceKey}-temperature" min="0" max="2" step="0.1" value="${service.temperature || 0.7}">
                <span class="value-display">${service.temperature || 0.7}</span>
              </div>
              <small class="param-help">控制回复的随机性，0=确定性，2=创造性</small>
            </div>
            
            <div class="config-item">
              <label>🎯 默认 Top P</label>
              <div class="param-control">
                <input type="range" id="${serviceKey}-top-p" min="0" max="1" step="0.1" value="${service.topP || 0.9}">
                <span class="value-display">${service.topP || 0.9}</span>
              </div>
              <small class="param-help">核采样参数，控制词汇多样性</small>
            </div>
            
            <div class="config-item">
              <label>📝 默认最大Token</label>
              <div class="param-control">
                <input type="number" id="${serviceKey}-max-tokens" class="form-control" value="${service.maxTokens || 2000}" min="100" max="8000">
              </div>
              <small class="param-help">单次对话的最大令牌数量</small>
            </div>
          </div>
          
          <div class="config-item prompt-config">
            <label>🎭 系统提示词 (全局默认)</label>
            <textarea id="${serviceKey}-prompt" class="form-control" rows="4" placeholder="输入全局默认系统提示词...">${service.prompt || ''}</textarea>
            <small class="prompt-help">
              这是${serviceNames[serviceKey]}的全局默认提示词。如需为特定服务商定制，请使用上方表格的编辑功能。
            </small>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // 从服务商配置表中提取真实服务商数据
  extractRealProviders(providers) {
    const realProviders = [];
    
    // 遍历所有服务商类型
    Object.keys(providers).forEach(type => {
      const typeProviders = providers[type];
      if (Array.isArray(typeProviders)) {
        typeProviders.forEach(provider => {
          realProviders.push({
            ...provider,
            type: type,
            typeName: this.getProviderDisplayName(type)
          });
        });
      }
    });
    
    console.log(`📋 Extracted ${realProviders.length} real providers:`, realProviders.map(p => `${p.typeName}-${p.name}`));
    return realProviders;
  }
  
  // Helper methods
  getProviderDisplayName(type) {
    const names = {
      google: 'Google AI',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      moonshot: 'Moonshot',
      azure: 'Azure OpenAI',
      grok: 'Grok',
      meta: 'Meta',
      qwen: 'Qwen',
      deepseek: 'DeepSeek'
    };
    return names[type] || type;
  }
  
  getProviderIcon(type) {
    const icons = {
      google: '🟢',
      openai: '🤖',
      anthropic: '🧠',
      moonshot: '🌙',
      azure: '☁️',
      grok: '⚡',
      meta: '🔷',
      qwen: '💫',
      deepseek: '🔭'
    };
    return icons[type] || '🔧';
  }
  
  editPrompt(service, providerType, providerId) {
    console.log(`🎯 Edit prompt for ${service} on ${providerType}/${providerId}`);
    
    const serviceNames = {
      questionAI: '提问AI',
      drawingAI: '绘图AI', 
      assistantAI: '建议AI',
      translationAI: '翻译AI',
      ratingAI: '评分AI'
    };
    
    // 查找具体的服务商信息
    const realProviders = this.extractRealProviders(this.providers);
    const provider = realProviders.find(p => p.type === providerType && p.id === providerId);
    const providerName = provider ? `${provider.typeName} - ${provider.name}` : this.getProviderDisplayName(providerType);
    
    // 获取当前配置的提示词
    const serviceConfig = this.currentConfig.aiServices?.[service] || {};
    const currentPrompt = serviceConfig.providerId === providerId ? serviceConfig.prompt : '';
    
    const modal = `
      <div class="modal-overlay" id="prompt-edit-modal">
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h3>编辑 ${serviceNames[service]} 提示词</h3>
            <button class="modal-close" onclick="document.getElementById('prompt-edit-modal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>目标服务商: ${providerName}</label>
            </div>
            <div class="form-group">
              <label>系统提示词</label>
              <textarea id="prompt-editor" class="form-control" rows="8" placeholder="输入系统提示词...">${currentPrompt}</textarea>
            </div>
            <div class="form-group">
              <small class="text-muted">
                提示词将决定AI的行为和回复风格。请描述AI的角色、任务和期望的输出格式。
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('prompt-edit-modal').remove()">
              取消
            </button>
            <button class="btn btn-primary" onclick="window.adminApp.aiServicePage.modules.unifiedConfig.savePrompt('${service}', '${providerType}', '${providerId}')">
              保存
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
  }
  
  savePrompt(service, providerType, providerId) {
    const promptEditor = document.getElementById('prompt-editor');
    if (!promptEditor) return;
    
    const newPrompt = promptEditor.value.trim();
    
    // 更新当前配置，包含具体的服务商信息
    if (!this.currentConfig.aiServices) {
      this.currentConfig.aiServices = {};
    }
    if (!this.currentConfig.aiServices[service]) {
      this.currentConfig.aiServices[service] = {};
    }
    
    // 设置服务分配到具体的服务商
    this.currentConfig.aiServices[service].provider = providerType;
    this.currentConfig.aiServices[service].providerId = providerId;
    this.currentConfig.aiServices[service].prompt = newPrompt;
    this.currentConfig.aiServices[service].enabled = true;
    
    // 更新界面上对应的复选框
    const checkbox = document.querySelector(`input[data-service="${service}"][data-provider-type="${providerType}"][data-provider-id="${providerId}"]`);
    if (checkbox) {
      checkbox.checked = true;
    }
    
    // 取消其他服务商对此服务的分配
    document.querySelectorAll(`input[data-service="${service}"]`).forEach(cb => {
      if (cb !== checkbox) {
        cb.checked = false;
      }
    });
    
    document.getElementById('prompt-edit-modal').remove();
    
    const serviceNames = {
      questionAI: '提问AI',
      drawingAI: '绘图AI', 
      assistantAI: '建议AI',
      translationAI: '翻译AI',
      ratingAI: '评分AI'
    };
    
    this.app.showToast('success', `${serviceNames[service]} 已分配给 ${this.getProviderDisplayName(providerType)} 并更新提示词`);
  }

  bindEvents() {
    console.log('🔗 UnifiedConfig.bindEvents() starting...');
    
    // Global parameter sliders
    this.bindSlider('global-temperature', 'global-temperature-value');
    this.bindSlider('global-top-p', 'global-top-p-value');
    
    // AI Service parameter sliders
    const aiServices = ['questionAI', 'drawingAI', 'assistantAI', 'translationAI', 'ratingAI'];
    aiServices.forEach(service => {
      this.bindSlider(`${service}-temperature`, null, (value) => {
        const display = document.querySelector(`#${service}-temperature + .value-display`);
        if (display) display.textContent = value;
      });
      this.bindSlider(`${service}-top-p`, null, (value) => {
        const display = document.querySelector(`#${service}-top-p + .value-display`);
        if (display) display.textContent = value;
      });
    });

    // Action buttons
    this.bindButton('btn-save-unified', () => this.saveConfig());
    this.bindButton('btn-reset-unified', () => this.resetConfig());
    this.bindButton('btn-sync-providers', () => this.syncProviders());
    this.bindButton('btn-export-unified', () => this.exportConfig());
    
    // Table change events
    this.bindTableEvents();
    
    // AI service status change events
    aiServices.forEach(service => {
      const enabledCheckbox = document.getElementById(`${service}-enabled`);
      if (enabledCheckbox) {
        enabledCheckbox.addEventListener('change', (e) => {
          const statusText = document.querySelector(`[data-service="${service}"] .status-text`);
          if (statusText) {
            statusText.textContent = e.target.checked ? '启用' : '禁用';
          }
        });
      }
    });
  }
  
  bindSlider(sliderId, valueId, customCallback) {
    const slider = document.getElementById(sliderId);
    if (slider) {
      slider.addEventListener('input', (e) => {
        if (valueId) {
          const valueEl = document.getElementById(valueId);
          if (valueEl) valueEl.textContent = e.target.value;
        }
        if (customCallback) {
          customCallback(e.target.value);
        }
      });
    }
  }
  
  bindButton(buttonId, callback) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', callback);
    }
  }
  
  bindTableEvents() {
    // AI服务分配事件绑定
    document.querySelectorAll('.unified-config-table input[type="checkbox"]').forEach(element => {
      element.addEventListener('change', (e) => {
        const service = e.target.getAttribute('data-service');
        const providerType = e.target.getAttribute('data-provider-type');
        const providerId = e.target.getAttribute('data-provider-id');
        
        if (service && providerType && providerId) {
          console.log(`🔄 Service ${service} on ${providerType}/${providerId} changed to:`, e.target.checked);
          this.updateServiceAssignment(service, providerType, providerId, e.target.checked);
        }
      });
    });
  }
  
  updateProviderConfig(provider, field, value) {
    if (!this.currentConfig.providerConfigs) {
      this.currentConfig.providerConfigs = {};
    }
    if (!this.currentConfig.providerConfigs[provider]) {
      this.currentConfig.providerConfigs[provider] = {};
    }
    
    this.currentConfig.providerConfigs[provider][field] = value;
    console.log(`✅ Updated ${provider}.${field} = ${value}`);
  }
  
  updateServiceAssignment(service, providerType, providerId, enabled) {
    if (!this.currentConfig.aiServices) {
      this.currentConfig.aiServices = {};
    }
    if (!this.currentConfig.aiServices[service]) {
      this.currentConfig.aiServices[service] = {};
    }
    
    if (enabled) {
      // 分配服务到具体的服务商实例
      this.currentConfig.aiServices[service].provider = providerType;
      this.currentConfig.aiServices[service].providerId = providerId;
      this.currentConfig.aiServices[service].enabled = true;
      
      // 取消其他服务商对此服务的分配
      document.querySelectorAll(`input[data-service="${service}"]`).forEach(checkbox => {
        const cbProviderType = checkbox.getAttribute('data-provider-type');
        const cbProviderId = checkbox.getAttribute('data-provider-id');
        if (cbProviderType !== providerType || cbProviderId !== providerId) {
          checkbox.checked = false;
        }
      });
    } else {
      // 禁用此服务商上的服务
      const currentProvider = this.currentConfig.aiServices[service].provider;
      const currentProviderId = this.currentConfig.aiServices[service].providerId;
      if (currentProvider === providerType && currentProviderId === providerId) {
        this.currentConfig.aiServices[service].enabled = false;
      }
    }
    
    console.log(`✅ Updated service assignment: ${service} -> ${providerType}/${providerId} (${enabled})`);
  }
  
  async syncProviders() {
    console.log('🔄 Syncing providers...');
    this.app.showToast('info', '正在同步服务商配置...');
    
    try {
      const response = await this.app.api.getProviders();
      if (response.success) {
        this.providers = response.providers || {};
        this.app.showToast('success', '服务商配置同步成功');
        
        // Refresh the page to show updated data
        if (this.app.aiServicePage && this.app.aiServicePage.currentTab === 'unified-config') {
          this.app.aiServicePage.loadTab('unified-config');
        }
      }
    } catch (error) {
      console.error('Sync providers error:', error);
      this.app.showToast('error', '同步失败：' + error.message);
    }
  }

  async saveConfig() {
    // 防重复提交
    if (this.isSaving) {
      console.log('⚠️ 保存操作进行中，跳过重复请求');
      return;
    }
    
    this.isSaving = true;
    console.log('💾 Saving unified config...');
    
    // 禁用保存按钮
    const saveBtn = document.getElementById('btn-save-unified');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '💾 保存中...';
    }
    
    try {
      // 收集全局参数
      const globalParams = {
        temperature: parseFloat(document.getElementById('global-temperature')?.value || 0.7),
        topP: parseFloat(document.getElementById('global-top-p')?.value || 0.9),
        maxTokens: parseInt(document.getElementById('global-max-tokens')?.value || 2000)
      };
      
      // 收集AI应用的全局默认配置
      const aiServices = {};
      const serviceKeys = ['questionAI', 'drawingAI', 'assistantAI', 'translationAI', 'ratingAI'];
      
      serviceKeys.forEach(serviceKey => {
        const enabled = document.getElementById(`${serviceKey}-enabled`)?.checked || false;
        const temperature = parseFloat(document.getElementById(`${serviceKey}-temperature`)?.value || 0.7);
        const topP = parseFloat(document.getElementById(`${serviceKey}-top-p`)?.value || 0.9);
        const maxTokens = parseInt(document.getElementById(`${serviceKey}-max-tokens`)?.value || 2000);
        const prompt = document.getElementById(`${serviceKey}-prompt`)?.value || '';
        
        // 保持当前的服务商分配信息，只更新全局参数
        const currentService = this.currentConfig.aiServices?.[serviceKey] || {};
        
        aiServices[serviceKey] = {
          ...currentService, // 保留分配的服务商信息
          enabled,
          temperature,    // 全局默认温度
          topP,          // 全局默认Top P
          maxTokens,     // 全局默认Token数
          prompt         // 全局默认提示词
        };
      });
      
      // 合并配置，保留服务商分配信息
      const config = {
        ...this.currentConfig,
        globalParams,
        aiServices,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('📋 Config to save:', config);
      
      // Save to localStorage first as backup
      localStorage.setItem('unified_config', JSON.stringify(config));
      this.currentConfig = config;
      
      // Try to save via API to database
      let savedToDatabase = false;
      try {
        if (this.app && this.app.api && typeof this.app.api.saveUnifiedConfig === 'function') {
          console.log('📡 Attempting to save to database via API...');
          const response = await this.app.api.saveUnifiedConfig(config);
          console.log('📡 API response:', response);
          
          if (response && response.success) {
            savedToDatabase = true;
            if (this.app.showToast) {
              this.app.showToast('success', '✅ 统一配置已保存到数据库');
            }
            console.log('✅ Configuration saved to database successfully');
            return;
          } else {
            console.warn('⚠️ API returned unsuccessful response:', response);
          }
        } else {
          console.log('⚠️ API not available or saveUnifiedConfig method missing');
        }
      } catch (apiError) {
        console.error('❌ Failed to save to database:', apiError);
        console.error('Error details:', {
          message: apiError.message,
          stack: apiError.stack,
          response: apiError.response
        });
      }
      
      // Show appropriate message based on save result
      if (!savedToDatabase) {
        if (this.app && this.app.showToast) {
          this.app.showToast('warning', '⚠️ 配置已保存到本地（数据库不可用）');
        } else {
          console.log('⚠️ Configuration saved to localStorage only (database unavailable)');
        }
      }
      
      // Also save providers to localStorage if they're not already saved
      if (Object.keys(this.providers).length > 0) {
        localStorage.setItem('admin_providers', JSON.stringify(this.providers));
      }
      
    } catch (error) {
      console.error('Save config error:', error);
      console.error('Error stack:', error.stack);
      
      // Check if showToast exists
      if (this.app && this.app.showToast) {
        this.app.showToast('error', '保存失败: ' + error.message);
      } else {
        alert('保存失败: ' + error.message);
      }
    } finally {
      // 恢复保存按钮状态
      this.isSaving = false;
      const saveBtn = document.getElementById('btn-save-unified');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 保存配置';
      }
    }
  }

  resetConfig() {
    if (confirm('确定要重置为默认配置吗？')) {
      const defaultConfig = this.getDefaultConfig();
      document.getElementById('system-prompt').value = defaultConfig.systemPrompt;
      document.getElementById('temperature').value = defaultConfig.temperature;
      document.getElementById('temperature-value').textContent = defaultConfig.temperature;
      document.getElementById('max-tokens').value = defaultConfig.maxTokens;
      document.getElementById('top-p').value = defaultConfig.topP;
      document.getElementById('top-p-value').textContent = defaultConfig.topP;
      document.getElementById('frequency-penalty').value = defaultConfig.frequencyPenalty;
      document.getElementById('frequency-penalty-value').textContent = defaultConfig.frequencyPenalty;
      document.getElementById('presence-penalty').value = defaultConfig.presencePenalty;
      document.getElementById('presence-penalty-value').textContent = defaultConfig.presencePenalty;
      document.getElementById('stream-enabled').checked = defaultConfig.stream;
      
      // Clear role configs
      document.querySelector('#role-config-table tbody').innerHTML = '';
      
      this.app.showToast('info', '已重置为默认配置');
    }
  }

  exportConfig() {
    const config = {
      systemPrompt: document.getElementById('system-prompt').value,
      temperature: parseFloat(document.getElementById('temperature').value),
      maxTokens: parseInt(document.getElementById('max-tokens').value),
      topP: parseFloat(document.getElementById('top-p').value),
      frequencyPenalty: parseFloat(document.getElementById('frequency-penalty').value),
      presencePenalty: parseFloat(document.getElementById('presence-penalty').value),
      stream: document.getElementById('stream-enabled').checked,
      roleConfigs: this.getRoleConfigs()
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `unified-config-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.app.showToast('success', '配置已导出');
  }

  addRole() {
    const tbody = document.querySelector('#role-config-table tbody');
    const index = tbody.children.length;
    
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-role-index', index);
    newRow.innerHTML = `
      <td><input type="text" value="新角色" class="form-control role-name"></td>
      <td><input type="text" value="角色描述" class="form-control role-description"></td>
      <td><textarea class="form-control role-prompt" rows="2">你是一个专业的助手</textarea></td>
      <td><input type="number" value="0.7" class="form-control role-temperature" min="0" max="2" step="0.1"></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="window.adminApp.removeRole(${index})">删除</button>
      </td>
    `;
    
    tbody.appendChild(newRow);
  }

  getRoleConfigs() {
    const roles = [];
    document.querySelectorAll('#role-config-table tbody tr').forEach(row => {
      roles.push({
        name: row.querySelector('.role-name').value,
        description: row.querySelector('.role-description').value,
        systemPrompt: row.querySelector('.role-prompt').value,
        temperature: parseFloat(row.querySelector('.role-temperature').value)
      });
    });
    return roles;
  }
}

// Add CSS styles for the unified configuration
const unifiedConfigStyles = document.createElement('style');
unifiedConfigStyles.textContent = `
  .unified-config-container {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .unified-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e8e8e8;
  }
  
  .unified-actions {
    display: flex;
    gap: 10px;
  }
  
  .config-section {
    margin-bottom: 40px;
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .config-section h4 {
    margin: 0 0 20px 0;
    color: #333;
    border-bottom: 1px solid #e8e8e8;
    padding-bottom: 10px;
  }
  
  .global-params-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }
  
  .param-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .param-item label {
    font-weight: 500;
    color: #555;
  }
  
  .unified-table-container {
    overflow-x: auto;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
  }
  
  .unified-config-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1000px;
  }
  
  .unified-config-table th {
    background: #f8f9fa;
    padding: 12px 8px;
    text-align: center;
    font-weight: 600;
    border: 1px solid #dee2e6;
    font-size: 13px;
  }
  
  .unified-config-table td {
    padding: 10px 8px;
    text-align: center;
    border: 1px solid #dee2e6;
    vertical-align: middle;
  }
  
  .provider-name {
    text-align: left !important;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .provider-icon {
    margin-right: 8px;
    font-size: 16px;
  }
  
  .form-control-sm {
    width: 80px;
    padding: 4px 6px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 12px;
  }
  
  .switch-sm, .switch-xs {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
  }
  
  .switch-xs {
    width: 30px;
    height: 16px;
  }
  
  .switch-sm input, .switch-xs input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider-sm, .slider-xs {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 20px;
  }
  
  .slider-sm:before, .slider-xs:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }
  
  .slider-xs:before {
    height: 12px;
    width: 12px;
  }
  
  input:checked + .slider-sm {
    background-color: #2196F3;
  }
  
  input:checked + .slider-xs {
    background-color: #52c41a;
  }
  
  input:checked + .slider-sm:before {
    transform: translateX(20px);
  }
  
  input:checked + .slider-xs:before {
    transform: translateX(14px);
  }
  
  .ai-service-cell {
    padding: 8px 4px !important;
  }
  
  .service-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  
  .btn.btn-xs {
    padding: 2px 6px;
    font-size: 11px;
    border-radius: 3px;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    cursor: pointer;
  }
  
  .btn.btn-xs:hover {
    background: #e9ecef;
  }
  
  .ai-services-config {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
  }
  
  .ai-service-config {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
    background: #fafafa;
  }
  
  .service-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e8e8e8;
  }
  
  .service-header h5 {
    margin: 0;
    color: #333;
  }
  
  .service-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .status-text {
    font-size: 13px;
    font-weight: 500;
  }
  
  .service-config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .config-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .config-item label {
    font-size: 13px;
    font-weight: 500;
    color: #555;
  }
  
  .prompt-config {
    grid-column: span 2;
  }
  
  .value-display {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }
  
  .switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
  }
  
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 24px;
  }
  
  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }
  
  input:checked + .slider {
    background-color: #2196F3;
  }
  
  input:checked + .slider:before {
    transform: translateX(26px);
  }
`;

if (!document.getElementById('unified-config-styles')) {
  unifiedConfigStyles.id = 'unified-config-styles';
  document.head.appendChild(unifiedConfigStyles);
}