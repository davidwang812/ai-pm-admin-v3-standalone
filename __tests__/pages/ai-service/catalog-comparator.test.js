/**
 * Catalog Comparator Tests
 * 测试目录比较模块
 */

const CatalogComparator = require('../../../_pages/ai-service/catalog-comparator.js');

describe('CatalogComparator', () => {
  describe('compare', () => {
    it('should detect no changes when data is identical', () => {
      const data = {
        providers: [
          { provider_code: 'openai', provider_name: 'OpenAI', is_active: true }
        ],
        models: [
          { provider_code: 'openai', model_code: 'gpt-4', input_price: 0.03, output_price: 0.06 }
        ]
      };
      
      const result = CatalogComparator.compare(data, data);
      
      expect(result.hasChanges).toBe(false);
      expect(result.totalChanges).toBe(0);
      expect(result.summary).toContain('無需更新');
    });

    it('should detect new providers', () => {
      const currentData = {
        providers: [
          { provider_code: 'openai', provider_name: 'OpenAI' }
        ],
        models: []
      };
      
      const newData = {
        providers: [
          { provider_code: 'openai', provider_name: 'OpenAI' },
          { provider_code: 'anthropic', provider_name: 'Anthropic' }
        ],
        models: []
      };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.hasChanges).toBe(true);
      expect(result.providers.new).toHaveLength(1);
      expect(result.providers.new[0].provider_code).toBe('anthropic');
      expect(result.summary).toContain('1 個新服務商');
    });

    it('should detect removed providers', () => {
      const currentData = {
        providers: [
          { provider_code: 'openai', provider_name: 'OpenAI' },
          { provider_code: 'anthropic', provider_name: 'Anthropic' }
        ],
        models: []
      };
      
      const newData = {
        providers: [
          { provider_code: 'openai', provider_name: 'OpenAI' }
        ],
        models: []
      };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.hasChanges).toBe(true);
      expect(result.providers.removed).toHaveLength(1);
      expect(result.providers.removed[0].provider_code).toBe('anthropic');
      expect(result.summary).toContain('1 個服務商移除');
    });

    it('should detect updated providers', () => {
      const currentData = {
        providers: [
          { 
            provider_code: 'openai', 
            provider_name: 'OpenAI',
            display_name: 'OpenAI Inc',
            is_active: true
          }
        ],
        models: []
      };
      
      const newData = {
        providers: [
          { 
            provider_code: 'openai', 
            provider_name: 'OpenAI',
            display_name: 'OpenAI Corporation',
            is_active: false
          }
        ],
        models: []
      };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.hasChanges).toBe(true);
      expect(result.providers.updated).toHaveLength(1);
      expect(result.providers.updated[0].changes).toContain('Display: OpenAI Inc → OpenAI Corporation');
      expect(result.providers.updated[0].changes).toContain('Status: Active → Inactive');
    });

    it('should detect new models', () => {
      const currentData = {
        providers: [],
        models: [
          { provider_code: 'openai', model_code: 'gpt-3.5', input_price: 0.001, output_price: 0.002 }
        ]
      };
      
      const newData = {
        providers: [],
        models: [
          { provider_code: 'openai', model_code: 'gpt-3.5', input_price: 0.001, output_price: 0.002 },
          { provider_code: 'openai', model_code: 'gpt-4', input_price: 0.03, output_price: 0.06 }
        ]
      };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.hasChanges).toBe(true);
      expect(result.models.new).toHaveLength(1);
      expect(result.models.new[0].model_code).toBe('gpt-4');
      expect(result.summary).toContain('1 個新模型');
    });

    it('should detect price changes', () => {
      const currentData = {
        providers: [],
        models: [
          { 
            provider_code: 'openai', 
            model_code: 'gpt-4',
            model_name: 'GPT-4',
            input_price: 0.03,
            output_price: 0.06
          }
        ]
      };
      
      const newData = {
        providers: [],
        models: [
          { 
            provider_code: 'openai', 
            model_code: 'gpt-4',
            model_name: 'GPT-4',
            input_price: 0.02,
            output_price: 0.05
          }
        ]
      };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.hasChanges).toBe(true);
      expect(result.models.priceChanges).toHaveLength(1);
      expect(result.models.priceChanges[0].old_input_price).toBe(0.03);
      expect(result.models.priceChanges[0].old_output_price).toBe(0.06);
      expect(result.models.priceChanges[0].price_change.input.percent).toBe('-33.33');
      expect(result.summary).toContain('1 個模型價格變動');
    });

    it('should ignore tiny price changes below threshold', () => {
      const currentData = {
        providers: [],
        models: [
          { 
            provider_code: 'openai', 
            model_code: 'gpt-4',
            input_price: 0.03,
            output_price: 0.06
          }
        ]
      };
      
      const newData = {
        providers: [],
        models: [
          { 
            provider_code: 'openai', 
            model_code: 'gpt-4',
            input_price: 0.0300001,  // Tiny change below threshold
            output_price: 0.06
          }
        ]
      };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.hasChanges).toBe(false);
      expect(result.models.priceChanges).toHaveLength(0);
    });

    it('should detect non-price model changes', () => {
      const currentData = {
        providers: [],
        models: [
          { 
            provider_code: 'openai', 
            model_code: 'gpt-4',
            model_name: 'GPT-4',
            context_length: 8192,
            max_tokens: 4096,
            input_price: 0.03,
            output_price: 0.06
          }
        ]
      };
      
      const newData = {
        providers: [],
        models: [
          { 
            provider_code: 'openai', 
            model_code: 'gpt-4',
            model_name: 'GPT-4 Turbo',
            context_length: 128000,
            max_tokens: 4096,
            input_price: 0.03,
            output_price: 0.06
          }
        ]
      };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.hasChanges).toBe(true);
      expect(result.models.updated).toHaveLength(1);
      expect(result.models.updated[0].changes).toContain('Name: GPT-4 → GPT-4 Turbo');
      expect(result.models.updated[0].changes).toContain('Context: 8192 → 128000');
    });

    it('should handle empty data gracefully', () => {
      const emptyData = { providers: [], models: [] };
      const result = CatalogComparator.compare(emptyData, emptyData);
      
      expect(result.hasChanges).toBe(false);
      expect(result.totalChanges).toBe(0);
    });

    it('should handle missing arrays gracefully', () => {
      const currentData = {};
      const newData = { providers: [{ provider_code: 'test' }] };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.hasChanges).toBe(true);
      expect(result.providers.new).toHaveLength(1);
    });

    it('should generate comprehensive summary', () => {
      const currentData = {
        providers: [
          { provider_code: 'openai', provider_name: 'OpenAI' },
          { provider_code: 'to-remove', provider_name: 'To Remove' }
        ],
        models: [
          { provider_code: 'openai', model_code: 'gpt-3.5', input_price: 0.001, output_price: 0.002 },
          { provider_code: 'openai', model_code: 'gpt-4', input_price: 0.03, output_price: 0.06 },
          { provider_code: 'to-remove', model_code: 'model-1', input_price: 0.01, output_price: 0.02 }
        ]
      };
      
      const newData = {
        providers: [
          { provider_code: 'openai', provider_name: 'OpenAI Updated' },
          { provider_code: 'anthropic', provider_name: 'Anthropic' }
        ],
        models: [
          { provider_code: 'openai', model_code: 'gpt-3.5', input_price: 0.0005, output_price: 0.0015 },
          { provider_code: 'openai', model_code: 'gpt-4', input_price: 0.03, output_price: 0.06, context_length: 128000 },
          { provider_code: 'anthropic', model_code: 'claude-3', input_price: 0.015, output_price: 0.075 }
        ]
      };
      
      const result = CatalogComparator.compare(currentData, newData);
      
      expect(result.summary).toContain('1 個新服務商');
      expect(result.summary).toContain('1 個服務商更新');
      expect(result.summary).toContain('1 個服務商移除');
      expect(result.summary).toContain('1 個新模型');
      expect(result.summary).toContain('1 個模型價格變動');
      expect(result.summary).toContain('1 個模型移除');
    });
  });

  describe('hasProviderChanged', () => {
    it('should detect name change', () => {
      const current = { provider_name: 'Old Name' };
      const updated = { provider_name: 'New Name' };
      
      expect(CatalogComparator.hasProviderChanged(current, updated)).toBe(true);
    });

    it('should detect no change', () => {
      const provider = {
        provider_name: 'OpenAI',
        display_name: 'OpenAI Inc',
        description: 'AI provider',
        website: 'https://openai.com',
        api_format: 'openai',
        is_active: true
      };
      
      expect(CatalogComparator.hasProviderChanged(provider, provider)).toBe(false);
    });
  });

  describe('getModelChanges', () => {
    it('should calculate price change percentages', () => {
      const current = {
        input_price: 0.01,
        output_price: 0.02
      };
      
      const updated = {
        input_price: 0.015,  // 50% increase
        output_price: 0.01   // 50% decrease
      };
      
      const changes = CatalogComparator.getModelChanges(current, updated);
      
      expect(changes.priceChanged).toBe(true);
      expect(changes.priceChange.input.percent).toBe('50.00');
      expect(changes.priceChange.output.percent).toBe('-50.00');
    });

    it('should handle zero price division', () => {
      const current = {
        input_price: 0,
        output_price: 0.02
      };
      
      const updated = {
        input_price: 0.01,
        output_price: 0.03
      };
      
      const changes = CatalogComparator.getModelChanges(current, updated);
      
      expect(changes.priceChange.input.percent).toBe('N/A');
      expect(changes.priceChange.output.percent).toBe('50.00');
    });

    it('should round prices to 6 decimal places', () => {
      const current = {
        input_price: 0.1234567890,
        output_price: 0.01
      };
      
      const updated = {
        input_price: 0.1234561234,
        output_price: 0.01
      };
      
      const changes = CatalogComparator.getModelChanges(current, updated);
      
      expect(changes.priceChanged).toBe(true);
      expect(changes.priceChange.input.old).toBe(0.123457);
      expect(changes.priceChange.input.new).toBe(0.123456);
    });
  });
});