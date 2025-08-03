/**
 * Load Balance Module
 * 负载均衡配置管理
 */

export class LoadBalanceManager {
  constructor() {
    this.providers = [];
    this.weights = new Map();
    this.healthStatus = new Map();
  }

  /**
   * 添加服务提供商
   */
  addProvider(id, config) {
    this.providers.push({ id, ...config });
    this.weights.set(id, config.weight || 1);
    this.healthStatus.set(id, true);
  }

  /**
   * 获取可用的提供商
   */
  getAvailableProviders() {
    return this.providers.filter(p => this.healthStatus.get(p.id));
  }

  /**
   * 根据权重选择提供商
   */
  selectProvider() {
    const available = this.getAvailableProviders();
    if (available.length === 0) return null;

    const totalWeight = available.reduce((sum, p) => sum + this.weights.get(p.id), 0);
    let random = Math.random() * totalWeight;
    
    for (const provider of available) {
      random -= this.weights.get(provider.id);
      if (random <= 0) {
        return provider;
      }
    }
    
    return available[0]; // 备选
  }

  /**
   * 更新健康状态
   */
  updateHealth(id, isHealthy) {
    this.healthStatus.set(id, isHealthy);
  }

  /**
   * 获取负载均衡统计
   */
  getStats() {
    return {
      total: this.providers.length,
      healthy: Array.from(this.healthStatus.values()).filter(Boolean).length,
      providers: this.providers.map(p => ({
        ...p,
        weight: this.weights.get(p.id),
        healthy: this.healthStatus.get(p.id)
      }))
    };
  }
}

// 创建默认实例
const loadBalanceManager = new LoadBalanceManager();

export default loadBalanceManager;