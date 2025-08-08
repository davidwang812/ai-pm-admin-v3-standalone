/**
 * Enhanced Load Balance Module
 * 增强版负载均衡模块 - 集成真实算法实现
 */

import { getLoadBalanceManager } from '../../_core/load-balance-manager.js';

export class LoadBalanceEnhanced {
  constructor(app) {
    this.app = app;
    this.loadBalanceManager = getLoadBalanceManager(app.api);
    this.currentPoolId = null;
    this.refreshInterval = null;
  }

  async render() {
    try {
      // 获取仪表板数据
      let dashboard = await this.loadBalanceManager.getDashboard();
      
      // 确保dashboard有正确的结构
      if (!dashboard || typeof dashboard !== 'object') {
        dashboard = {
          summary: {
            totalPools: 0,
            activePools: 0,
            totalStrategies: 8,
            totalPresets: 0
          },
          pools: []
        };
      }
      
      // 确保summary存在
      if (!dashboard.summary) {
        dashboard.summary = {
          totalPools: dashboard.pools ? dashboard.pools.length : 0,
          activePools: 0,
          totalStrategies: 8,
          totalPresets: 0
        };
      }
      
      return `
        <div class="load-balance-enhanced-container">
          <!-- 页面标题 -->
          <div class="page-header">
            <h2>🔄 负载均衡管理</h2>
            <div class="header-actions">
              <button class="btn btn-primary" id="btn-create-pool">
                <i class="icon-plus"></i> 创建负载池
              </button>
              <button class="btn btn-default" id="btn-refresh-dashboard">
                <i class="icon-refresh"></i> 刷新
              </button>
            </div>
          </div>

          <!-- 统计概览 -->
          <div class="stats-overview">
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-content">
                <div class="stat-value">${dashboard.summary.totalPools || 0}</div>
                <div class="stat-label">负载池总数</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">✅</div>
              <div class="stat-content">
                <div class="stat-value">${dashboard.summary.activePools || 0}</div>
                <div class="stat-label">活跃池</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-content">
                <div class="stat-value">${dashboard.summary.totalStrategies || 0}</div>
                <div class="stat-label">可用策略</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⚙️</div>
              <div class="stat-content">
                <div class="stat-value">${dashboard.summary.totalPresets || 0}</div>
                <div class="stat-label">配置预设</div>
              </div>
            </div>
          </div>

          <!-- 负载池列表 -->
          <div class="pools-section">
            <h3>负载均衡池</h3>
            <div class="pools-grid">
              ${this.renderPoolsList(dashboard.pools || [])}
            </div>
          </div>

          <!-- 池详情面板 -->
          <div id="pool-details" class="pool-details-panel" style="display: none;">
            <!-- 动态内容 -->
          </div>

          <!-- 实时监控面板 -->
          <div class="monitoring-panel">
            <h3>实时性能监控</h3>
            <div id="realtime-stats" class="realtime-stats">
              <div class="loading">加载中...</div>
            </div>
          </div>

          <!-- 创建池弹窗 -->
          <div id="create-pool-modal" class="modal" style="display: none;">
            <div class="modal-content">
              <div class="modal-header">
                <h3>创建负载均衡池</h3>
                <button class="modal-close" onclick="this.closest('.modal').style.display='none'">×</button>
              </div>
              <div class="modal-body">
                <form id="create-pool-form">
                  <div class="form-group">
                    <label>池名称 <span class="required">*</span></label>
                    <input type="text" id="pool-name" class="form-control" required 
                           placeholder="例如: AI服务主池">
                  </div>
                  
                  <div class="form-group">
                    <label>服务类型 <span class="required">*</span></label>
                    <select id="service-type" class="form-control" required>
                      <option value="">选择服务类型</option>
                      <option value="chat">对话服务</option>
                      <option value="completion">文本补全</option>
                      <option value="embedding">向量嵌入</option>
                      <option value="image">图像生成</option>
                      <option value="audio">音频处理</option>
                      <option value="general">通用服务</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label>负载均衡策略 <span class="required">*</span></label>
                    <select id="strategy-name" class="form-control" required>
                      <option value="round_robin">轮询 (Round Robin)</option>
                      <option value="weighted_round_robin">加权轮询</option>
                      <option value="least_connections">最少连接</option>
                      <option value="response_time">最快响应</option>
                      <option value="weighted_response_time">加权响应时间</option>
                      <option value="random">随机</option>
                      <option value="hash">哈希一致性</option>
                      <option value="adaptive">自适应AI</option>
                    </select>
                    <small class="form-text">选择适合您业务场景的负载均衡算法</small>
                  </div>
                  
                  <div class="form-group">
                    <label>高级配置</label>
                    <div class="config-grid">
                      <div>
                        <label>最大并发请求</label>
                        <input type="number" id="max-concurrent" class="form-control" 
                               value="100" min="1" max="1000">
                      </div>
                      <div>
                        <label>请求超时 (ms)</label>
                        <input type="number" id="request-timeout" class="form-control" 
                               value="30000" min="1000" max="300000">
                      </div>
                      <div>
                        <label>重试次数</label>
                        <input type="number" id="retry-attempts" class="form-control" 
                               value="3" min="0" max="10">
                      </div>
                      <div>
                        <label>重试延迟 (ms)</label>
                        <input type="number" id="retry-delay" class="form-control" 
                               value="1000" min="100" max="10000">
                      </div>
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label>健康检查</label>
                    <div class="checkbox-group">
                      <label>
                        <input type="checkbox" id="health-check-enabled" checked>
                        启用健康检查
                      </label>
                      <div class="health-check-config" id="health-check-config">
                        <label>检查间隔 (秒)</label>
                        <input type="number" id="health-check-interval" class="form-control" 
                               value="60" min="10" max="600">
                      </div>
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="failover-enabled" checked>
                      启用故障转移
                    </label>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-default" onclick="this.closest('.modal').style.display='none'">
                  取消
                </button>
                <button class="btn btn-primary" id="btn-submit-pool">
                  创建负载池
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Failed to render load balance page:', error);
      return this.renderError(error.message);
    }
  }

  renderPoolsList(pools) {
    if (!pools || pools.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-message">暂无负载均衡池</div>
          <div class="empty-hint">点击"创建负载池"开始配置</div>
        </div>
      `;
    }

    return pools.map(pool => `
      <div class="pool-card ${pool.is_active ? 'active' : 'inactive'}" 
           data-pool-id="${pool.id}">
        <div class="pool-header">
          <h4>${pool.pool_name}</h4>
          <div class="pool-status ${pool.is_active ? 'status-active' : 'status-inactive'}">
            ${pool.is_active ? '活跃' : '停用'}
          </div>
        </div>
        <div class="pool-info">
          <div class="info-item">
            <span class="info-label">服务类型:</span>
            <span class="info-value">${this.getServiceTypeLabel(pool.service_type)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">策略:</span>
            <span class="info-value">${pool.strategy_display_name || pool.strategy_name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">服务商数:</span>
            <span class="info-value">${pool.total_providers || 0}</span>
          </div>
          <div class="info-item">
            <span class="info-label">健康服务商:</span>
            <span class="info-value">${pool.healthy_providers || 0}</span>
          </div>
        </div>
        <div class="pool-stats">
          <div class="stat-item">
            <div class="stat-number">${pool.total_requests || 0}</div>
            <div class="stat-label">总请求</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${pool.success_rate || 0}%</div>
            <div class="stat-label">成功率</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${pool.avg_response_time || 0}ms</div>
            <div class="stat-label">平均响应</div>
          </div>
        </div>
        <div class="pool-actions">
          <button class="btn btn-sm btn-primary" onclick="window.adminV3App.currentPage.viewPoolDetails('${pool.id}')">
            查看详情
          </button>
          <button class="btn btn-sm btn-default" onclick="window.adminV3App.currentPage.configurePool('${pool.id}')">
            配置
          </button>
          <button class="btn btn-sm btn-warning" onclick="window.adminV3App.currentPage.testPool('${pool.id}')">
            测试
          </button>
        </div>
      </div>
    `).join('');
  }

