// Load Balance Configuration Module
export class LoadBalance {
  constructor(app) {
    this.app = app;
  }

  getDefaultConfig() {
    return {
      enabled: true,
      strategy: 'round-robin',
      healthCheckInterval: 30,
      failoverThreshold: 3,
      providers: [],
      stats: {
        todayRequests: 0,
        avgResponseTime: 0,
        successRate: 0,
        activeConnections: 0
      }
    };
  }

  async render() {
    // Load current configuration
    let balanceConfig = {};
    try {
      balanceConfig = await this.app.api.getLoadBalanceConfig();
    } catch (error) {
      console.log('Using default load balance config due to API error:', error.message);
      balanceConfig = this.getDefaultConfig();
    }

    // Get providers list
    const savedProviders = localStorage.getItem('admin_providers');
    const providers = savedProviders ? JSON.parse(savedProviders) : {};
    const providersList = Object.values(providers).filter(p => p && p.id);

    return `
      <div class="load-balance-container">
        <div class="balance-header">
          <h3>负载均衡配置</h3>
          <div class="balance-actions">
            <label class="switch">
              <input type="checkbox" id="balance-enabled" ${balanceConfig.enabled ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
            <span style="margin-left: 10px;">启用负载均衡</span>
          </div>
        </div>

        <div class="balance-stats">
          <div class="stat-card">
            <div class="stat-title">今日请求</div>
            <div class="stat-value" id="today-requests">${balanceConfig.stats?.todayRequests || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">平均响应时间</div>
            <div class="stat-value" id="avg-response-time">${balanceConfig.stats?.avgResponseTime || 0}ms</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">成功率</div>
            <div class="stat-value" id="success-rate">${balanceConfig.stats?.successRate || 0}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">活跃连接</div>
            <div class="stat-value" id="active-connections">${balanceConfig.stats?.activeConnections || 0}</div>
          </div>
        </div>

        <div class="balance-config">
          <div class="config-section">
            <h4>策略设置</h4>
            <div class="config-row">
              <div class="config-item">
                <label>负载均衡策略</label>
                <select id="balance-strategy" class="form-control">
                  <option value="round-robin" ${balanceConfig.strategy === 'round-robin' ? 'selected' : ''}>轮询 (Round Robin)</option>
                  <option value="weighted" ${balanceConfig.strategy === 'weighted' ? 'selected' : ''}>加权轮询 (Weighted)</option>
                  <option value="least-connections" ${balanceConfig.strategy === 'least-connections' ? 'selected' : ''}>最少连接 (Least Connections)</option>
                  <option value="fastest" ${balanceConfig.strategy === 'fastest' ? 'selected' : ''}>最快响应 (Fastest Response)</option>
                </select>
              </div>
              
              <div class="config-item">
                <label>健康检查间隔 (秒)</label>
                <input type="number" id="health-check-interval" class="form-control" value="${balanceConfig.healthCheckInterval || 30}" min="5" max="300">
              </div>
              
              <div class="config-item">
                <label>故障转移阈值</label>
                <input type="number" id="failover-threshold" class="form-control" value="${balanceConfig.failoverThreshold || 3}" min="1" max="10">
              </div>
            </div>
          </div>

          <div class="config-section">
            <h4>服务商池配置</h4>
            <table class="config-table">
              <thead>
                <tr>
                  <th>服务商</th>
                  <th>状态</th>
                  <th>权重</th>
                  <th>健康状态</th>
                  <th>响应时间</th>
                  <th>请求数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${providersList.map(provider => {
                  const providerConfig = balanceConfig.providers?.find(p => p.id === provider.id) || {};
                  return `
                    <tr data-provider-id="${provider.id}">
                      <td>${provider.name}</td>
                      <td>
                        <label class="switch small">
                          <input type="checkbox" class="provider-enabled" ${providerConfig.enabled !== false ? 'checked' : ''}>
                          <span class="slider round"></span>
                        </label>
                      </td>
                      <td>
                        <input type="number" class="form-control provider-weight" value="${providerConfig.weight || 1}" min="1" max="10" style="width: 60px;">
                      </td>
                      <td>
                        <span class="health-status ${providerConfig.healthy !== false ? 'healthy' : 'unhealthy'}">
                          ${providerConfig.healthy !== false ? '✅ 健康' : '❌ 异常'}
                        </span>
                      </td>
                      <td>${providerConfig.avgResponseTime || '-'}ms</td>
                      <td>${providerConfig.requestCount || 0}</td>
                      <td>
                        <button class="btn btn-sm btn-default" onclick="window.adminApp.testProviderHealth('${provider.id}')">
                          测试
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="balance-footer">
            <button class="btn btn-primary" id="btn-save-balance">
              💾 保存配置
            </button>
            <button class="btn btn-default" id="btn-reset-balance">
              🔄 重置
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Save button
    const saveBtn = document.getElementById('btn-save-balance');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveConfig());
    }

    // Reset button
    const resetBtn = document.getElementById('btn-reset-balance');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetConfig());
    }

    // Auto-save on changes
    const balanceEnabled = document.getElementById('balance-enabled');
    if (balanceEnabled) {
      balanceEnabled.addEventListener('change', () => {
        this.saveConfig();
      });
    }
  }

  async saveConfig() {
    const config = {
      enabled: document.getElementById('balance-enabled').checked,
      strategy: document.getElementById('balance-strategy').value,
      healthCheckInterval: parseInt(document.getElementById('health-check-interval').value),
      failoverThreshold: parseInt(document.getElementById('failover-threshold').value),
      providers: this.getProvidersConfig()
    };

    try {
      await this.app.api.saveLoadBalanceConfig(config);
      this.app.showToast('success', '负载均衡配置保存成功');
    } catch (error) {
      console.error('Failed to save load balance config:', error);
      this.app.showToast('error', '保存失败: ' + error.message);
    }
  }

  resetConfig() {
    if (confirm('确定要重置负载均衡配置吗？')) {
      const defaultConfig = this.getDefaultConfig();
      document.getElementById('balance-enabled').checked = defaultConfig.enabled;
      document.getElementById('balance-strategy').value = defaultConfig.strategy;
      document.getElementById('health-check-interval').value = defaultConfig.healthCheckInterval;
      document.getElementById('failover-threshold').value = defaultConfig.failoverThreshold;
      
      // Reset all provider configs
      document.querySelectorAll('.provider-enabled').forEach(checkbox => {
        checkbox.checked = true;
      });
      document.querySelectorAll('.provider-weight').forEach(input => {
        input.value = 1;
      });
      
      this.app.showToast('info', '已重置为默认配置');
    }
  }

  getProvidersConfig() {
    const providers = [];
    document.querySelectorAll('[data-provider-id]').forEach(row => {
      const providerId = row.dataset.providerId;
      providers.push({
        id: providerId,
        enabled: row.querySelector('.provider-enabled').checked,
        weight: parseInt(row.querySelector('.provider-weight').value)
      });
    });
    return providers;
  }
}