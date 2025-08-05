/**
 * Load Balance Manager
 * 负载均衡管理器 - 集成真实的负载均衡算法
 */

export class LoadBalanceManager {
  constructor(apiClient) {
    this.api = apiClient;
    
    // 负载均衡策略
    this.strategies = {
      ROUND_ROBIN: 'round_robin',
      WEIGHTED_ROUND_ROBIN: 'weighted_round_robin',
      LEAST_CONNECTIONS: 'least_connections',
      RESPONSE_TIME: 'response_time',
      WEIGHTED_RESPONSE_TIME: 'weighted_response_time',
      RANDOM: 'random',
      HASH: 'hash',
      ADAPTIVE: 'adaptive'
    };

    // 本地状态缓存
    this.pools = new Map();
    this.providerMetrics = new Map();
    this.selectionHistory = new Map();
    
    // 性能监控
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0
    };
    
    // 初始化
    this.initialize();
  }

  /**
   * 初始化负载均衡管理器
   */
  async initialize() {
    try {
      // 加载所有池配置
      const pools = await this.api.get('/admin/load-balancing/pools');
      if (pools.success && pools.data) {
        pools.data.forEach(pool => {
          this.pools.set(pool.id, pool);
        });
      }
      
      console.log(`Initialized load balance manager with ${this.pools.size} pools`);
    } catch (error) {
      console.error('Failed to initialize load balance manager:', error);
    }
  }

  /**
   * 获取负载均衡仪表板数据
   */
  async getDashboard() {
    try {
      const response = await this.api.get('/admin/load-balancing/dashboard');
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get dashboard');
    } catch (error) {
      console.error('Failed to get load balancing dashboard:', error);
      throw error;
    }
  }

  /**
   * 创建新的负载均衡池
   */
  async createPool(poolData) {
    try {
      const response = await this.api.post('/admin/load-balancing/pools', poolData);
      if (response.success) {
        this.pools.set(response.data.id, response.data);
        return response.data;
      }
      throw new Error(response.error || 'Failed to create pool');
    } catch (error) {
      console.error('Failed to create load balancing pool:', error);
      throw error;
    }
  }

  /**
   * 更新负载均衡池配置
   */
  async updatePool(poolId, updateData) {
    try {
      const response = await this.api.put(`/admin/load-balancing/pools/${poolId}`, updateData);
      if (response.success) {
        this.pools.set(poolId, response.data);
        return response.data;
      }
      throw new Error(response.error || 'Failed to update pool');
    } catch (error) {
      console.error('Failed to update load balancing pool:', error);
      throw error;
    }
  }

  /**
   * 添加服务商到池
   */
  async addProviderToPool(poolId, providerData) {
    try {
      const response = await this.api.post(`/admin/load-balancing/pools/${poolId}/members`, providerData);
      if (response.success) {
        // 更新本地缓存
        const pool = this.pools.get(poolId);
        if (pool) {
          pool.total_providers = (pool.total_providers || 0) + 1;
        }
        return response.data;
      }
      throw new Error(response.error || 'Failed to add provider');
    } catch (error) {
      console.error('Failed to add provider to pool:', error);
      throw error;
    }
  }

  /**
   * 更新池成员配置
   */
  async updatePoolMember(poolId, memberId, updateData) {
    try {
      const response = await this.api.put(
        `/admin/load-balancing/pools/${poolId}/members/${memberId}`, 
        updateData
      );
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to update member');
    } catch (error) {
      console.error('Failed to update pool member:', error);
      throw error;
    }
  }

  /**
   * 从池中移除服务商
   */
  async removeProviderFromPool(poolId, memberId) {
    try {
      const response = await this.api.delete(
        `/admin/load-balancing/pools/${poolId}/members/${memberId}`
      );
      if (response.success) {
        // 更新本地缓存
        const pool = this.pools.get(poolId);
        if (pool && pool.total_providers > 0) {
          pool.total_providers--;
        }
        return true;
      }
      throw new Error(response.error || 'Failed to remove provider');
    } catch (error) {
      console.error('Failed to remove provider from pool:', error);
      throw error;
    }
  }

  /**
   * 选择最佳服务商 (核心算法)
   */
  async selectProvider(poolId, options = {}) {
    try {
      const response = await this.api.post(`/admin/load-balancing/pools/${poolId}/test-selection`, {
        user_id: options.userId,
        session_id: options.sessionId,
        request_type: options.requestType || 'api_call'
      });
      
      if (response.success) {
        // 记录选择历史
        this.recordSelection(poolId, response.data.selected_provider);
        return response.data.selected_provider;
      }
      throw new Error(response.error || 'Failed to select provider');
    } catch (error) {
      console.error('Failed to select provider:', error);
      // 降级到本地算法
      return this.localProviderSelection(poolId, options);
    }
  }

  /**
   * 本地服务商选择算法 (降级方案)
   */
  localProviderSelection(poolId, options) {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    const strategy = pool.strategy_name || 'round_robin';
    const providers = pool.members || [];
    
    if (providers.length === 0) {
      throw new Error('No providers available in pool');
    }

    // 过滤健康的服务商
    const healthyProviders = providers.filter(p => 
      p.is_active && p.is_healthy && p.circuit_breaker_state === 'closed'
    );

    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    // 根据策略选择
    switch (strategy) {
      case this.strategies.ROUND_ROBIN:
        return this.localRoundRobin(poolId, healthyProviders);
      
      case this.strategies.WEIGHTED_ROUND_ROBIN:
        return this.localWeightedRoundRobin(healthyProviders);
      
      case this.strategies.LEAST_CONNECTIONS:
        return this.localLeastConnections(healthyProviders);
      
      case this.strategies.RESPONSE_TIME:
        return this.localResponseTime(healthyProviders);
      
      case this.strategies.RANDOM:
        return this.localRandom(healthyProviders);
      
      default:
        return this.localRoundRobin(poolId, healthyProviders);
    }
  }

  /**
   * 本地轮询算法
   */
  localRoundRobin(poolId, providers) {
    const historyKey = `rr_${poolId}`;
    let lastIndex = this.selectionHistory.get(historyKey) || -1;
    const nextIndex = (lastIndex + 1) % providers.length;
    this.selectionHistory.set(historyKey, nextIndex);
    
    return providers[nextIndex];
  }

  /**
   * 本地加权轮询算法
   */
  localWeightedRoundRobin(providers) {
    const totalWeight = providers.reduce((sum, p) => sum + (p.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const provider of providers) {
      random -= (provider.weight || 1);
      if (random <= 0) {
        return provider;
      }
    }
    
    return providers[0]; // Fallback
  }

  /**
   * 本地最少连接算法
   */
  localLeastConnections(providers) {
    return providers.reduce((selected, current) => {
      const selectedConns = selected.concurrent_requests || 0;
      const currentConns = current.concurrent_requests || 0;
      return currentConns < selectedConns ? current : selected;
    });
  }

  /**
   * 本地响应时间算法
   */
  localResponseTime(providers) {
    return providers.reduce((selected, current) => {
      const selectedTime = selected.avg_response_time_ms || 999999;
      const currentTime = current.avg_response_time_ms || 999999;
      return currentTime < selectedTime ? current : selected;
    });
  }

  /**
   * 本地随机算法
   */
  localRandom(providers) {
    const randomIndex = Math.floor(Math.random() * providers.length);
    return providers[randomIndex];
  }

  /**
   * 记录性能指标
   */
  async recordMetrics(providerName, metrics) {
    try {
      // 更新本地缓存
      this.providerMetrics.set(providerName, {
        ...this.providerMetrics.get(providerName) || {},
        ...metrics,
        lastUpdate: Date.now()
      });

      // 发送到服务器
      await this.api.post('/admin/load-balancing/metrics', {
        provider_name: providerName,
        response_time_ms: metrics.responseTime,
        success: metrics.success,
        concurrent_requests: metrics.concurrentRequests,
        error_message: metrics.errorMessage
      });

      // 更新全局统计
      this.updateGlobalMetrics(metrics);
    } catch (error) {
      console.error('Failed to record metrics:', error);
    }
  }

  /**
   * 更新全局性能指标
   */
  updateGlobalMetrics(metrics) {
    this.performanceMetrics.totalRequests++;
    
    if (metrics.success) {
      this.performanceMetrics.successfulRequests++;
    } else {
      this.performanceMetrics.failedRequests++;
    }
    
    // 计算移动平均响应时间
    const alpha = 0.1; // 平滑因子
    this.performanceMetrics.avgResponseTime = 
      alpha * metrics.responseTime + 
      (1 - alpha) * this.performanceMetrics.avgResponseTime;
  }

  /**
   * 触发健康检查
   */
  async performHealthCheck(poolId) {
    try {
      const response = await this.api.post(`/admin/load-balancing/pools/${poolId}/health-check`);
      if (response.success) {
        return response.data.health_results;
      }
      throw new Error(response.error || 'Health check failed');
    } catch (error) {
      console.error('Failed to perform health check:', error);
      throw error;
    }
  }

  /**
   * 获取性能分析
   */
  async getPerformanceAnalytics(poolId, timeRange = '24 hours') {
    try {
      const response = await this.api.get(
        `/admin/load-balancing/pools/${poolId}/analytics?timeRange=${timeRange}`
      );
      if (response.success) {
        return response.data.analytics;
      }
      throw new Error(response.error || 'Failed to get analytics');
    } catch (error) {
      console.error('Failed to get performance analytics:', error);
      throw error;
    }
  }

  /**
   * 获取最近的负载均衡决策
   */
  async getRecentDecisions(poolId, limit = 100) {
    try {
      const response = await this.api.get(
        `/admin/load-balancing/pools/${poolId}/decisions?limit=${limit}`
      );
      if (response.success) {
        return response.data.decisions;
      }
      throw new Error(response.error || 'Failed to get decisions');
    } catch (error) {
      console.error('Failed to get recent decisions:', error);
      throw error;
    }
  }

  /**
   * 记录选择历史
   */
  recordSelection(poolId, provider) {
    const key = `selection_${poolId}`;
    const history = this.selectionHistory.get(key) || [];
    
    history.push({
      provider: provider.provider_name,
      timestamp: Date.now(),
      strategy: provider.selection_reason
    });
    
    // 保留最近100条记录
    if (history.length > 100) {
      history.shift();
    }
    
    this.selectionHistory.set(key, history);
  }

  /**
   * 获取实时统计
   */
  getRealtimeStats() {
    const successRate = this.performanceMetrics.totalRequests > 0
      ? (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests * 100).toFixed(2)
      : 0;

    return {
      totalRequests: this.performanceMetrics.totalRequests,
      successRate: successRate + '%',
      avgResponseTime: Math.round(this.performanceMetrics.avgResponseTime) + 'ms',
      activeProviders: this.providerMetrics.size
    };
  }

  /**
   * 导出负载均衡配置
   */
  exportConfiguration() {
    const config = {
      pools: Array.from(this.pools.values()),
      metrics: Array.from(this.providerMetrics.entries()).map(([name, metrics]) => ({
        provider: name,
        ...metrics
      })),
      exportDate: new Date().toISOString()
    };

    return config;
  }

  /**
   * 导入负载均衡配置
   */
  async importConfiguration(config) {
    try {
      // 导入池配置
      for (const pool of config.pools) {
        await this.createPool(pool);
      }
      
      // 导入指标数据
      if (config.metrics) {
        config.metrics.forEach(metric => {
          this.providerMetrics.set(metric.provider, metric);
        });
      }
      
      return { success: true, imported: config.pools.length };
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw error;
    }
  }
}

// 创建默认实例
let loadBalanceManager = null;

export function getLoadBalanceManager(apiClient) {
  if (!loadBalanceManager && apiClient) {
    loadBalanceManager = new LoadBalanceManager(apiClient);
  }
  return loadBalanceManager;
}