  renderError(message) {
    return `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
      </div>
    `;
  }

  getServiceTypeLabel(type) {
    const labels = {
      'chat': '对话服务',
      'completion': '文本补全',
      'embedding': '向量嵌入',
      'image': '图像生成',
      'audio': '音频处理',
      'general': '通用服务'
    };
    return labels[type] || type;
  }

  bindEvents() {
    // 创建池按钮
    const createBtn = document.getElementById('btn-create-pool');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreatePoolModal());
    }

    // 刷新按钮
    const refreshBtn = document.getElementById('btn-refresh-dashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshDashboard());
    }

    // 提交创建池表单
    const submitBtn = document.getElementById('btn-submit-pool');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitCreatePool());
    }

    // 健康检查开关
    const healthCheckEnabled = document.getElementById('health-check-enabled');
    if (healthCheckEnabled) {
      healthCheckEnabled.addEventListener('change', (e) => {
        const config = document.getElementById('health-check-config');
        config.style.display = e.target.checked ? 'block' : 'none';
      });
    }

    // 开始实时监控
    this.startRealtimeMonitoring();
  }

  showCreatePoolModal() {
    const modal = document.getElementById('create-pool-modal');
    if (modal) {
      modal.style.display = 'flex';
      // 加载策略列表
      this.loadStrategies();
    }
  }

  async loadStrategies() {
    try {
      const strategies = await this.loadBalanceManager.api.get('/admin/load-balancing/strategies');
      if (strategies.success && strategies.data) {
        const select = document.getElementById('strategy-name');
        select.innerHTML = strategies.data.map(s => `
          <option value="${s.strategy_name}" title="${s.description}">
            ${s.display_name}
          </option>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load strategies:', error);
    }
  }

  async submitCreatePool() {
    const form = document.getElementById('create-pool-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const poolData = {
      pool_name: document.getElementById('pool-name').value,
      service_type: document.getElementById('service-type').value,
      strategy_name: document.getElementById('strategy-name').value,
      max_concurrent_requests: parseInt(document.getElementById('max-concurrent').value),
      request_timeout_ms: parseInt(document.getElementById('request-timeout').value),
      retry_attempts: parseInt(document.getElementById('retry-attempts').value),
      retry_delay_ms: parseInt(document.getElementById('retry-delay').value),
      health_check_enabled: document.getElementById('health-check-enabled').checked,
      health_check_interval_seconds: parseInt(document.getElementById('health-check-interval').value),
      failover_enabled: document.getElementById('failover-enabled').checked
    };

    try {
      const pool = await this.loadBalanceManager.createPool(poolData);
      this.app.showToast('success', `负载均衡池 "${pool.pool_name}" 创建成功`);
      
      // 关闭弹窗并刷新
      document.getElementById('create-pool-modal').style.display = 'none';
      this.refreshDashboard();
    } catch (error) {
      this.app.showToast('error', `创建失败: ${error.message}`);
    }
  }

  async viewPoolDetails(poolId) {
    try {
      this.currentPoolId = poolId;
      
      // 获取池详情
      const response = await this.app.api.get(`/admin/load-balancing/pools/${poolId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pool details');
      }

      const { pool, members } = response.data;
      
      // 渲染详情面板
      const detailsPanel = document.getElementById('pool-details');
      detailsPanel.innerHTML = this.renderPoolDetails(pool, members);
      detailsPanel.style.display = 'block';
      
      // 绑定详情面板事件
      this.bindPoolDetailsEvents(poolId);
      
      // 加载性能分析
      this.loadPerformanceAnalytics(poolId);
      
    } catch (error) {
      this.app.showToast('error', `加载池详情失败: ${error.message}`);
    }
  }

  renderPoolDetails(pool, members) {
    return `
      <div class="details-header">
        <h3>${pool.pool_name} - 详细信息</h3>
        <button class="close-details" onclick="document.getElementById('pool-details').style.display='none'">×</button>
      </div>
      
      <div class="details-content">
        <!-- 基本信息 -->
        <div class="info-section">
          <h4>基本配置</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>服务类型:</label>
              <span>${this.getServiceTypeLabel(pool.service_type)}</span>
            </div>
            <div class="info-item">
              <label>负载策略:</label>
              <span>${pool.strategy_display_name}</span>
            </div>
            <div class="info-item">
              <label>状态:</label>
              <span class="${pool.is_active ? 'text-success' : 'text-danger'}">
                ${pool.is_active ? '活跃' : '停用'}
              </span>
            </div>
            <div class="info-item">
              <label>创建时间:</label>
              <span>${new Date(pool.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <!-- 服务商成员 -->
        <div class="members-section">
          <div class="section-header">
            <h4>服务商成员 (${members.length})</h4>
            <button class="btn btn-sm btn-primary" onclick="window.adminV3App.currentPage.showAddMemberModal('${pool.id}')">
              添加服务商
            </button>
          </div>
          
          <table class="members-table">
            <thead>
              <tr>
                <th>服务商</th>
                <th>权重</th>
                <th>优先级</th>
                <th>状态</th>
                <th>健康度</th>
                <th>响应时间</th>
                <th>成功率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${members.map(member => this.renderMemberRow(member, pool.id)).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- 性能分析 -->
        <div class="analytics-section">
          <h4>性能分析</h4>
          <div id="performance-analytics" class="analytics-container">
            <div class="loading">加载中...</div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="details-actions">
          <button class="btn btn-primary" onclick="window.adminV3App.currentPage.performHealthCheck('${pool.id}')">
            执行健康检查
          </button>
          <button class="btn btn-warning" onclick="window.adminV3App.currentPage.testLoadBalancing('${pool.id}')">
            测试负载均衡
          </button>
          <button class="btn btn-default" onclick="window.adminV3App.currentPage.exportPoolConfig('${pool.id}')">
            导出配置
          </button>
        </div>
      </div>
    `;
  }

  renderMemberRow(member, poolId) {
    const healthClass = member.is_healthy ? 'healthy' : 'unhealthy';
    const statusClass = member.is_active ? 'active' : 'inactive';
    
    return `
      <tr data-member-id="${member.id}">
        <td>${member.provider_name}</td>
        <td>
          <input type="number" class="form-control input-sm member-weight" 
                 value="${member.weight}" min="0.1" max="10" step="0.1">
        </td>
        <td>
          <input type="number" class="form-control input-sm member-priority" 
                 value="${member.priority}" min="1" max="10">
        </td>
        <td>
          <span class="status-badge ${statusClass}">
            ${member.is_active ? '活跃' : '停用'}
          </span>
        </td>
        <td>
          <span class="health-badge ${healthClass}">
            ${member.is_healthy ? '健康' : '异常'}
          </span>
          ${member.circuit_breaker_state !== 'closed' ? 
            `<span class="circuit-breaker-badge">${member.circuit_breaker_state}</span>` : ''}
        </td>
        <td>${member.avg_response_time_ms || '-'}ms</td>
        <td>${member.connection_success_rate || '-'}%</td>
        <td>
          <button class="btn btn-xs btn-primary" 
                  onclick="window.adminV3App.currentPage.updateMember('${poolId}', '${member.id}')">
            更新
          </button>
          <button class="btn btn-xs btn-danger" 
                  onclick="window.adminV3App.currentPage.removeMember('${poolId}', '${member.id}')">
            移除
          </button>
        </td>
      </tr>
    `;
  }

  async performHealthCheck(poolId) {
    try {
      this.app.showToast('info', '正在执行健康检查...');
      
      const results = await this.loadBalanceManager.performHealthCheck(poolId);
      
      // 显示结果
      const healthyCount = results.filter(r => r.is_healthy).length;
      const message = `健康检查完成: ${healthyCount}/${results.length} 个服务商健康`;
      
      this.app.showToast(
        healthyCount === results.length ? 'success' : 'warning',
        message
      );
      
      // 刷新详情
      this.viewPoolDetails(poolId);
      
    } catch (error) {
      this.app.showToast('error', `健康检查失败: ${error.message}`);
    }
  }

  async testLoadBalancing(poolId) {
    try {
      // 模拟多个请求测试负载均衡
      const testCount = 10;
      const results = [];
      
      this.app.showToast('info', `正在测试负载均衡 (${testCount}次请求)...`);
      
      for (let i = 0; i < testCount; i++) {
        const provider = await this.loadBalanceManager.selectProvider(poolId, {
          userId: 'test-user',
          sessionId: `test-session-${i}`,
          requestType: 'test'
        });
        results.push(provider);
      }
      
      // 统计结果
      const distribution = {};
      results.forEach(r => {
        distribution[r.provider_name] = (distribution[r.provider_name] || 0) + 1;
      });
      
      // 显示分布
      const distributionText = Object.entries(distribution)
        .map(([name, count]) => `${name}: ${count}次`)
        .join(', ');
      
      this.app.showToast('success', `测试完成 - 分布: ${distributionText}`);
      
    } catch (error) {
      this.app.showToast('error', `测试失败: ${error.message}`);
    }
  }

  async updateMember(poolId, memberId) {
    const row = document.querySelector(`tr[data-member-id="${memberId}"]`);
    if (!row) return;

    const updateData = {
      weight: parseFloat(row.querySelector('.member-weight').value),
      priority: parseInt(row.querySelector('.member-priority').value)
    };

    try {
      await this.loadBalanceManager.updatePoolMember(poolId, memberId, updateData);
      this.app.showToast('success', '成员配置已更新');
    } catch (error) {
      this.app.showToast('error', `更新失败: ${error.message}`);
    }
  }

  async removeMember(poolId, memberId) {
    if (!confirm('确定要移除这个服务商吗？')) return;

    try {
      await this.loadBalanceManager.removeProviderFromPool(poolId, memberId);
      this.app.showToast('success', '服务商已移除');
      this.viewPoolDetails(poolId); // 刷新
    } catch (error) {
      this.app.showToast('error', `移除失败: ${error.message}`);
    }
  }

  async loadPerformanceAnalytics(poolId) {
    try {
      const analytics = await this.loadBalanceManager.getPerformanceAnalytics(poolId);
      
      const container = document.getElementById('performance-analytics');
      if (!container) return;
      
      container.innerHTML = `
        <table class="analytics-table">
          <thead>
            <tr>
              <th>服务商</th>
              <th>请求数</th>
              <th>平均响应时间</th>
              <th>成功率</th>
              <th>使用策略</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.map(a => `
              <tr>
                <td>${a.selected_provider_name}</td>
                <td>${a.request_count}</td>
                <td>${Math.round(a.avg_response_time)}ms</td>
                <td>${parseFloat(a.success_rate).toFixed(2)}%</td>
                <td>${a.strategy_used}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  startRealtimeMonitoring() {
    // 初始加载
    this.updateRealtimeStats();
    
    // 每5秒更新一次
    this.refreshInterval = setInterval(() => {
      this.updateRealtimeStats();
    }, 5000);
  }

  updateRealtimeStats() {
    const stats = this.loadBalanceManager.getRealtimeStats();
    const container = document.getElementById('realtime-stats');
    
    if (container) {
      container.innerHTML = `
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-label">总请求数</div>
            <div class="stat-value">${stats.totalRequests}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">成功率</div>
            <div class="stat-value">${stats.successRate}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">平均响应时间</div>
            <div class="stat-value">${stats.avgResponseTime}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">活跃服务商</div>
            <div class="stat-value">${stats.activeProviders}</div>
          </div>
        </div>
      `;
    }
  }

  async refreshDashboard() {
    try {
      const dashboard = await this.loadBalanceManager.getDashboard();
      
      // 更新统计卡片
      document.querySelector('.stats-overview').innerHTML = `
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">${dashboard.summary.totalPools || 0}</div>
            <div class="stat-label">负载池总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">${dashboard.summary.activePools || 0}</div>
            <div class="stat-label">活跃池</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-value">${dashboard.summary.totalStrategies || 0}</div>
            <div class="stat-label">可用策略</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚙️</div>
          <div class="stat-content">
            <div class="stat-value">${dashboard.summary.totalPresets || 0}</div>
            <div class="stat-label">配置预设</div>
          </div>
        </div>
      `;
      
      // 更新池列表
      document.querySelector('.pools-grid').innerHTML = this.renderPoolsList(dashboard.pools || []);
      
      this.app.showToast('success', '仪表板已刷新');
    } catch (error) {
      this.app.showToast('error', `刷新失败: ${error.message}`);
    }
  }

  async exportPoolConfig(poolId) {
    try {
      const config = this.loadBalanceManager.exportConfiguration();
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `load-balance-pool-${poolId}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.app.showToast('success', '配置已导出');
    } catch (error) {
      this.app.showToast('error', `导出失败: ${error.message}`);
    }
  }

  destroy() {
    // 清理定时器
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}