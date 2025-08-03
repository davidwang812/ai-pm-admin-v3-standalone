/**
 * Catalog Comparison Module
 * 
 * 智能比對目錄數據，檢測實質性變化
 */

class CatalogComparator {
  /**
   * 比對兩個目錄數據集
   * @param {Object} currentData - 當前數據庫中的數據
   * @param {Object} newData - 新獲取的數據
   * @returns {Object} 比對結果
   */
  static compare(currentData, newData) {
    const result = {
      hasChanges: false,
      totalChanges: 0,
      providers: {
        new: [],
        updated: [],
        removed: [],
        unchanged: []
      },
      models: {
        new: [],
        updated: [],
        removed: [],
        priceChanges: [],
        unchanged: []
      },
      summary: ''
    };
    
    // 創建查找映射
    const currentProviderMap = new Map();
    const currentModelMap = new Map();
    const newProviderMap = new Map();
    const newModelMap = new Map();
    
    // 構建當前數據映射
    currentData.providers?.forEach(p => {
      currentProviderMap.set(p.provider_code, p);
    });
    currentData.models?.forEach(m => {
      const key = `${m.provider_code}:${m.model_code}`;
      currentModelMap.set(key, m);
    });
    
    // 構建新數據映射
    newData.providers?.forEach(p => {
      newProviderMap.set(p.provider_code, p);
    });
    newData.models?.forEach(m => {
      const key = `${m.provider_code}:${m.model_code}`;
      newModelMap.set(key, m);
    });
    
    // 比對服務商
    newProviderMap.forEach((newProvider, code) => {
      const currentProvider = currentProviderMap.get(code);
      if (!currentProvider) {
        result.providers.new.push(newProvider);
      } else if (this.hasProviderChanged(currentProvider, newProvider)) {
        result.providers.updated.push({
          ...newProvider,
          changes: this.getProviderChanges(currentProvider, newProvider)
        });
      } else {
        result.providers.unchanged.push(code);
      }
    });
    
    // 查找被移除的服務商
    currentProviderMap.forEach((currentProvider, code) => {
      if (!newProviderMap.has(code)) {
        result.providers.removed.push(currentProvider);
      }
    });
    
    // 比對模型
    newModelMap.forEach((newModel, key) => {
      const currentModel = currentModelMap.get(key);
      if (!currentModel) {
        result.models.new.push(newModel);
      } else {
        const changes = this.getModelChanges(currentModel, newModel);
        if (changes.hasChanges) {
          if (changes.priceChanged) {
            result.models.priceChanges.push({
              ...newModel,
              old_input_price: currentModel.input_price,
              old_output_price: currentModel.output_price,
              price_change: changes.priceChange
            });
          }
          result.models.updated.push({
            ...newModel,
            changes: changes.details
          });
        } else {
          result.models.unchanged.push(key);
        }
      }
    });
    
    // 查找被移除的模型
    currentModelMap.forEach((currentModel, key) => {
      if (!newModelMap.has(key)) {
        result.models.removed.push(currentModel);
      }
    });
    
    // 計算總變化數
    result.totalChanges = 
      result.providers.new.length +
      result.providers.updated.length +
      result.providers.removed.length +
      result.models.new.length +
      result.models.updated.length +
      result.models.removed.length;
    
    result.hasChanges = result.totalChanges > 0;
    
    // 生成摘要
    result.summary = this.generateSummary(result);
    
    return result;
  }
  
  /**
   * 檢查服務商是否有變化
   */
  static hasProviderChanged(current, updated) {
    return (
      current.provider_name !== updated.provider_name ||
      current.display_name !== updated.display_name ||
      current.description !== updated.description ||
      current.website !== updated.website ||
      current.api_format !== updated.api_format ||
      current.is_active !== updated.is_active
    );
  }
  
  /**
   * 獲取服務商的具體變化
   */
  static getProviderChanges(current, updated) {
    const changes = [];
    
    if (current.provider_name !== updated.provider_name) {
      changes.push(`Name: ${current.provider_name} → ${updated.provider_name}`);
    }
    if (current.display_name !== updated.display_name) {
      changes.push(`Display: ${current.display_name} → ${updated.display_name}`);
    }
    if (current.is_active !== updated.is_active) {
      changes.push(`Status: ${current.is_active ? 'Active' : 'Inactive'} → ${updated.is_active ? 'Active' : 'Inactive'}`);
    }
    
    return changes;
  }
  
