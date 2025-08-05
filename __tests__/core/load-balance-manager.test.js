/**
 * 负载均衡管理器测试
 */

import { jest } from '@jest/globals';

describe('LoadBalanceManager', () => {
  let LoadBalanceManager;
  let manager;
  let mockApiClient;

  beforeEach(async () => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };

    const module = await import('../../_core/load-balance-manager.js');
    LoadBalanceManager = module.LoadBalanceManager;
    manager = new LoadBalanceManager(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化', () => {
      expect(manager).toBeDefined();
      expect(manager.pools).toEqual({});
      expect(manager.strategies).toBeDefined();
      expect(manager.performanceMetrics).toMatchObject({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      });
    });

    test('应该注册所有默认策略', () => {
      const expectedStrategies = [
        'round_robin',
        'weighted_round_robin',
        'least_connections',
        'response_time',
        'weighted_response_time',
        'random',
        'hash',
        'adaptive'
      ];

      expectedStrategies.forEach(strategy => {
        expect(manager.strategies[strategy]).toBeDefined();
        expect(typeof manager.strategies[strategy]).toBe('function');
      });
    });
  });

  describe('负载池管理', () => {
    test('应该获取所有负载池', async () => {
      const mockPools = [
        { id: 1, pool_name: 'Chat Pool', strategy: 'round_robin' },
        { id: 2, pool_name: 'Image Pool', strategy: 'weighted_round_robin' }
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: { pools: mockPools }
      });

      const pools = await manager.getPools();
      
      expect(pools).toEqual(mockPools);
      expect(mockApiClient.get).toHaveBeenCalledWith('/admin/load-balancing/pools');
    });

    test('应该创建新的负载池', async () => {
      const poolData = {
        pool_name: 'Test Pool',
        service_type: 'chat',
        strategy_name: 'round_robin',
        strategy_config: {}
      };

      const createdPool = { id: 3, ...poolData };
      
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: createdPool
      });

      const result = await manager.createPool(poolData);
      
      expect(result).toEqual(createdPool);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/admin/load-balancing/pools',
        poolData
      );
    });

    test('应该更新负载池', async () => {
      const poolId = 1;
      const updates = { strategy_name: 'weighted_round_robin' };
      
      mockApiClient.put.mockResolvedValue({
        success: true,
        data: { id: poolId, ...updates }
      });

      const result = await manager.updatePool(poolId, updates);
      
      expect(result.strategy_name).toBe('weighted_round_robin');
      expect(mockApiClient.put).toHaveBeenCalledWith(
        `/admin/load-balancing/pools/${poolId}`,
        updates
      );
    });

    test('应该删除负载池', async () => {
      const poolId = 1;
      
      mockApiClient.delete.mockResolvedValue({ success: true });

      const result = await manager.deletePool(poolId);
      
      expect(result).toBe(true);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        `/admin/load-balancing/pools/${poolId}`
      );
    });
  });

  describe('服务商选择', () => {
    test('应该通过API选择服务商', async () => {
      const poolId = 1;
      const selectedProvider = {
        id: 'provider-1',
        name: 'OpenAI',
        weight: 100
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: { selected_provider: selectedProvider }
      });

      const result = await manager.selectProvider(poolId, {
        userId: 'user-123',
        sessionId: 'session-456'
      });

      expect(result).toEqual(selectedProvider);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/admin/load-balancing/pools/${poolId}/test-selection`,
        {
          user_id: 'user-123',
          session_id: 'session-456',
          request_type: undefined
        }
      );
    });

    test('应该在API失败时使用本地选择', async () => {
      const poolId = 1;
      
      // 设置本地池数据
      manager.pools[poolId] = {
        id: poolId,
        strategy: 'round_robin',
        providers: [
          { id: 'p1', weight: 100, healthy: true },
          { id: 'p2', weight: 50, healthy: true }
        ]
      };

      mockApiClient.post.mockRejectedValue(new Error('API Error'));

      const result = await manager.selectProvider(poolId);

      expect(result).toBeDefined();
      expect(['p1', 'p2']).toContain(result.id);
    });
  });

  describe('负载均衡策略', () => {
    const mockProviders = [
      { id: 'p1', weight: 100, healthy: true, connections: 5 },
      { id: 'p2', weight: 200, healthy: true, connections: 3 },
      { id: 'p3', weight: 150, healthy: false, connections: 0 }
    ];

    test('轮询策略应该循环选择健康的服务商', () => {
      const strategy = manager.strategies.round_robin;
      const context = { index: 0 };

      const selections = [];
      for (let i = 0; i < 4; i++) {
        selections.push(strategy(mockProviders, {}, context).id);
      }

      expect(selections).toEqual(['p1', 'p2', 'p1', 'p2']);
    });

    test('加权轮询应该按权重比例选择', () => {
      const strategy = manager.strategies.weighted_round_robin;
      const context = { weightIndex: 0, currentProvider: 0 };

      const selections = [];
      for (let i = 0; i < 6; i++) {
        selections.push(strategy(mockProviders, {}, context).id);
      }

      // p1权重100, p2权重200, 所以p2应该被选择2倍于p1
      const p1Count = selections.filter(id => id === 'p1').length;
      const p2Count = selections.filter(id => id === 'p2').length;
      
      expect(p2Count).toBeGreaterThanOrEqual(p1Count);
    });

    test('最少连接策略应该选择连接数最少的', () => {
      const strategy = manager.strategies.least_connections;
      
      const selected = strategy(mockProviders);
      
      expect(selected.id).toBe('p2'); // p2有3个连接，p1有5个
    });

    test('随机策略应该随机选择健康的服务商', () => {
      const strategy = manager.strategies.random;
      
      const selections = new Set();
      for (let i = 0; i < 20; i++) {
        selections.add(strategy(mockProviders).id);
      }

      // 应该选择到多个不同的服务商
      expect(selections.size).toBeGreaterThan(1);
      expect(selections.has('p3')).toBe(false); // 不健康的不应被选择
    });

    test('哈希策略应该基于会话ID一致性选择', () => {
      const strategy = manager.strategies.hash;
      const options1 = { sessionId: 'session-123' };
      const options2 = { sessionId: 'session-456' };

      // 相同会话应该选择相同服务商
      const selected1a = strategy(mockProviders, options1);
      const selected1b = strategy(mockProviders, options1);
      expect(selected1a.id).toBe(selected1b.id);

      // 不同会话可能选择不同服务商
      const selected2 = strategy(mockProviders, options2);
      // 这个测试不能保证一定不同，但验证逻辑正确性
      expect(selected2).toBeDefined();
    });
  });

  describe('健康检查', () => {
    test('应该执行健康检查', async () => {
      const poolId = 1;
      const healthResults = {
        'provider-1': { healthy: true, latency: 100 },
        'provider-2': { healthy: false, error: 'Timeout' }
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: healthResults
      });

      const results = await manager.healthCheck(poolId);

      expect(results).toEqual(healthResults);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/admin/load-balancing/pools/${poolId}/health-check`
      );
    });

    test('应该更新本地健康状态', async () => {
      const poolId = 1;
      manager.pools[poolId] = {
        providers: [
          { id: 'provider-1', healthy: true },
          { id: 'provider-2', healthy: true }
        ]
      };

      const healthResults = {
        'provider-1': { healthy: true },
        'provider-2': { healthy: false }
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: healthResults
      });

      await manager.healthCheck(poolId);

      expect(manager.pools[poolId].providers[0].healthy).toBe(true);
      expect(manager.pools[poolId].providers[1].healthy).toBe(false);
    });
  });

  describe('性能监控', () => {
    test('应该更新全局性能指标', () => {
      const initialMetrics = { ...manager.performanceMetrics };

      // 成功请求
      manager.updateGlobalMetrics({
        success: true,
        responseTime: 150,
        providerId: 'p1'
      });

      expect(manager.performanceMetrics.totalRequests).toBe(initialMetrics.totalRequests + 1);
      expect(manager.performanceMetrics.successfulRequests).toBe(initialMetrics.successfulRequests + 1);

      // 失败请求
      manager.updateGlobalMetrics({
        success: false,
        responseTime: 5000,
        providerId: 'p2'
      });

      expect(manager.performanceMetrics.failedRequests).toBe(initialMetrics.failedRequests + 1);
    });

    test('应该计算移动平均响应时间', () => {
      manager.performanceMetrics.avgResponseTime = 100;

      manager.updateGlobalMetrics({
        success: true,
        responseTime: 200
      });

      // 使用指数移动平均，alpha = 0.1
      // 新平均 = 0.1 * 200 + 0.9 * 100 = 110
      expect(manager.performanceMetrics.avgResponseTime).toBe(110);
    });

    test('应该获取性能统计', async () => {
      const mockStats = {
        summary: {
          total_requests: 1000,
          success_rate: 0.95,
          avg_response_time: 120
        },
        by_provider: {
          'provider-1': { requests: 500, success_rate: 0.98 },
          'provider-2': { requests: 500, success_rate: 0.92 }
        }
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const stats = await manager.getPerformanceStats();

      expect(stats).toEqual(mockStats);
      expect(mockApiClient.get).toHaveBeenCalledWith('/admin/load-balancing/stats');
    });
  });

  describe('配置管理', () => {
    test('应该导出配置', async () => {
      manager.pools = {
        1: { id: 1, name: 'Pool 1', strategy: 'round_robin' },
        2: { id: 2, name: 'Pool 2', strategy: 'weighted_round_robin' }
      };

      const exported = await manager.exportConfig();

      expect(exported).toMatchObject({
        version: '1.0.0',
        timestamp: expect.any(Number),
        pools: expect.any(Array),
        strategies: expect.any(Object)
      });
    });

    test('应该导入配置', async () => {
      const config = {
        version: '1.0.0',
        pools: [
          { id: 1, name: 'Imported Pool', strategy: 'round_robin' }
        ],
        strategies: {
          custom_strategy: 'function() { return providers[0]; }'
        }
      };

      mockApiClient.post.mockResolvedValue({ success: true });

      const result = await manager.importConfig(config);

      expect(result).toBe(true);
      expect(manager.pools[1]).toBeDefined();
    });
  });

  describe('错误处理', () => {
    test('应该处理API错误', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(manager.getPools()).rejects.toThrow('Network error');
    });

    test('应该处理无效的策略名称', () => {
      expect(() => {
        manager.strategies.invalid_strategy([]);
      }).toThrow();
    });

    test('应该处理空的服务商列表', () => {
      const strategy = manager.strategies.round_robin;
      const result = strategy([]);
      
      expect(result).toBeNull();
    });

    test('应该跳过不健康的服务商', () => {
      const providers = [
        { id: 'p1', healthy: false },
        { id: 'p2', healthy: false },
        { id: 'p3', healthy: true }
      ];

      const strategy = manager.strategies.round_robin;
      const selected = strategy(providers);

      expect(selected.id).toBe('p3');
    });
  });
});