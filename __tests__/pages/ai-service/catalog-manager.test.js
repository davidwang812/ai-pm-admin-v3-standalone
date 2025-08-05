/**
 * Catalog Manager Tests
 * 测试服务商目录管理
 */

import { CatalogManager } from '../../../_pages/ai-service/catalog/catalog-manager.js';
import { createMockDocument, fireEvent } from '../../helpers/dom-mocks.js';
import { MockApiClient, builders } from '../../helpers/api-mocks.js';

describe('CatalogManager', () => {
  let manager;
  let mockDocument;
  let mockApi;

  beforeEach(() => {
    // Setup DOM
    mockDocument = createMockDocument();
    global.document = mockDocument;
    
    // Setup API
    mockApi = new MockApiClient();
    
    // Create manager instance
    manager = new CatalogManager();
    manager.api = mockApi;
  });

  afterEach(() => {
    mockDocument._reset();
  });

  describe('initialization', () => {
    it('should initialize with empty catalog', () => {
      expect(manager.providers).toEqual([]);
      expect(manager.models).toEqual([]);
      expect(manager.searchTerm).toBe('');
      expect(manager.selectedProvider).toBeNull();
    });

    it('should set default filters', () => {
      expect(manager.filters).toEqual({
        type: 'all',
        status: 'all',
        priceRange: 'all'
      });
    });
  });

  describe('catalog loading', () => {
    it('should load catalog from cache first', async () => {
      const cachedData = {
        providers: [{ id: '1', name: 'Cached Provider' }],
        models: [{ id: 'model-1', name: 'Cached Model' }],
        timestamp: Date.now()
      };
      
      localStorage.setItem('ai_catalog_cache', JSON.stringify(cachedData));
      
      await manager.loadCatalog();
      
      expect(manager.providers).toEqual(cachedData.providers);
      expect(manager.models).toEqual(cachedData.models);
    });

    it('should fetch from API if cache is stale', async () => {
      const oldCache = {
        providers: [],
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours old
      };
      
      localStorage.setItem('ai_catalog_cache', JSON.stringify(oldCache));
      
      const apiData = {
        providers: [{ id: '2', name: 'API Provider' }],
        models: [{ id: 'model-2', name: 'API Model' }]
      };
      
      mockApi.setMockResponse('GET', '/api/catalog/providers', {
        success: true,
        data: apiData
      });
      
      await manager.loadCatalog();
      
      expect(manager.providers).toEqual(apiData.providers);
      expect(mockApi.getCallCount('GET', '/api/catalog/providers')).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      mockApi.setMockResponse('GET', '/api/catalog/providers', {
        success: false,
        error: 'Network error'
      });
      
      await manager.loadCatalog();
      
      expect(manager.providers).toEqual([]);
      expect(manager.error).toBe('Failed to load catalog');
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      manager.providers = [
        { id: '1', name: 'OpenAI', description: 'GPT models' },
        { id: '2', name: 'Anthropic', description: 'Claude models' },
        { id: '3', name: 'Google', description: 'Gemini models' }
      ];
      
      manager.models = [
        { id: 'm1', name: 'gpt-4', provider: '1' },
        { id: 'm2', name: 'claude-3', provider: '2' },
        { id: 'm3', name: 'gemini-pro', provider: '3' }
      ];
    });

    it('should filter providers by search term', () => {
      manager.searchTerm = 'open';
      const filtered = manager.getFilteredProviders();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('OpenAI');
    });

    it('should filter models by search term', () => {
      manager.searchTerm = 'gpt';
      const filtered = manager.getFilteredModels();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('gpt-4');
    });

    it('should search in descriptions', () => {
      manager.searchTerm = 'claude';
      const providers = manager.getFilteredProviders();
      
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toBe('Anthropic');
    });

    it('should be case insensitive', () => {
      manager.searchTerm = 'GOOGLE';
      const filtered = manager.getFilteredProviders();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Google');
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      manager.providers = [
        { id: '1', name: 'Provider 1', type: 'llm', status: 'active' },
        { id: '2', name: 'Provider 2', type: 'image', status: 'beta' },
        { id: '3', name: 'Provider 3', type: 'llm', status: 'deprecated' }
      ];
    });

    it('should filter by type', () => {
      manager.filters.type = 'llm';
      const filtered = manager.getFilteredProviders();
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.type === 'llm')).toBe(true);
    });

    it('should filter by status', () => {
      manager.filters.status = 'active';
      const filtered = manager.getFilteredProviders();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('active');
    });

    it('should apply multiple filters', () => {
      manager.filters.type = 'llm';
      manager.filters.status = 'active';
      const filtered = manager.getFilteredProviders();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });

  describe('provider selection', () => {
    it('should select provider and show details', () => {
      const provider = { id: '1', name: 'Test Provider' };
      
      manager.selectProvider(provider);
      
      expect(manager.selectedProvider).toEqual(provider);
    });

    it('should load provider models on selection', async () => {
      const provider = { id: '1', name: 'Test Provider' };
      const models = [
        { id: 'm1', name: 'Model 1' },
        { id: 'm2', name: 'Model 2' }
      ];
      
      mockApi.setMockResponse('GET', `/api/catalog/providers/${provider.id}/models`, {
        success: true,
        data: { models }
      });
      
      await manager.selectProvider(provider);
      
      expect(manager.selectedProviderModels).toEqual(models);
    });

    it('should clear selection', () => {
      manager.selectedProvider = { id: '1' };
      manager.selectedProviderModels = [{ id: 'm1' }];
      
      manager.clearSelection();
      
      expect(manager.selectedProvider).toBeNull();
      expect(manager.selectedProviderModels).toEqual([]);
    });
  });

  describe('catalog updates', () => {
    it('should refresh catalog from API', async () => {
      const newData = {
        providers: [{ id: 'new-1', name: 'New Provider' }],
        models: [{ id: 'new-m1', name: 'New Model' }]
      };
      
      mockApi.setMockResponse('GET', '/api/catalog/providers', {
        success: true,
        data: newData
      });
      
      await manager.refreshCatalog();
      
      expect(manager.providers).toEqual(newData.providers);
      expect(manager.models).toEqual(newData.models);
      
      // Should update cache
      const cached = JSON.parse(localStorage.getItem('ai_catalog_cache'));
      expect(cached.providers).toEqual(newData.providers);
    });

    it('should handle refresh errors', async () => {
      mockApi.setMockResponse('GET', '/api/catalog/providers', {
        success: false,
        error: 'Refresh failed'
      });
      
      const originalProviders = [{ id: '1', name: 'Original' }];
      manager.providers = originalProviders;
      
      await manager.refreshCatalog();
      
      // Should keep original data
      expect(manager.providers).toEqual(originalProviders);
      expect(manager.error).toBe('Failed to refresh catalog');
    });
  });

  describe('export functionality', () => {
    beforeEach(() => {
      manager.providers = [
        { id: '1', name: 'Provider 1' },
        { id: '2', name: 'Provider 2' }
      ];
      manager.models = [
        { id: 'm1', name: 'Model 1', provider: '1' },
        { id: 'm2', name: 'Model 2', provider: '2' }
      ];
    });

    it('should export catalog as JSON', () => {
      const exported = manager.exportCatalog('json');
      
      expect(exported).toContain('"providers"');
      expect(exported).toContain('"models"');
      expect(exported).toContain('Provider 1');
      expect(exported).toContain('Model 1');
    });

    it('should export catalog as CSV', () => {
      const csv = manager.exportCatalog('csv');
      
      expect(csv).toContain('Provider Name,Model Name');
      expect(csv).toContain('Provider 1,Model 1');
      expect(csv).toContain('Provider 2,Model 2');
    });

    it('should include metadata in export', () => {
      const exported = JSON.parse(manager.exportCatalog('json'));
      
      expect(exported.metadata).toBeDefined();
      expect(exported.metadata.exportDate).toBeDefined();
      expect(exported.metadata.totalProviders).toBe(2);
      expect(exported.metadata.totalModels).toBe(2);
    });
  });

  describe('price calculations', () => {
    it('should calculate token prices', () => {
      const model = {
        pricing: {
          input: 0.01,  // $0.01 per 1K tokens
          output: 0.02  // $0.02 per 1K tokens
        }
      };
      
      const cost = manager.calculateTokenCost(model, 5000, 3000);
      
      expect(cost.input).toBe(0.05);  // 5K * 0.01
      expect(cost.output).toBe(0.06); // 3K * 0.02
      expect(cost.total).toBe(0.11);
    });

    it('should handle missing pricing data', () => {
      const model = {};
      
      const cost = manager.calculateTokenCost(model, 1000, 1000);
      
      expect(cost.input).toBe(0);
      expect(cost.output).toBe(0);
      expect(cost.total).toBe(0);
    });
  });

  describe('UI rendering', () => {
    it('should render catalog grid', async () => {
      manager.providers = [
        { id: '1', name: 'Provider 1', logo: 'logo1.png' },
        { id: '2', name: 'Provider 2', logo: 'logo2.png' }
      ];
      
      const html = await manager.render();
      
      expect(html).toContain('catalog-grid');
      expect(html).toContain('Provider 1');
      expect(html).toContain('Provider 2');
      expect(html).toContain('logo1.png');
    });

    it('should render search bar', async () => {
      const html = await manager.render();
      
      expect(html).toContain('search-bar');
      expect(html).toContain('placeholder="搜索服务商或模型"');
    });

    it('should render empty state', async () => {
      manager.providers = [];
      
      const html = await manager.render();
      
      expect(html).toContain('empty-state');
      expect(html).toContain('暂无数据');
    });
  });
});