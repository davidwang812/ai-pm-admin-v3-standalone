/**
 * API Client Tests
 * 测试核心API客户端功能
 */

import { ApiClient } from '../../_core/api-client.js';

describe('ApiClient', () => {
  let apiClient;
  let originalFetch;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseURL: 'http://test.api',
      timeout: 1000
    });
    
    // Save original fetch
    originalFetch = global.fetch;
    
    // Reset fetch mock
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers()
      })
    );
    
    // Mock localStorage
    localStorage.getItem.mockReturnValue('test-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const client = new ApiClient();
      
      expect(client.config.timeout).toBe(3000);
      expect(client.config.retryAttempts).toBe(2);
      expect(client.config.headers['Content-Type']).toBe('application/json');
    });

    it('should merge custom config', () => {
      const client = new ApiClient({
        timeout: 5000,
        headers: { 'X-Custom': 'value' }
      });
      
      expect(client.config.timeout).toBe(5000);
      expect(client.config.headers['X-Custom']).toBe('value');
      expect(client.config.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('request()', () => {
    it('should make successful request', async () => {
      const result = await apiClient.request('/test');
      
      expect(fetch).toHaveBeenCalledWith(
        'http://test.api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          })
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle request timeout', async () => {
      fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      try {
        await apiClient.request('/test');
        fail('Should have thrown timeout error');
      } catch (error) {
        // Expected timeout
      }
      
      expect(apiClient.stats.timeout).toBe(1);
    });

    it('should reuse pending requests', async () => {
      const promise1 = apiClient.request('/test');
      const promise2 = apiClient.request('/test');
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(apiClient.stats.cached).toBe(1);
    });

    it('should cache GET requests', async () => {
      await apiClient.get('/test');
      
      // Second request should use cache
      const cachedResult = apiClient.getCachedResponse('http://test.api/test');
      expect(cachedResult).toEqual({ success: true });
    });
  });

  describe('getCostAnalysis()', () => {
    it('should call correct endpoint with date range', async () => {
      await apiClient.getCostAnalysis('month');
      
      expect(fetch).toHaveBeenCalledWith(
        'http://test.api/admin/cost-analysis?range=month',
        expect.any(Object)
      );
    });

    it('should handle cost analysis response', async () => {
      const mockResponse = {
        success: true,
        totalCost: 100,
        totalRequests: 1000
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers()
      });
      
      const result = await apiClient.getCostAnalysis('week');
      
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers()
      });
      
      await expect(apiClient.get('/not-found')).rejects.toThrow('HTTP 404: Not Found');
      expect(apiClient.stats.failed).toBe(1);
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
      expect(apiClient.stats.failed).toBe(1);
    });

    it('should retry on timeout with fallback data', async () => {
      apiClient.config.retryAttempts = 1;
      fetch.mockImplementation(() => new Promise(() => {})); // Always timeout
      
      const result = await apiClient.handleTimeout('http://test.api/admin/providers', {});
      
      expect(result).toEqual({
        success: true,
        data: [],
        message: 'Using fallback data'
      });
    });
  });

  describe('Provider Management APIs', () => {
    it('should get providers', async () => {
      const mockProviders = { provider1: {}, provider2: {} };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockProviders }),
        headers: new Headers()
      });
      
      const result = await apiClient.getProviders();
      
      expect(result).toEqual({
        success: true,
        providers: mockProviders
      });
    });

    it('should save provider', async () => {
      const provider = { name: 'test', apiKey: 'key' };
      
      await apiClient.saveProvider(provider);
      
      expect(fetch).toHaveBeenCalledWith(
        'http://test.api/admin/providers',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(provider)
        })
      );
    });

    it('should delete provider', async () => {
      await apiClient.deleteProvider('provider-123');
      
      expect(fetch).toHaveBeenCalledWith(
        'http://test.api/admin/providers/provider-123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Cache Management', () => {
    it('should cache responses with expiration', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      await apiClient.get('/test');
      
      // Check immediate cache
      let cached = apiClient.getCachedResponse('http://test.api/test');
      expect(cached).toEqual({ success: true });
      
      // Check expired cache (after 5 minutes)
      jest.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);
      cached = apiClient.getCachedResponse('http://test.api/test');
      expect(cached).toBeNull();
    });

    it('should limit cache size', async () => {
      // Fill cache beyond limit
      for (let i = 0; i < 110; i++) {
        apiClient.cacheResponse(`url-${i}`, { data: i });
      }
      
      expect(apiClient.cache.size).toBeLessThanOrEqual(100);
    });

    it('should clear cache', () => {
      apiClient.cacheResponse('test-url', { data: 'test' });
      expect(apiClient.cache.size).toBe(1);
      
      apiClient.clearCache();
      expect(apiClient.cache.size).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track request statistics', async () => {
      // Successful request
      await apiClient.get('/test');
      
      // Failed request
      fetch.mockRejectedValueOnce(new Error('Failed'));
      try {
        await apiClient.get('/fail');
      } catch (e) {
        // Expected
      }
      
      const stats = apiClient.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.success).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBe('50.00%');
    });
  });

  describe('Configuration Methods', () => {
    it('should get unified config', async () => {
      await apiClient.getUnifiedConfig();
      
      expect(fetch).toHaveBeenCalledWith(
        'http://test.api/admin/unified-config',
        expect.any(Object)
      );
    });

    it('should save unified config with error handling', async () => {
      const config = { test: 'config' };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'saved' }),
        headers: new Headers()
      });
      
      const result = await apiClient.saveUnifiedConfig(config);
      
      expect(result.success).toBe(true);
    });

    it('should normalize save unified config response', async () => {
      const config = { test: 'config' };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok' }), // No success field
        headers: new Headers()
      });
      
      const result = await apiClient.saveUnifiedConfig(config);
      
      expect(result.success).toBe(true);
    });
  });
});