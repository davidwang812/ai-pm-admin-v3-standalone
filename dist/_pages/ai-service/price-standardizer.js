/**
 * Price Standardization Module
 * 
 * 標準化價格處理，確保所有價格符合數據庫要求
 * 
 * 價格標準：
 * - 單位：美元 per 1K tokens
 * - 精度：最多6位小數
 * - 範圍：0 到 999,999.999999
 */

class PriceStandardizer {
  // 數據庫最大值限制
  static MAX_PRICE = 999999;
  
  /**
   * 標準化單個價格值
   * @param {number|string} price - 原始價格
   * @param {string} source - 數據源 ('openrouter', 'litellm', 'manual')
   * @param {string} modelId - 模型ID（用於日誌）
   * @returns {number} 標準化後的價格
   */
  static standardizePrice(price, source = 'unknown', modelId = '') {
    // 轉換為數字
    let numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // 處理無效值
    if (!numPrice || isNaN(numPrice) || !isFinite(numPrice) || numPrice < 0) {
      return 0;
    }
    
    // 根據數據源進行單位轉換
    if (source === 'litellm') {
      // LiteLLM: per token → per 1K tokens
      numPrice = numPrice * 1000;
    }
    // OpenRouter 已經是 per 1K tokens，不需要轉換
    
    // 限制最大值
    if (numPrice > this.MAX_PRICE) {
      console.warn(`⚠️ Price overflow for ${modelId}: ${numPrice} → ${this.MAX_PRICE}`);
      numPrice = this.MAX_PRICE;
    }
    
    // 保留6位小數
    return Math.round(numPrice * 1000000) / 1000000;
  }
  
  /**
   * 標準化模型數據
   * @param {Object} model - 模型對象
   * @param {string} source - 數據源
   * @returns {Object} 標準化後的模型對象
   */
  static standardizeModel(model, source = 'unknown') {
    return {
      ...model,
      input_price: this.standardizePrice(
        model.input_price,
        source,
        model.model_code || model.model_name
      ),
      output_price: this.standardizePrice(
        model.output_price,
        source,
        model.model_code || model.model_name
      )
    };
  }
  
  /**
   * 批量標準化模型列表
   * @param {Array} models - 模型列表
   * @param {string} source - 數據源
   * @returns {Array} 標準化後的模型列表
   */
  static standardizeModels(models, source = 'unknown') {
    return models.map(model => this.standardizeModel(model, source));
  }
  
  /**
   * 比較兩個價格是否有實質性差異
   * @param {number} price1 - 第一個價格
   * @param {number} price2 - 第二個價格
   * @param {number} threshold - 差異閾值（默認0.000001）
   * @returns {boolean} 是否有差異
   */
  static hasPriceChange(price1, price2, threshold = 0.000001) {
    const p1 = this.standardizePrice(price1);
    const p2 = this.standardizePrice(price2);
    return Math.abs(p1 - p2) > threshold;
  }
  
  /**
   * 格式化價格顯示
   * @param {number} price - 價格值
   * @param {boolean} showCurrency - 是否顯示貨幣符號
   * @returns {string} 格式化的價格字符串
   */
  static formatPrice(price, showCurrency = true) {
    const standardized = this.standardizePrice(price);
    
    // 根據價格大小選擇合適的顯示格式
    let formatted;
    if (standardized >= 1000) {
      // 大於1000，顯示為K
      formatted = `${(standardized / 1000).toFixed(1)}K`;
    } else if (standardized >= 1) {
      // 1-999，顯示2位小數
      formatted = standardized.toFixed(2);
    } else if (standardized >= 0.01) {
      // 0.01-0.99，顯示4位小數
      formatted = standardized.toFixed(4);
    } else {
      // 小於0.01，顯示6位小數
      formatted = standardized.toFixed(6);
    }
    
    return showCurrency ? `$${formatted}` : formatted;
  }
  
  /**
   * 驗證目錄數據的價格
   * @param {Object} catalogData - 包含providers和models的目錄數據
   * @returns {Object} 驗證結果
   */
  static validateCatalogPrices(catalogData) {
    const issues = [];
    let maxInputPrice = 0;
    let maxOutputPrice = 0;
    
    catalogData.models?.forEach(model => {
      const input = this.standardizePrice(model.input_price);
      const output = this.standardizePrice(model.output_price);
      
      if (input > maxInputPrice) maxInputPrice = input;
      if (output > maxOutputPrice) maxOutputPrice = output;
      
      if (input >= this.MAX_PRICE || output >= this.MAX_PRICE) {
        issues.push({
          model: model.model_code,
          provider: model.provider_code,
          input_price: input,
          output_price: output,
          issue: 'Price at maximum limit'
        });
      }
    });
    
    return {
      valid: issues.length === 0,
      issues,
      maxInputPrice,
      maxOutputPrice,
      summary: issues.length === 0 
        ? '✅ All prices within limits'
        : `⚠️ ${issues.length} models at price limit`
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PriceStandardizer;
}