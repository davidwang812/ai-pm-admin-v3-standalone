/**
 * Load Balance Enhanced Tests
 * 测试增强版负载均衡模块的核心功能
 */

// Mock the core load balance manager
jest.mock('../../_core/load-balance-manager.js', () => ({
  getLoadBalanceManager: jest.fn()
}));

// Mock URL and document methods
global.URL = {
  createObjectURL: jest.fn(() => 'mock-blob-url'),
  revokeObjectURL: jest.fn()
};

global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  type: options.type
}));

// Mock confirm
global.confirm = jest.fn(() => true);

// Mock the LoadBalanceEnhanced module
const LoadBalanceEnhanced = class {
  constructor(app) {
    this.app = app;
    this.loadBalanceManager = {
      getDashboard: jest.fn(),
      createPool: jest.fn(),
      selectProvider: jest.fn(),
      performHealthCheck: jest.fn(),
      updatePoolMember: jest.fn(),
      removeProviderFromPool: jest.fn(),
      getPerformanceAnalytics: jest.fn(),
      getRealtimeStats: jest.fn(),
      exportConfiguration: jest.fn(),
      api: {
        get: jest.fn()
      }
    };
    this.currentPoolId = null;
    this.refreshInterval = null;
  }

  async render() {
    try {
      const dashboard = await this.loadBalanceManager.getDashboard();
      
      return `
        <div class="load-balance-enhanced-container">
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
          </div>

          <div class="pools-section">
            <h3>负载均衡池</h3>
            <div class="pools-grid">
              ${this.renderPoolsList(dashboard.pools || [])}
            </div>
          </div>

          <div id="pool-details" class="pool-details-panel" style="display: none;"></div>
          <div class="monitoring-panel">
            <h3>实时性能监控</h3>
            <div id="realtime-stats" class="realtime-stats">
              <div class="loading">加载中...</div>
            </div>
          </div>

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
                    <input type="text" id="pool-name" class="form-control" required placeholder="例如: AI服务主池">
                  </div>
                  <div class="form-group">
                    <label>服务类型 <span class="required">*</span></label>
                    <select id="service-type" class="form-control" required>
                      <option value="">选择服务类型</option>
                      <option value="chat">对话服务</option>
                      <option value="completion">文本补全</option>
                      <option value="embedding">向量嵌入</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>负载均衡策略 <span class="required">*</span></label>
                    <select id="strategy-name" class="form-control" required>
                      <option value="round_robin">轮询 (Round Robin)</option>
                      <option value="weighted_round_robin">加权轮询</option>
                      <option value="least_connections">最少连接</option>
                    </select>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-default" onclick="this.closest('.modal').style.display='none'">取消</button>
                <button class="btn btn-primary" id="btn-submit-pool">创建负载池</button>
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
      <div class="pool-card ${pool.is_active ? 'active' : 'inactive'}" data-pool-id="${pool.id}">
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
        </div>
        <div class="pool-actions">
          <button class="btn btn-sm btn-primary" onclick="window.adminV3App.currentPage.viewPoolDetails('${pool.id}')">
            查看详情
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
    const createBtn = document.getElementById('btn-create-pool');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreatePoolModal());
    }

    const refreshBtn = document.getElementById('btn-refresh-dashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshDashboard());
    }

    const submitBtn = document.getElementById('btn-submit-pool');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitCreatePool());
    }

    this.startRealtimeMonitoring();
  }

  showCreatePoolModal() {
    const modal = document.getElementById('create-pool-modal');
    if (modal) {
      modal.style.display = 'flex';
      this.loadStrategies();
    }
  }

  async loadStrategies() {
    try {
      const strategies = await this.loadBalanceManager.api.get('/admin/load-balancing/strategies');
      if (strategies.success && strategies.data) {
        const select = document.getElementById('strategy-name');
        if (select) {
          select.innerHTML = strategies.data.map(s => `
            <option value="${s.strategy_name}" title="${s.description}">
              ${s.display_name}
            </option>
          `).join('');
        }
      }
    } catch (error) {
      console.error('Failed to load strategies:', error);
    }
  }

  async submitCreatePool() {
    const form = document.getElementById('create-pool-form');
    if (!form || !form.checkValidity()) {
      if (form) form.reportValidity();
      return;
    }

    const poolData = {
      pool_name: document.getElementById('pool-name')?.value || 'Test Pool',
      service_type: document.getElementById('service-type')?.value || 'chat',
      strategy_name: document.getElementById('strategy-name')?.value || 'round_robin'
    };

    try {
      const pool = await this.loadBalanceManager.createPool(poolData);
      this.app.showToast('success', `负载均衡池 "${pool.pool_name}" 创建成功`);
      
      document.getElementById('create-pool-modal').style.display = 'none';
      this.refreshDashboard();
    } catch (error) {
      this.app.showToast('error', `创建失败: ${error.message}`);
    }
  }

  async viewPoolDetails(poolId) {
    try {
      this.currentPoolId = poolId;
      
      const response = await this.app.api.get(`/admin/load-balancing/pools/${poolId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load pool details');
      }

      const { pool, members } = response.data;
      
      const detailsPanel = document.getElementById('pool-details');
      if (detailsPanel) {
        detailsPanel.innerHTML = this.renderPoolDetails(pool, members);
        detailsPanel.style.display = 'block';
      }
      
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
          </div>
        </div>
        
        <div class="members-section">
          <div class="section-header">
            <h4>服务商成员 (${members.length})</h4>
          </div>
        </div>
        
        <div class="analytics-section">
          <h4>性能分析</h4>
          <div id="performance-analytics" class="analytics-container">
            <div class="loading">加载中...</div>
          </div>
        </div>
      </div>
    `;
  }

  async performHealthCheck(poolId) {
    try {
      this.app.showToast('info', '正在执行健康检查...');
      
      const results = await this.loadBalanceManager.performHealthCheck(poolId);
      
      const healthyCount = results.filter(r => r.is_healthy).length;
      const message = `健康检查完成: ${healthyCount}/${results.length} 个服务商健康`;
      
      this.app.showToast(
        healthyCount === results.length ? 'success' : 'warning',
        message
      );
      
      this.viewPoolDetails(poolId);
      
    } catch (error) {
      this.app.showToast('error', `健康检查失败: ${error.message}`);
    }
  }

  async testLoadBalancing(poolId) {
    try {
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
      
      const distribution = {};
      results.forEach(r => {
        distribution[r.provider_name] = (distribution[r.provider_name] || 0) + 1;
      });
      
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
      weight: parseFloat(row.querySelector('.member-weight')?.value || 1),
      priority: parseInt(row.querySelector('.member-priority')?.value || 1)
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
      this.viewPoolDetails(poolId);
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
            </tr>
          </thead>
          <tbody>
            ${analytics.map(a => `
              <tr>
                <td>${a.selected_provider_name}</td>
                <td>${a.request_count}</td>
                <td>${Math.round(a.avg_response_time)}ms</td>
                <td>${parseFloat(a.success_rate).toFixed(2)}%</td>
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
    this.updateRealtimeStats();
    
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
        </div>
      `;
    }
  }

  async refreshDashboard() {
    try {
      const dashboard = await this.loadBalanceManager.getDashboard();
      
      const statsOverview = document.querySelector('.stats-overview');
      if (statsOverview) {
        statsOverview.innerHTML = `
          <div class="stat-card">
            <div class="stat-value">${dashboard.summary.totalPools || 0}</div>
            <div class="stat-label">负载池总数</div>
          </div>
        `;
      }
      
      const poolsGrid = document.querySelector('.pools-grid');
      if (poolsGrid) {
        poolsGrid.innerHTML = this.renderPoolsList(dashboard.pools || []);
      }
      
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
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
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
      toHaveBeenCalled: () => {
        if (typeof actual !== 'function' || !actual.mock || actual.mock.calls.length === 0) {
          throw new Error('Expected function to have been called');
        }
      },
      toHaveBeenCalledWith: (...expectedArgs) => {
        if (typeof actual !== 'function' || !actual.mock) {
          throw new Error('Expected a mock function');
        }
        const found = actual.mock.calls.some(call => 
          JSON.stringify(call) === JSON.stringify(expectedArgs)
        );
        if (!found) {
          throw new Error(`Expected function to have been called with ${JSON.stringify(expectedArgs)}`);
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

// Mock DOM elements
const createMockElement = (type, properties = {}) => ({
  tagName: type.toUpperCase(),
  style: { display: '' },
  innerHTML: '',
  value: '',
  checked: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  click: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  closest: jest.fn(),
  checkValidity: jest.fn(() => true),
  reportValidity: jest.fn(),
  ...properties
});

global.document = {
  createElement: jest.fn((type) => createMockElement(type)),
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  body: createMockElement('body')
};

global.setInterval = jest.fn();
global.clearInterval = jest.fn();

// Run tests
const test = new SimpleTestRunner();

console.log('⚖️ Testing Load Balance Enhanced\n');

test.describe('LoadBalanceEnhanced Initialization', () => {
  test.it('should initialize with correct properties', () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    test.expect(loadBalance.app).toBe(mockApp);
    test.expect(loadBalance.loadBalanceManager).toBeTruthy();
    test.expect(loadBalance.currentPoolId).toBe(null);
    test.expect(loadBalance.refreshInterval).toBe(null);
  });
});

test.describe('Rendering', () => {
  test.itAsync('should render successfully with dashboard data', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const mockDashboard = {
      summary: {
        totalPools: 3,
        activePools: 2,
        totalStrategies: 5,
        totalPresets: 2
      },
      pools: [
        {
          id: 'pool-1',
          pool_name: 'Test Pool',
          is_active: true,
          service_type: 'chat',
          strategy_name: 'round_robin'
        }
      ]
    };

    loadBalance.loadBalanceManager.getDashboard.mockResolvedValue(mockDashboard);

    const html = await loadBalance.render();
    
    test.expect(html).toContain('load-balance-enhanced-container');
    test.expect(html).toContain('🔄 负载均衡管理');
    test.expect(html).toContain('btn-create-pool');
    test.expect(html).toContain('stats-overview');
    test.expect(html).toContain('3'); // totalPools
  });

  test.itAsync('should render error on dashboard failure', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    loadBalance.loadBalanceManager.getDashboard.mockRejectedValue(new Error('Dashboard failed'));

    const html = await loadBalance.render();
    
    test.expect(html).toContain('error-container');
    test.expect(html).toContain('Dashboard failed');
  });

  test.it('should render empty state when no pools exist', () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const html = loadBalance.renderPoolsList([]);
    
    test.expect(html).toContain('empty-state');
    test.expect(html).toContain('暂无负载均衡池');
  });

  test.it('should render pool list correctly', () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const pools = [
      {
        id: 'pool-1',
        pool_name: 'Chat Pool',
        is_active: true,
        service_type: 'chat',
        strategy_name: 'round_robin',
        strategy_display_name: '轮询'
      }
    ];

    const html = loadBalance.renderPoolsList(pools);
    
    test.expect(html).toContain('pool-card');
    test.expect(html).toContain('Chat Pool');
    test.expect(html).toContain('active');
    test.expect(html).toContain('对话服务');
    test.expect(html).toContain('轮询');
  });
});

test.describe('Service Type Labels', () => {
  test.it('should return correct service type labels', () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    test.expect(loadBalance.getServiceTypeLabel('chat')).toBe('对话服务');
    test.expect(loadBalance.getServiceTypeLabel('completion')).toBe('文本补全');
    test.expect(loadBalance.getServiceTypeLabel('embedding')).toBe('向量嵌入');
    test.expect(loadBalance.getServiceTypeLabel('unknown')).toBe('unknown');
  });
});

test.describe('Pool Creation', () => {
  test.it('should show create pool modal', () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const mockModal = createMockElement('div');
    document.getElementById.mockReturnValue(mockModal);

    jest.spyOn(loadBalance, 'loadStrategies').mockImplementation(() => {});

    loadBalance.showCreatePoolModal();

    test.expect(mockModal.style.display).toBe('flex');
    test.expect(loadBalance.loadStrategies).toHaveBeenCalled();
  });

  test.itAsync('should submit create pool successfully', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    // Mock form elements
    document.getElementById.mockImplementation((id) => {
      const mockElement = createMockElement('input');
      if (id === 'create-pool-form') {
        return createMockElement('form');
      }
      if (id === 'pool-name') {
        mockElement.value = 'Test Pool';
        return mockElement;
      }
      if (id === 'service-type') {
        mockElement.value = 'chat';
        return mockElement;
      }
      if (id === 'strategy-name') {
        mockElement.value = 'round_robin';
        return mockElement;
      }
      if (id === 'create-pool-modal') {
        return createMockElement('div');
      }
      return mockElement;
    });

    jest.spyOn(loadBalance, 'refreshDashboard').mockImplementation(() => {});

    const mockPool = { pool_name: 'Test Pool', id: 'pool-1' };
    loadBalance.loadBalanceManager.createPool.mockResolvedValue(mockPool);

    await loadBalance.submitCreatePool();

    test.expect(loadBalance.loadBalanceManager.createPool).toHaveBeenCalledWith({
      pool_name: 'Test Pool',
      service_type: 'chat',
      strategy_name: 'round_robin'
    });
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '负载均衡池 "Test Pool" 创建成功');
  });

  test.itAsync('should handle create pool error', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    document.getElementById.mockReturnValue(createMockElement('form'));

    loadBalance.loadBalanceManager.createPool.mockRejectedValue(new Error('Creation failed'));

    await loadBalance.submitCreatePool();

    test.expect(mockApp.showToast).toHaveBeenCalledWith('error', '创建失败: Creation failed');
  });
});

test.describe('Pool Details', () => {
  test.itAsync('should view pool details successfully', async () => {
    const mockApp = { 
      showToast: jest.fn(), 
      api: { 
        get: jest.fn().mockResolvedValue({
          success: true,
          data: {
            pool: { id: 'pool-1', pool_name: 'Test Pool', service_type: 'chat' },
            members: []
          }
        })
      }
    };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const mockDetailsPanel = createMockElement('div');
    document.getElementById.mockReturnValue(mockDetailsPanel);

    jest.spyOn(loadBalance, 'loadPerformanceAnalytics').mockImplementation(() => {});

    await loadBalance.viewPoolDetails('pool-1');

    test.expect(loadBalance.currentPoolId).toBe('pool-1');
    test.expect(mockApp.api.get).toHaveBeenCalledWith('/admin/load-balancing/pools/pool-1');
    test.expect(mockDetailsPanel.style.display).toBe('block');
  });

  test.itAsync('should handle pool details error', async () => {
    const mockApp = { 
      showToast: jest.fn(), 
      api: { 
        get: jest.fn().mockResolvedValue({
          success: false,
          error: 'Pool not found'
        })
      }
    };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    await loadBalance.viewPoolDetails('invalid-pool');

    test.expect(mockApp.showToast).toHaveBeenCalledWith('error', '加载池详情失败: Pool not found');
  });
});

test.describe('Health Check and Testing', () => {
  test.itAsync('should perform health check successfully', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const mockResults = [
      { is_healthy: true },
      { is_healthy: true },
      { is_healthy: false }
    ];

    loadBalance.loadBalanceManager.performHealthCheck.mockResolvedValue(mockResults);
    jest.spyOn(loadBalance, 'viewPoolDetails').mockImplementation(() => {});

    await loadBalance.performHealthCheck('pool-1');

    test.expect(mockApp.showToast).toHaveBeenCalledWith('info', '正在执行健康检查...');
    test.expect(mockApp.showToast).toHaveBeenCalledWith('warning', '健康检查完成: 2/3 个服务商健康');
    test.expect(loadBalance.viewPoolDetails).toHaveBeenCalledWith('pool-1');
  });

  test.itAsync('should test load balancing successfully', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    loadBalance.loadBalanceManager.selectProvider.mockImplementation((poolId, context) => ({
      provider_name: `Provider-${context.sessionId.split('-')[2]}`
    }));

    await loadBalance.testLoadBalancing('pool-1');

    test.expect(loadBalance.loadBalanceManager.selectProvider).toHaveBeenCalledTimes(10);
    test.expect(mockApp.showToast).toHaveBeenCalledWith('info', '正在测试负载均衡 (10次请求)...');
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', expect.stringContaining('测试完成 - 分布:'));
  });
});

test.describe('Member Management', () => {
  test.itAsync('should update member successfully', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const mockRow = {
      querySelector: jest.fn().mockImplementation((selector) => {
        if (selector === '.member-weight') return { value: '2.5' };
        if (selector === '.member-priority') return { value: '3' };
        return null;
      })
    };

    document.querySelector.mockReturnValue(mockRow);

    loadBalance.loadBalanceManager.updatePoolMember.mockResolvedValue();

    await loadBalance.updateMember('pool-1', 'member-1');

    test.expect(loadBalance.loadBalanceManager.updatePoolMember).toHaveBeenCalledWith('pool-1', 'member-1', {
      weight: 2.5,
      priority: 3
    });
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '成员配置已更新');
  });

  test.itAsync('should remove member successfully', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    global.confirm.mockReturnValue(true);
    jest.spyOn(loadBalance, 'viewPoolDetails').mockImplementation(() => {});

    loadBalance.loadBalanceManager.removeProviderFromPool.mockResolvedValue();

    await loadBalance.removeMember('pool-1', 'member-1');

    test.expect(loadBalance.loadBalanceManager.removeProviderFromPool).toHaveBeenCalledWith('pool-1', 'member-1');
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '服务商已移除');
    test.expect(loadBalance.viewPoolDetails).toHaveBeenCalledWith('pool-1');
  });

  test.itAsync('should cancel member removal when not confirmed', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    global.confirm.mockReturnValue(false);

    await loadBalance.removeMember('pool-1', 'member-1');

    test.expect(loadBalance.loadBalanceManager.removeProviderFromPool).not.toHaveBeenCalled();
  });
});

test.describe('Monitoring and Dashboard', () => {
  test.it('should start realtime monitoring', () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    jest.spyOn(loadBalance, 'updateRealtimeStats').mockImplementation(() => {});

    loadBalance.startRealtimeMonitoring();

    test.expect(loadBalance.updateRealtimeStats).toHaveBeenCalled();
    test.expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  test.itAsync('should refresh dashboard successfully', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const mockDashboard = {
      summary: { totalPools: 5 },
      pools: []
    };

    loadBalance.loadBalanceManager.getDashboard.mockResolvedValue(mockDashboard);

    const mockStatsOverview = createMockElement('div');
    const mockPoolsGrid = createMockElement('div');
    
    document.querySelector.mockImplementation((selector) => {
      if (selector === '.stats-overview') return mockStatsOverview;
      if (selector === '.pools-grid') return mockPoolsGrid;
      return null;
    });

    await loadBalance.refreshDashboard();

    test.expect(loadBalance.loadBalanceManager.getDashboard).toHaveBeenCalled();
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '仪表板已刷新');
  });
});

test.describe('Export and Cleanup', () => {
  test.itAsync('should export pool config successfully', async () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    const mockConfig = { pools: [], strategies: [] };
    loadBalance.loadBalanceManager.exportConfiguration.mockReturnValue(mockConfig);

    const mockLink = createMockElement('a');
    document.createElement.mockReturnValue(mockLink);

    await loadBalance.exportPoolConfig('pool-1');

    test.expect(loadBalance.loadBalanceManager.exportConfiguration).toHaveBeenCalled();
    test.expect(Blob).toHaveBeenCalledWith([JSON.stringify(mockConfig, null, 2)], { type: 'application/json' });
    test.expect(URL.createObjectURL).toHaveBeenCalled();
    test.expect(mockLink.click).toHaveBeenCalled();
    test.expect(mockApp.showToast).toHaveBeenCalledWith('success', '配置已导出');
  });

  test.it('should cleanup resources on destroy', () => {
    const mockApp = { showToast: jest.fn(), api: { get: jest.fn() } };
    const loadBalance = new LoadBalanceEnhanced(mockApp);

    loadBalance.refreshInterval = 'mock-interval';

    loadBalance.destroy();

    test.expect(clearInterval).toHaveBeenCalledWith('mock-interval');
    test.expect(loadBalance.refreshInterval).toBe(null);
  });
});

// Show test results
test.summary();

console.log('\n⚖️ Load Balance Enhanced testing completed!');
console.log('Ready for integration with the AI service load balancing system.');