  /**
   * 獲取模型的具體變化
   */
  static getModelChanges(current, updated) {
    const changes = {
      hasChanges: false,
      priceChanged: false,
      priceChange: null,
      details: []
    };
    
    // 標準化價格以進行比較（避免浮點數精度問題）
    const currentInputPrice = Math.round(current.input_price * 1000000) / 1000000;
    const currentOutputPrice = Math.round(current.output_price * 1000000) / 1000000;
    const updatedInputPrice = Math.round(updated.input_price * 1000000) / 1000000;
    const updatedOutputPrice = Math.round(updated.output_price * 1000000) / 1000000;
    
    // 價格變化閾值（0.000001）
    const priceThreshold = 0.000001;
    
    if (Math.abs(currentInputPrice - updatedInputPrice) > priceThreshold) {
      changes.priceChanged = true;
      changes.priceChange = {
        input: {
          old: currentInputPrice,
          new: updatedInputPrice,
          diff: updatedInputPrice - currentInputPrice,
          percent: currentInputPrice > 0 ? ((updatedInputPrice - currentInputPrice) / currentInputPrice * 100).toFixed(2) : 'N/A'
        }
      };
      changes.details.push(`Input price: $${currentInputPrice} → $${updatedInputPrice}`);
    }
    
    if (Math.abs(currentOutputPrice - updatedOutputPrice) > priceThreshold) {
      changes.priceChanged = true;
      if (!changes.priceChange) changes.priceChange = {};
      changes.priceChange.output = {
        old: currentOutputPrice,
        new: updatedOutputPrice,
        diff: updatedOutputPrice - currentOutputPrice,
        percent: currentOutputPrice > 0 ? ((updatedOutputPrice - currentOutputPrice) / currentOutputPrice * 100).toFixed(2) : 'N/A'
      };
      changes.details.push(`Output price: $${currentOutputPrice} → $${updatedOutputPrice}`);
    }
    
    // 其他屬性變化
    if (current.model_name !== updated.model_name) {
      changes.details.push(`Name: ${current.model_name} → ${updated.model_name}`);
    }
    if (current.context_length !== updated.context_length) {
      changes.details.push(`Context: ${current.context_length} → ${updated.context_length}`);
    }
    if (current.max_tokens !== updated.max_tokens) {
      changes.details.push(`Max tokens: ${current.max_tokens} → ${updated.max_tokens}`);
    }
    if (current.is_active !== updated.is_active) {
      changes.details.push(`Status: ${current.is_active ? 'Active' : 'Inactive'} → ${updated.is_active ? 'Active' : 'Inactive'}`);
    }
    
    changes.hasChanges = changes.details.length > 0;
    
    return changes;
  }
  
  /**
   * 生成比對摘要
   */
  static generateSummary(result) {
    const parts = [];
    
    if (result.providers.new.length > 0) {
      parts.push(`${result.providers.new.length} 個新服務商`);
    }
    if (result.providers.updated.length > 0) {
      parts.push(`${result.providers.updated.length} 個服務商更新`);
    }
    if (result.providers.removed.length > 0) {
      parts.push(`${result.providers.removed.length} 個服務商移除`);
    }
    
    if (result.models.new.length > 0) {
      parts.push(`${result.models.new.length} 個新模型`);
    }
    if (result.models.priceChanges.length > 0) {
      parts.push(`${result.models.priceChanges.length} 個模型價格變動`);
    }
    if (result.models.updated.length > 0 && result.models.updated.length > result.models.priceChanges.length) {
      const otherUpdates = result.models.updated.length - result.models.priceChanges.length;
      parts.push(`${otherUpdates} 個模型其他更新`);
    }
    if (result.models.removed.length > 0) {
      parts.push(`${result.models.removed.length} 個模型移除`);
    }
    
    if (parts.length === 0) {
      return '✅ 數據已是最新，無需更新';
    }
    
    return '📊 ' + parts.join('、');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CatalogComparator;
}