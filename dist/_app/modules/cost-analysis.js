/**
 * Cost Analysis Module
 * 成本分析和预算管理
 */

export class CostAnalyzer {
  constructor() {
    this.costs = [];
    this.budgets = new Map();
    this.alerts = [];
  }

  /**
   * 记录成本
   */
  recordCost(provider, service, amount, currency = 'USD') {
    const cost = {
      id: Date.now(),
      provider,
      service,
      amount,
      currency,
      timestamp: new Date(),
      date: new Date().toISOString().split('T')[0]
    };
    
    this.costs.push(cost);
    this.checkBudgetAlerts(provider, service);
    return cost;
  }

  /**
   * 设置预算
   */
  setBudget(key, limit, period = 'monthly') {
    this.budgets.set(key, { limit, period, spent: 0 });
  }

  /**
   * 获取成本统计
   */
  getCostStats(period = 'monthly') {
    const now = new Date();
    const startDate = this.getStartDate(now, period);
    
    const periodCosts = this.costs.filter(c => 
      new Date(c.timestamp) >= startDate
    );

    const byProvider = {};
    const byService = {};
    let total = 0;

    periodCosts.forEach(cost => {
      total += cost.amount;
      
      if (!byProvider[cost.provider]) {
        byProvider[cost.provider] = 0;
      }
      byProvider[cost.provider] += cost.amount;
      
      if (!byService[cost.service]) {
        byService[cost.service] = 0;
      }
      byService[cost.service] += cost.amount;
    });

    return {
      total,
      byProvider,
      byService,
      count: periodCosts.length,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  }

  /**
   * 获取成本趋势
   */
  getCostTrend(days = 30) {
    const trends = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayCosts = this.costs.filter(c => c.date === dateStr);
      const dayTotal = dayCosts.reduce((sum, c) => sum + c.amount, 0);
      
      trends.push({
        date: dateStr,
        amount: dayTotal,
        count: dayCosts.length
      });
    }
    
    return trends;
  }

  /**
   * 检查预算警告
   */
  checkBudgetAlerts(provider, service) {
    const stats = this.getCostStats('monthly');
    
    // 检查总预算
    if (this.budgets.has('total')) {
      const budget = this.budgets.get('total');
      const usage = stats.total / budget.limit;
      
      if (usage >= 0.9 && !this.hasAlert('total', 'high')) {
        this.alerts.push({
          type: 'budget',
          level: 'high',
          key: 'total',
          message: `总预算已使用 ${(usage * 100).toFixed(1)}%`,
          timestamp: new Date()
        });
      } else if (usage >= 0.75 && !this.hasAlert('total', 'medium')) {
        this.alerts.push({
          type: 'budget',
          level: 'medium',
          key: 'total',
          message: `总预算已使用 ${(usage * 100).toFixed(1)}%`,
          timestamp: new Date()
        });
      }
    }
    
    // 检查提供商预算
    if (this.budgets.has(provider)) {
      const budget = this.budgets.get(provider);
      const providerCost = stats.byProvider[provider] || 0;
      const usage = providerCost / budget.limit;
      
      if (usage >= 0.9 && !this.hasAlert(provider, 'high')) {
        this.alerts.push({
          type: 'budget',
          level: 'high',
          key: provider,
          message: `${provider} 预算已使用 ${(usage * 100).toFixed(1)}%`,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * 检查是否存在警告
   */
  hasAlert(key, level) {
    const recent = new Date();
    recent.setHours(recent.getHours() - 1); // 1小时内的警告
    
    return this.alerts.some(alert => 
      alert.key === key && 
      alert.level === level && 
      new Date(alert.timestamp) > recent
    );
  }

  /**
   * 获取开始日期
   */
  getStartDate(now, period) {
    const start = new Date(now);
    
    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'yearly':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }
    
    return start;
  }

  /**
   * 获取预算状态
   */
  getBudgetStatus() {
    const stats = this.getCostStats('monthly');
    const status = {};
    
    for (const [key, budget] of this.budgets) {
      const spent = key === 'total' ? stats.total : (stats.byProvider[key] || 0);
      const usage = spent / budget.limit;
      
      status[key] = {
        limit: budget.limit,
        spent,
        remaining: Math.max(0, budget.limit - spent),
        usage: usage,
        status: usage >= 0.9 ? 'critical' : usage >= 0.75 ? 'warning' : 'normal'
      };
    }
    
    return status;
  }

  /**
   * 导出成本数据
   */
  exportData(format = 'json') {
    const data = {
      costs: this.costs,
      budgets: Object.fromEntries(this.budgets),
      alerts: this.alerts,
      stats: this.getCostStats('monthly'),
      exportDate: new Date().toISOString()
    };
    
    if (format === 'csv') {
      return this.convertToCSV(this.costs);
    }
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(costs) {
    const headers = ['Date', 'Provider', 'Service', 'Amount', 'Currency'];
    const rows = costs.map(cost => [
      cost.timestamp.toISOString(),
      cost.provider,
      cost.service,
      cost.amount,
      cost.currency
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// 创建默认实例
const costAnalyzer = new CostAnalyzer();

export default costAnalyzer;