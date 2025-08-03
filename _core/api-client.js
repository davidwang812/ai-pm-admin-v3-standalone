/**
 * API Client Module
 * V3核心API客户端 - 3秒超时，请求去重，智能降级
 */

export class ApiClient {
  constructor(config = {}) {
    // 从全局config获取API端点
    const globalConfig = window.adminV3Config || {};
    const apiEndpoint = globalConfig.environment?.apiEndpoint || 
                       config.baseURL || 
                       'https://aiproductmanager-production.up.railway.app/api';
    
    this.config = {
      baseURL: apiEndpoint,
      timeout: config.timeout || 3000, // 3秒超时
      retryAttempts: config.retryAttempts || 2,
      retryDelay: config.retryDelay || 1000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    };
    
    // 请求去重Map
    this.pendingRequests = new Map();
    
    // 简单内存缓存
    this.cache = new Map();
    
    // 请求统计
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      cached: 0,
      timeout: 0
    };
  }

  /**
   * 通用请求方法
   */
  async request(url, options = {}) {
    const fullURL = this.buildURL(url);
    const requestKey = this.getRequestKey(options.method || 'GET', fullURL);
    
    // 检查是否有相同的请求正在进行
    if (this.pendingRequests.has(requestKey)) {
      console.log(`♻️ Reusing pending request: ${requestKey}`);
      this.stats.cached++;
      return this.pendingRequests.get(requestKey);
    }
    
    // 创建新请求Promise
    const requestPromise = this.executeRequest(fullURL, options)
      .finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    
    // 存储到pending map
    this.pendingRequests.set(requestKey, requestPromise);
    
    return requestPromise;
  }

  /**
   * 执行实际请求
   */
  async executeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    this.stats.total++;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.config.headers,
          ...options.headers,
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : ''
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.stats.success++;
      
      // 缓存成功的GET请求
      if (options.method === 'GET' || !options.method) {
        this.cacheResponse(url, data);
      }
      
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.warn(`⏱️ Request timeout: ${url}`);
        this.stats.timeout++;
        return this.handleTimeout(url, options);
      }
      
      this.stats.failed++;
      throw error;
    }
  }

  /**
   * 处理超时
   */
  async handleTimeout(url, options) {
    // 尝试从缓存获取
    const cached = this.getCachedResponse(url);
    if (cached) {
      console.log('📦 Using cached data after timeout');
      this.stats.cached++;
      return cached;
    }
    
    // 重试逻辑
    const retryCount = options.retryCount || 0;
    if (retryCount < this.config.retryAttempts) {
      console.log(`🔄 Retrying (${retryCount + 1}/${this.config.retryAttempts})...`);
      await this.delay(this.config.retryDelay);
      return this.request(url, {
        ...options,
        retryCount: retryCount + 1
      });
    }
    
    // 返回降级数据
    return this.getFallbackData(url);
  }

  /**
   * GET请求
   */
  async get(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * POST请求
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT请求
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE请求
   */
  async delete(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'DELETE'
    });
  }

  /**
   * 构建完整URL
   */
  buildURL(url) {
    if (url.startsWith('http')) {
      return url;
    }
    return `${this.config.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  /**
   * 生成请求key用于去重
   */
  getRequestKey(method, url) {
    return `${method}:${url}`;
  }

  /**
   * 获取认证Token
   */
  getAuthToken() {
    return localStorage.getItem('admin_token_v3');
  }

  /**
   * 缓存响应
   */
  cacheResponse(url, data) {
    this.cache.set(url, {
      data,
      timestamp: Date.now()
    });
    
    // 限制缓存大小
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * 获取缓存的响应
   */
  getCachedResponse(url) {
    const cached = this.cache.get(url);
    if (!cached) return null;
    
    // 检查缓存是否过期（5分钟）
    if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
      this.cache.delete(url);
      return null;
    }
    
    return cached.data;
  }

  /**
   * 获取降级数据
   */
  getFallbackData(url) {
    // 根据URL返回不同的降级数据
    if (url.includes('/providers')) {
      return { success: true, data: [], message: 'Using fallback data' };
    }
    if (url.includes('/config')) {
      return { success: true, data: {}, message: 'Using fallback data' };
    }
    return { success: false, message: 'Request failed' };
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.total ? (this.stats.success / this.stats.total * 100).toFixed(2) + '%' : '0%',
      cacheHitRate: this.stats.total ? (this.stats.cached / this.stats.total * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
}

// 创建默认实例
const apiClient = new ApiClient();

export default apiClient;