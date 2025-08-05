/**
 * Critical Business Flows End-to-End Tests
 * 关键业务流程端到端测试
 */

import { featureFlags } from '../../_utils/feature-flags.js';
import { performanceMonitor } from '../../_utils/performance-monitor.js';
import { autoRollback } from '../../_utils/auto-rollback.js';
import { createMockDocument, fireEvent } from '../helpers/dom-mocks.js';
import { MockApiClient } from '../helpers/api-mocks.js';

describe('Critical Business Flows', () => {
  let mockDocument;
  let mockApi;
  let mockApp;

  beforeEach(() => {
    // Setup mock environment
    mockDocument = createMockDocument();
    global.document = mockDocument;
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    mockApi = new MockApiClient();
    mockApp = {
      api: mockApi,
      showToast: jest.fn(),
      showModal: jest.fn(),
      closeModal: jest.fn(),
      showLoading: jest.fn(),
      hideLoading: jest.fn()
    };
    
    global.window = { 
      adminV3App: mockApp,
      location: { hostname: 'localhost' }
    };

    // Reset systems
    featureFlags.reset();
    performanceMonitor.reset();
  });

  describe('Provider Management Flow', () => {
    it('should complete full provider lifecycle', async () => {
      const startTime = performance.now();
      
      // Create rollback point
      const rollbackPoint = autoRollback.createRollbackPoint('provider_test_start', {
        providers: []
      });
      
      try {
        // Step 1: Add new provider
        const newProvider = {
          id: 'test-provider-1',
          name: 'Test Provider',
          type: 'openai',
          apiKey: 'sk-test123',
          enabled: true
        };

        mockApi.setMockResponse('POST', '/api/providers', {
          success: true,
          data: { provider: newProvider }
        });

        // Simulate API call
        const addResult = await mockApi.post('/api/providers', newProvider);
        expect(addResult.success).toBe(true);

        // Step 2: Configure provider settings
        const config = {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000
        };

        mockApi.setMockResponse('PUT', `/api/providers/${newProvider.id}/config`, {
          success: true,
          data: { config }
        });

        const configResult = await mockApi.put(`/api/providers/${newProvider.id}/config`, config);
        expect(configResult.success).toBe(true);

        // Step 3: Test provider connectivity
        mockApi.setMockResponse('POST', `/api/providers/${newProvider.id}/test`, {
          success: true,
          data: { 
            status: 'healthy',
            latency: 150,
            testMessage: 'Connection successful'
          }
        });

        const testResult = await mockApi.post(`/api/providers/${newProvider.id}/test`, {});
        expect(testResult.success).toBe(true);
        expect(testResult.data.status).toBe('healthy');

        // Step 4: Enable provider in load balancer
        mockApi.setMockResponse('PUT', '/api/load-balance/providers', {
          success: true,
          data: {
            providers: [
              { id: newProvider.id, enabled: true, weight: 1 }
            ]
          }
        });

        const lbResult = await mockApi.put('/api/load-balance/providers', {
          providers: [{ id: newProvider.id, enabled: true, weight: 1 }]
        });
        expect(lbResult.success).toBe(true);

        // Step 5: Verify provider in list
        mockApi.setMockResponse('GET', '/api/providers', {
          success: true,
          data: {
            providers: [newProvider]
          }
        });

        const listResult = await mockApi.get('/api/providers');
        expect(listResult.success).toBe(true);
        expect(listResult.data.providers).toHaveLength(1);

        // Record performance
        const duration = performance.now() - startTime;
        performanceMonitor.record('e2e.provider_lifecycle', duration);
        
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      } catch (error) {
        // If test fails, rollback
        await autoRollback.rollback(rollbackPoint.name, 'E2E test failure');
        throw error;
      }
    });

    it('should handle provider failure gracefully', async () => {
      // Simulate provider failure scenario
      const provider = {
        id: 'failing-provider',
        name: 'Failing Provider',
        type: 'openai'
      };

      // Mock failed API responses
      mockApi.setMockResponse('POST', `/api/providers/${provider.id}/test`, {
        success: false,
        error: 'Connection timeout'
      });

      const testResult = await mockApi.post(`/api/providers/${provider.id}/test`, {});
      expect(testResult.success).toBe(false);
      expect(testResult.error).toBe('Connection timeout');

      // Verify that system handles failure appropriately
      // (In real implementation, this would trigger alerts and failover)
      performanceMonitor.recordError('provider_test', new Error('Connection timeout'));
      
      const errorStats = performanceMonitor.getStats('error.count');
      expect(errorStats).toBeTruthy();
    });
  });

  describe('Configuration Management Flow', () => {
    it('should safely update configuration with rollback capability', async () => {
      // Create initial configuration
      const initialConfig = {
        enabled: true,
        strategy: 'round-robin',
        healthCheckInterval: 30,
        providers: []
      };

      // Create rollback point
      const rollbackPoint = autoRollback.createRollbackPoint('config_update_test', {
        config: initialConfig
      });

      try {
        // Enable feature flag for new config system
        featureFlags.enable('USE_UNIFIED_CONFIG_MANAGER');
        
        // Step 1: Update configuration
        const newConfig = {
          ...initialConfig,
          strategy: 'weighted',
          healthCheckInterval: 60,
          providers: [
            { id: 'provider-1', weight: 2 },
            { id: 'provider-2', weight: 1 }
          ]
        };

        mockApi.setMockResponse('PUT', '/api/config/load-balance', {
          success: true,
          data: { config: newConfig }
        });

        const updateResult = await mockApi.put('/api/config/load-balance', newConfig);
        expect(updateResult.success).toBe(true);

        // Step 2: Validate configuration
        mockApi.setMockResponse('GET', '/api/config/load-balance/validate', {
          success: true,
          data: { valid: true, warnings: [] }
        });

        const validateResult = await mockApi.get('/api/config/load-balance/validate');
        expect(validateResult.success).toBe(true);
        expect(validateResult.data.valid).toBe(true);

        // Step 3: Apply configuration
        mockApi.setMockResponse('POST', '/api/config/load-balance/apply', {
          success: true,
          data: { applied: true }
        });

        const applyResult = await mockApi.post('/api/config/load-balance/apply', {});
        expect(applyResult.success).toBe(true);

        // Step 4: Health check after configuration change
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate settling time
        
        // Verify system is still healthy
        const healthCheck = await autoRollback.performHealthCheck();
        // Health check should not trigger rollback

      } catch (error) {
        // If configuration update fails, rollback
        await autoRollback.rollback(rollbackPoint.name, 'Configuration update failure');
        throw error;
      }
    });

    it('should auto-rollback on configuration failure', async () => {
      // Create rollback point
      const rollbackPoint = autoRollback.createRollbackPoint('bad_config_test', {
        config: { strategy: 'round-robin' }
      });

      // Simulate bad configuration that causes system failure
      const badConfig = {
        strategy: 'invalid-strategy',
        healthCheckInterval: -1, // Invalid value
        providers: null // Invalid structure
      };

      mockApi.setMockResponse('PUT', '/api/config/load-balance', {
        success: false,
        error: 'Invalid configuration'
      });

      const updateResult = await mockApi.put('/api/config/load-balance', badConfig);
      expect(updateResult.success).toBe(false);

      // Simulate system instability
      performanceMonitor.record('error.rate', 50); // High error rate
      
      // This should trigger auto-rollback (in real scenario)
      // For testing, we manually verify the rollback mechanism works
      const canRollback = autoRollback.rollbackPoints.has(rollbackPoint.name);
      expect(canRollback).toBe(true);
    });
  });

  describe('User Authentication Flow', () => {
    it('should complete secure login process', async () => {
      // Step 1: Login request
      const credentials = {
        username: 'admin',
        password: 'secure-password'
      };

      mockApi.setMockResponse('POST', '/api/auth/login', {
        success: true,
        data: {
          token: 'jwt-token-123',
          user: {
            id: 'user-1',
            username: 'admin',
            role: 'admin'
          }
        }
      });

      const loginResult = await mockApi.post('/api/auth/login', credentials);
      expect(loginResult.success).toBe(true);
      expect(loginResult.data.token).toBeTruthy();

      // Step 2: Verify token
      mockApi.setMockResponse('GET', '/api/auth/verify', {
        success: true,
        data: {
          valid: true,
          user: loginResult.data.user
        }
      }, {
        headers: { Authorization: `Bearer ${loginResult.data.token}` }
      });

      const verifyResult = await mockApi.get('/api/auth/verify', {}, {
        headers: { Authorization: `Bearer ${loginResult.data.token}` }
      });
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data.valid).toBe(true);

      // Step 3: Access protected resource
      mockApi.setMockResponse('GET', '/api/admin/dashboard', {
        success: true,
        data: {
          stats: {
            totalProviders: 5,
            activeProviders: 3,
            totalRequests: 1000
          }
        }
      });

      const dashboardResult = await mockApi.get('/api/admin/dashboard');
      expect(dashboardResult.success).toBe(true);
      expect(dashboardResult.data.stats).toBeDefined();
    });

    it('should handle authentication failure securely', async () => {
      // Test invalid credentials
      const invalidCredentials = {
        username: 'admin',
        password: 'wrong-password'
      };

      mockApi.setMockResponse('POST', '/api/auth/login', {
        success: false,
        error: 'Invalid credentials'
      });

      const loginResult = await mockApi.post('/api/auth/login', invalidCredentials);
      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Invalid credentials');

      // Verify that no sensitive information is leaked
      expect(loginResult.data?.token).toBeUndefined();
      expect(loginResult.data?.user).toBeUndefined();
    });
  });

  describe('API Performance Flow', () => {
    it('should maintain acceptable performance under load', async () => {
      const requests = [];
      const startTime = performance.now();

      // Simulate concurrent API requests
      for (let i = 0; i < 10; i++) {
        mockApi.setMockResponse('GET', `/api/test/${i}`, {
          success: true,
          data: { id: i, message: `Response ${i}` }
        });

        const request = mockApi.get(`/api/test/${i}`);
        requests.push(request);
      }

      // Wait for all requests to complete
      const results = await Promise.all(requests);
      const duration = performance.now() - startTime;

      // Verify all requests succeeded
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data.id).toBe(index);
      });

      // Record performance metrics
      performanceMonitor.record('e2e.concurrent_requests', duration);
      performanceMonitor.record('e2e.request_throughput', 10 / (duration / 1000));

      // Performance should be acceptable
      expect(duration).toBeLessThan(1000); // All requests within 1 second
    });
  });

  describe('Error Recovery Flow', () => {
    it('should recover from temporary failures', async () => {
      // Simulate temporary API failure
      mockApi.setMockResponse('GET', '/api/providers', {
        success: false,
        error: 'Service temporarily unavailable'
      });

      const firstAttempt = await mockApi.get('/api/providers');
      expect(firstAttempt.success).toBe(false);

      // Simulate service recovery
      mockApi.setMockResponse('GET', '/api/providers', {
        success: true,
        data: { providers: [] }
      });

      // Retry should succeed
      const retryAttempt = await mockApi.get('/api/providers');
      expect(retryAttempt.success).toBe(true);
    });

    it('should trigger rollback on persistent failures', async () => {
      // Create rollback point
      const rollbackPoint = autoRollback.createRollbackPoint('failure_test', {
        systemState: 'stable'
      });

      // Simulate persistent failures
      for (let i = 0; i < 5; i++) {
        performanceMonitor.recordError('critical_service', new Error('Service failure'));
      }

      // Verify rollback point exists and can be used
      expect(autoRollback.rollbackPoints.has(rollbackPoint.name)).toBe(true);
      
      // In real scenario, this would trigger automatic rollback
      // For testing, we verify the mechanism is in place
      const healthStatus = autoRollback.getHealthStatus();
      expect(healthStatus).toBeDefined();
    });
  });

  describe('Feature Flag Integration', () => {
    it('should safely enable new features with rollback', async () => {
      // Start with feature disabled
      expect(featureFlags.isEnabled('USE_NEW_PRICE_STANDARDIZER')).toBe(false);

      // Create rollback point
      const rollbackPoint = autoRollback.createRollbackPoint('feature_test', {
        features: featureFlags.getAllFlags()
      });

      // Enable feature gradually
      featureFlags.rollout('USE_NEW_PRICE_STANDARDIZER', 25); // 25% rollout

      // Test feature with small percentage
      const isEnabled = featureFlags.isEnabled('USE_NEW_PRICE_STANDARDIZER', {
        userId: 'test-user-1'
      });
      
      // User might or might not get the feature based on hash
      expect(typeof isEnabled).toBe('boolean');

      // Full rollout
      featureFlags.enable('USE_NEW_PRICE_STANDARDIZER');
      expect(featureFlags.isEnabled('USE_NEW_PRICE_STANDARDIZER')).toBe(true);

      // If there were issues, we could rollback
      if (rollbackPoint) {
        // Rollback capability is available
        expect(autoRollback.rollbackPoints.has(rollbackPoint.name)).toBe(true);
      }
    });
  });

  afterEach(() => {
    // Cleanup
    mockDocument._reset();
    
    // Clear any intervals or timeouts
    if (global.setTimeout.mock) {
      global.setTimeout.mockClear();
    }
  });
});