/**
 * Price Standardizer Tests
 * 测试价格标准化模块
 */

const PriceStandardizer = require('../../../_pages/ai-service/price-standardizer.js');

describe('PriceStandardizer', () => {
  describe('standardizePrice', () => {
    it('should handle valid numeric prices', () => {
      expect(PriceStandardizer.standardizePrice(1.234567)).toBe(1.234567);
      expect(PriceStandardizer.standardizePrice(0.000001)).toBe(0.000001);
      expect(PriceStandardizer.standardizePrice(999.999999)).toBe(999.999999);
    });

    it('should handle string prices', () => {
      expect(PriceStandardizer.standardizePrice('1.234567')).toBe(1.234567);
      expect(PriceStandardizer.standardizePrice('0.000001')).toBe(0.000001);
    });

    it('should handle invalid values', () => {
      expect(PriceStandardizer.standardizePrice(null)).toBe(0);
      expect(PriceStandardizer.standardizePrice(undefined)).toBe(0);
      expect(PriceStandardizer.standardizePrice('')).toBe(0);
      expect(PriceStandardizer.standardizePrice('invalid')).toBe(0);
      expect(PriceStandardizer.standardizePrice(NaN)).toBe(0);
      expect(PriceStandardizer.standardizePrice(Infinity)).toBe(0);
      expect(PriceStandardizer.standardizePrice(-5)).toBe(0);
    });

    it('should handle LiteLLM source conversion', () => {
      // LiteLLM prices are per token, need to convert to per 1K tokens
      expect(PriceStandardizer.standardizePrice(0.001, 'litellm')).toBe(1);
      expect(PriceStandardizer.standardizePrice(0.000025, 'litellm')).toBe(0.025);
    });

    it('should not convert OpenRouter prices', () => {
      // OpenRouter prices are already per 1K tokens
      expect(PriceStandardizer.standardizePrice(1, 'openrouter')).toBe(1);
      expect(PriceStandardizer.standardizePrice(0.025, 'openrouter')).toBe(0.025);
    });

    it('should cap prices at maximum', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(PriceStandardizer.standardizePrice(1000000, 'unknown', 'test-model')).toBe(999999);
      expect(PriceStandardizer.standardizePrice(9999999, 'unknown', 'test-model')).toBe(999999);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Price overflow for test-model')
      );
      
      consoleSpy.mockRestore();
    });

    it('should round to 6 decimal places', () => {
      expect(PriceStandardizer.standardizePrice(1.2345678901)).toBe(1.234568);
      expect(PriceStandardizer.standardizePrice(0.0000001)).toBe(0);
      expect(PriceStandardizer.standardizePrice(0.0000009)).toBe(0.000001);
    });
  });

  describe('standardizeModel', () => {
    it('should standardize both input and output prices', () => {
      const model = {
        model_code: 'test-model',
        input_price: '1.234',
        output_price: 2.345
      };
      
      const result = PriceStandardizer.standardizeModel(model);
      
      expect(result.input_price).toBe(1.234);
      expect(result.output_price).toBe(2.345);
      expect(result.model_code).toBe('test-model');
    });

    it('should handle LiteLLM models', () => {
      const model = {
        model_name: 'gpt-4',
        input_price: 0.00003,  // $0.00003 per token
        output_price: 0.00006  // $0.00006 per token
      };
      
      const result = PriceStandardizer.standardizeModel(model, 'litellm');
      
      expect(result.input_price).toBe(0.03);   // $0.03 per 1K tokens
      expect(result.output_price).toBe(0.06);  // $0.06 per 1K tokens
    });

    it('should preserve other model properties', () => {
      const model = {
        model_code: 'test',
        model_name: 'Test Model',
        provider_id: 'provider-1',
        input_price: 1,
        output_price: 2,
        extra_prop: 'value'
      };
      
      const result = PriceStandardizer.standardizeModel(model);
      
      expect(result).toEqual({
        ...model,
        input_price: 1,
        output_price: 2
      });
    });
  });

  describe('standardizeModels', () => {
    it('should standardize array of models', () => {
      const models = [
        { model_code: 'model-1', input_price: 1, output_price: 2 },
        { model_code: 'model-2', input_price: 3, output_price: 4 }
      ];
      
      const results = PriceStandardizer.standardizeModels(models);
      
      expect(results).toHaveLength(2);
      expect(results[0].input_price).toBe(1);
      expect(results[1].input_price).toBe(3);
    });

    it('should handle empty array', () => {
      expect(PriceStandardizer.standardizeModels([])).toEqual([]);
    });
  });

  describe('hasPriceChange', () => {
    it('should detect price changes above threshold', () => {
      expect(PriceStandardizer.hasPriceChange(1.0, 1.1)).toBe(true);
      expect(PriceStandardizer.hasPriceChange(0.01, 0.02)).toBe(true);
    });

    it('should not detect changes below threshold', () => {
      expect(PriceStandardizer.hasPriceChange(1.0, 1.0000001)).toBe(false);
      expect(PriceStandardizer.hasPriceChange(1.0, 1.0)).toBe(false);
    });

    it('should use custom threshold', () => {
      expect(PriceStandardizer.hasPriceChange(1.0, 1.01, 0.1)).toBe(false);
      expect(PriceStandardizer.hasPriceChange(1.0, 1.2, 0.1)).toBe(true);
    });

    it('should standardize prices before comparison', () => {
      // Both should be 0 after standardization
      expect(PriceStandardizer.hasPriceChange(null, undefined)).toBe(false);
      expect(PriceStandardizer.hasPriceChange(-5, 'invalid')).toBe(false);
    });
  });

  describe('formatPrice', () => {
    it('should format large prices with K suffix', () => {
      expect(PriceStandardizer.formatPrice(1000)).toBe('$1.0K');
      expect(PriceStandardizer.formatPrice(5500)).toBe('$5.5K');
      expect(PriceStandardizer.formatPrice(999999)).toBe('$1000.0K');
    });

    it('should format medium prices with 2 decimals', () => {
      expect(PriceStandardizer.formatPrice(1)).toBe('$1.00');
      expect(PriceStandardizer.formatPrice(99.99)).toBe('$99.99');
      expect(PriceStandardizer.formatPrice(999)).toBe('$999.00');
    });

    it('should format small prices with 4 decimals', () => {
      expect(PriceStandardizer.formatPrice(0.01)).toBe('$0.0100');
      expect(PriceStandardizer.formatPrice(0.1234)).toBe('$0.1234');
      expect(PriceStandardizer.formatPrice(0.99)).toBe('$0.9900');
    });

    it('should format very small prices with 6 decimals', () => {
      expect(PriceStandardizer.formatPrice(0.001)).toBe('$0.001000');
      expect(PriceStandardizer.formatPrice(0.000001)).toBe('$0.000001');
      expect(PriceStandardizer.formatPrice(0.009999)).toBe('$0.009999');
    });

    it('should handle showCurrency option', () => {
      expect(PriceStandardizer.formatPrice(100, false)).toBe('100.00');
      expect(PriceStandardizer.formatPrice(1000, false)).toBe('1.0K');
      expect(PriceStandardizer.formatPrice(0.01, false)).toBe('0.0100');
    });

    it('should standardize before formatting', () => {
      expect(PriceStandardizer.formatPrice('100')).toBe('$100.00');
      expect(PriceStandardizer.formatPrice(null)).toBe('$0.000000');
    });
  });

  describe('validateCatalogPrices', () => {
    it('should validate catalog with valid prices', () => {
      const catalog = {
        models: [
          { model_code: 'model-1', input_price: 1, output_price: 2 },
          { model_code: 'model-2', input_price: 10, output_price: 20 }
        ]
      };
      
      const result = PriceStandardizer.validateCatalogPrices(catalog);
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.maxInputPrice).toBe(10);
      expect(result.maxOutputPrice).toBe(20);
      expect(result.summary).toContain('✅');
    });

    it('should detect models at price limit', () => {
      const catalog = {
        models: [
          { 
            model_code: 'expensive-model',
            provider_code: 'provider-1',
            input_price: 999999,
            output_price: 999999
          }
        ]
      };
      
      const result = PriceStandardizer.validateCatalogPrices(catalog);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        model: 'expensive-model',
        provider: 'provider-1',
        input_price: 999999,
        output_price: 999999,
        issue: 'Price at maximum limit'
      });
      expect(result.summary).toContain('⚠️');
    });

    it('should handle models exceeding limit', () => {
      const catalog = {
        models: [
          { 
            model_code: 'overflow-model',
            provider_code: 'provider-2',
            input_price: 1000000,
            output_price: 2000000
          }
        ]
      };
      
      const result = PriceStandardizer.validateCatalogPrices(catalog);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].input_price).toBe(999999);
      expect(result.issues[0].output_price).toBe(999999);
    });

    it('should handle empty catalog', () => {
      const result = PriceStandardizer.validateCatalogPrices({});
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.maxInputPrice).toBe(0);
      expect(result.maxOutputPrice).toBe(0);
    });

    it('should track maximum prices across all models', () => {
      const catalog = {
        models: [
          { model_code: 'model-1', input_price: 5, output_price: 10 },
          { model_code: 'model-2', input_price: 15, output_price: 8 },
          { model_code: 'model-3', input_price: 10, output_price: 20 }
        ]
      };
      
      const result = PriceStandardizer.validateCatalogPrices(catalog);
      
      expect(result.maxInputPrice).toBe(15);
      expect(result.maxOutputPrice).toBe(20);
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const price = Number.MAX_SAFE_INTEGER;
      expect(PriceStandardizer.standardizePrice(price)).toBe(999999);
    });

    it('should handle very small positive numbers', () => {
      const price = Number.MIN_VALUE;
      expect(PriceStandardizer.standardizePrice(price)).toBe(0);
    });

    it('should handle scientific notation', () => {
      expect(PriceStandardizer.standardizePrice(1e-6)).toBe(0.000001);
      expect(PriceStandardizer.standardizePrice(1e3)).toBe(1000);
    });
  });
});