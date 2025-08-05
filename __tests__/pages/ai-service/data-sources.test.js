/**
 * Data Sources Tests
 * 测试数据源配置页面
 */

import { DataSourcesPage } from '../../../_pages/ai-service/data-sources.js';
import { createMockDocument, fireEvent } from '../../helpers/dom-mocks.js';
import { MockApiClient } from '../../helpers/api-mocks.js';

describe('DataSourcesPage', () => {
  let page;
  let mockDocument;
  let mockApi;

  beforeEach(() => {
    // Setup DOM
    mockDocument = createMockDocument();
    global.document = mockDocument;
    
    // Setup API
    mockApi = new MockApiClient();
    
    // Create page instance
    page = new DataSourcesPage();
    page.api = mockApi;
  });

  afterEach(() => {
    mockDocument._reset();
  });

  describe('initialization', () => {
    it('should initialize with default sources', () => {
      expect(page.sources).toBeDefined();
      expect(page.sources).toHaveLength(0);
      expect(page.selectedSource).toBeNull();
    });

    it('should set default configuration', () => {
      expect(page.config).toEqual({
        refreshInterval: 3600000, // 1 hour
        cacheEnabled: true,
        maxRetries: 3
      });
    });
  });

  describe('data source management', () => {
    const mockSources = [
      {
        id: 'openrouter',
        name: 'OpenRouter',
        type: 'api',
        endpoint: 'https://openrouter.ai/api/v1',
        enabled: true
      },
      {
        id: 'vercel',
        name: 'Vercel AI',
        type: 'api',
        endpoint: 'https://sdk.vercel.ai/api',
        enabled: false
      }
    ];

    beforeEach(() => {
      mockApi.setMockResponse('GET', '/api/data-sources', {
        success: true,
        data: { sources: mockSources }
      });
    });

    it('should load data sources', async () => {
      await page.loadSources();
      
      expect(page.sources).toEqual(mockSources);
      expect(mockApi.getCallCount('GET', '/api/data-sources')).toBe(1);
    });

    it('should add new data source', async () => {
      const newSource = {
        name: 'Custom API',
        type: 'api',
        endpoint: 'https://custom.api/v1'
      };
      
      mockApi.setMockResponse('POST', '/api/data-sources', {
        success: true,
        data: { source: { ...newSource, id: 'custom-1' } }
      });
      
      const result = await page.addSource(newSource);
      
      expect(result.success).toBe(true);
      expect(page.sources).toContainEqual(expect.objectContaining(newSource));
    });

    it('should update existing source', async () => {
      page.sources = [...mockSources];
      
      const updates = { enabled: true };
      
      mockApi.setMockResponse('PUT', '/api/data-sources/vercel', {
        success: true,
        data: { source: { ...mockSources[1], ...updates } }
      });
      
      await page.updateSource('vercel', updates);
      
      const updated = page.sources.find(s => s.id === 'vercel');
      expect(updated.enabled).toBe(true);
    });

    it('should delete data source', async () => {
      page.sources = [...mockSources];
      
      mockApi.setMockResponse('DELETE', '/api/data-sources/vercel', {
        success: true
      });
      
      await page.deleteSource('vercel');
      
      expect(page.sources).toHaveLength(1);
      expect(page.sources.find(s => s.id === 'vercel')).toBeUndefined();
    });
  });

  describe('source validation', () => {
    it('should validate source configuration', () => {
      const validSource = {
        name: 'Test Source',
        type: 'api',
        endpoint: 'https://api.test.com'
      };
      
      expect(page.validateSource(validSource)).toBe(true);
    });

    it('should reject invalid source', () => {
      const invalidSource = {
        name: '',
        type: 'api',
        endpoint: 'not-a-url'
      };
      
      expect(page.validateSource(invalidSource)).toBe(false);
      expect(page.validationErrors).toContain('Name is required');
      expect(page.validationErrors).toContain('Invalid endpoint URL');
    });

    it('should validate API key if required', () => {
      const source = {
        name: 'Secure API',
        type: 'api',
        endpoint: 'https://secure.api.com',
        requiresAuth: true,
        apiKey: ''
      };
      
      expect(page.validateSource(source)).toBe(false);
      expect(page.validationErrors).toContain('API key is required');
    });
  });

  describe('source testing', () => {
    it('should test source connectivity', async () => {
      const source = mockSources[0];
      
      mockApi.setMockResponse('POST', `/api/data-sources/${source.id}/test`, {
        success: true,
        data: {
          status: 'healthy',
          latency: 150,
          details: { version: '1.0.0' }
        }
      });
      
      const result = await page.testSource(source.id);
      
      expect(result.status).toBe('healthy');
      expect(result.latency).toBe(150);
    });

    it('should handle test failures', async () => {
      mockApi.setMockResponse('POST', '/api/data-sources/test-id/test', {
        success: false,
        error: 'Connection timeout'
      });
      
      const result = await page.testSource('test-id');
      
      expect(result.status).toBe('error');
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('data synchronization', () => {
    it('should sync data from source', async () => {
      const sourceId = 'openrouter';
      
      mockApi.setMockResponse('POST', `/api/data-sources/${sourceId}/sync`, {
        success: true,
        data: {
          modelsAdded: 5,
          modelsUpdated: 3,
          modelsRemoved: 1,
          syncTime: '2025-01-01T00:00:00Z'
        }
      });
      
      const result = await page.syncSource(sourceId);
      
      expect(result.modelsAdded).toBe(5);
      expect(result.modelsUpdated).toBe(3);
      
      // Should update last sync time
      const source = page.sources.find(s => s.id === sourceId);
      expect(source.lastSync).toBe('2025-01-01T00:00:00Z');
    });

    it('should sync all enabled sources', async () => {
      page.sources = [
        { id: 's1', enabled: true },
        { id: 's2', enabled: false },
        { id: 's3', enabled: true }
      ];
      
      const syncSpy = jest.spyOn(page, 'syncSource').mockResolvedValue({ success: true });
      
      await page.syncAllSources();
      
      expect(syncSpy).toHaveBeenCalledTimes(2);
      expect(syncSpy).toHaveBeenCalledWith('s1');
      expect(syncSpy).toHaveBeenCalledWith('s3');
      expect(syncSpy).not.toHaveBeenCalledWith('s2');
    });
  });

  describe('caching', () => {
    it('should cache source data', async () => {
      const data = { sources: mockSources };
      
      mockApi.setMockResponse('GET', '/api/data-sources', {
        success: true,
        data
      });
      
      await page.loadSources();
      await page.loadSources(); // Second call
      
      // Should only call API once due to cache
      expect(mockApi.getCallCount('GET', '/api/data-sources')).toBe(1);
    });

    it('should invalidate cache on update', async () => {
      // Load and cache
      await page.loadSources();
      
      // Update source
      mockApi.setMockResponse('PUT', '/api/data-sources/test', {
        success: true,
        data: { source: {} }
      });
      
      await page.updateSource('test', {});
      
      // Should clear cache
      expect(page.cache.has('sources')).toBe(false);
    });

    it('should respect cache expiry', async () => {
      page.config.cacheExpiry = 100; // 100ms
      
      await page.loadSources();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await page.loadSources();
      
      // Should call API twice
      expect(mockApi.getCallCount('GET', '/api/data-sources')).toBe(2);
    });
  });

  describe('UI rendering', () => {
    beforeEach(() => {
      page.sources = mockSources;
    });

    it('should render sources list', async () => {
      const html = await page.render();
      
      expect(html).toContain('data-sources-page');
      expect(html).toContain('OpenRouter');
      expect(html).toContain('Vercel AI');
    });

    it('should show enabled/disabled status', async () => {
      const html = await page.render();
      
      expect(html).toContain('status-enabled');
      expect(html).toContain('status-disabled');
    });

    it('should render add source button', async () => {
      const html = await page.render();
      
      expect(html).toContain('btn-add-source');
      expect(html).toContain('添加数据源');
    });

    it('should render sync controls', async () => {
      const html = await page.render();
      
      expect(html).toContain('sync-all-btn');
      expect(html).toContain('同步所有数据源');
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      page.sources = mockSources;
      const html = await page.render();
      mockDocument.body.innerHTML = html;
      page.bindEvents();
    });

    it('should handle source toggle', () => {
      const toggleBtn = mockDocument.querySelector('.source-toggle');
      const updateSpy = jest.spyOn(page, 'updateSource');
      
      fireEvent(toggleBtn, 'click');
      
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should handle source deletion', () => {
      const deleteBtn = mockDocument.querySelector('.btn-delete');
      const deleteSpy = jest.spyOn(page, 'deleteSource');
      
      // Mock confirmation
      global.confirm = jest.fn().mockReturnValue(true);
      
      fireEvent(deleteBtn, 'click');
      
      expect(deleteSpy).toHaveBeenCalled();
    });

    it('should handle test connection', () => {
      const testBtn = mockDocument.querySelector('.btn-test');
      const testSpy = jest.spyOn(page, 'testSource');
      
      fireEvent(testBtn, 'click');
      
      expect(testSpy).toHaveBeenCalled();
    });
  });
});