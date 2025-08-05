/**
 * Auto Rollback System
 * 自动回滚系统 - 检测到问题时自动回滚到稳定状态
 */

import { featureFlags } from './feature-flags.js';
import { performanceMonitor } from './performance-monitor.js';

class AutoRollback {
  constructor() {
    this.rollbackPoints = new Map();
    this.healthChecks = new Map();
    this.rollbackHistory = [];
    this.monitoring = false;
    
    // 设置默认健康检查
    this.setupDefaultHealthChecks();
    
    // 开始监控
    this.startMonitoring();
  }

  /**
   * 设置默认健康检查
   */
  setupDefaultHealthChecks() {
    // API响应时间检查
    this.addHealthCheck('api_response_time', {
      check: () => {
        const stats = performanceMonitor.getStats('api.response_time', 60000); // 1分钟
        return stats ? stats.avg < 2000 : true; // 平均响应时间小于2秒
      },
      threshold: 0.8, // 80%的检查通过才算健康
      description: 'API响应时间检查'
    });

    // 错误率检查
    this.addHealthCheck('error_rate', {
      check: () => {
        const stats = performanceMonitor.getStats('error.count', 60000);
        const totalStats = performanceMonitor.getStats('api.request_count', 60000);
        
        if (!stats || !totalStats || totalStats.sum === 0) return true;
        
        const errorRate = (stats.sum / totalStats.sum) * 100;
        return errorRate < 5; // 错误率小于5%
      },
      threshold: 0.9,
      description: '错误率检查'
    });

    // 内存使用检查
    this.addHealthCheck('memory_usage', {
      check: () => {
        const stats = performanceMonitor.getStats('memory.heap_used', 30000);
        return stats ? stats.latest < 200 * 1024 * 1024 : true; // 小于200MB
      },
      threshold: 0.7,
      description: '内存使用检查'
    });

    // 关键功能检查
    this.addHealthCheck('critical_functions', {
      check: () => {
        // 检查关键功能是否正常
        try {
          // 这里可以添加具体的功能检查
          return true;
        } catch (error) {
          console.error('Critical function check failed:', error);
          return false;
        }
      },
      threshold: 1.0, // 必须100%通过
      description: '关键功能检查'
    });
  }

  /**
   * 开始监控
   */
  startMonitoring() {
    if (!featureFlags.isEnabled('USE_AUTO_ROLLBACK')) {
      return;
    }

    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    
    // 每30秒进行一次健康检查
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // 监听性能告警
    performanceMonitor.addAlertObserver((alert) => {
      if (alert.level === 'critical') {
        this.handleCriticalAlert(alert);
      }
    });

    console.log('Auto rollback monitoring started');
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Auto rollback monitoring stopped');
  }

  /**
   * 创建回滚点
   */
  createRollbackPoint(name, state) {
    const rollbackPoint = {
      name,
      timestamp: new Date(),
      state: this.deepClone(state),
      featureFlags: this.captureFeatureFlags(),
      metrics: this.captureMetrics()
    };

    this.rollbackPoints.set(name, rollbackPoint);
    
    // 保持最近10个回滚点
    if (this.rollbackPoints.size > 10) {
      const oldest = Array.from(this.rollbackPoints.keys())[0];
      this.rollbackPoints.delete(oldest);
    }

    console.log(`Rollback point '${name}' created`);
    return rollbackPoint;
  }

  /**
   * 执行回滚
   */
  async rollback(rollbackPointName, reason = 'Manual rollback') {
    const rollbackPoint = this.rollbackPoints.get(rollbackPointName);
    if (!rollbackPoint) {
      throw new Error(`Rollback point '${rollbackPointName}' not found`);
    }

    console.warn(`🔄 Executing rollback to '${rollbackPointName}' - Reason: ${reason}`);

    try {
      // 记录回滚历史
      const rollbackRecord = {
        timestamp: new Date(),
        rollbackPoint: rollbackPointName,
        reason,
        success: false,
        error: null
      };

      // 恢复功能开关状态
      await this.restoreFeatureFlags(rollbackPoint.featureFlags);

      // 恢复应用状态（如果提供了状态恢复函数）
      if (rollbackPoint.state && this.stateRestorer) {
        await this.stateRestorer(rollbackPoint.state);
      }

      // 等待系统稳定
      await this.waitForStability();

      rollbackRecord.success = true;
      this.rollbackHistory.push(rollbackRecord);

      console.log(`✅ Rollback to '${rollbackPointName}' completed successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Rollback to '${rollbackPointName}' failed:`, error);
      
      this.rollbackHistory.push({
        timestamp: new Date(),
        rollbackPoint: rollbackPointName,
        reason,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 添加健康检查
   */
  addHealthCheck(name, config) {
    this.healthChecks.set(name, {
      ...config,
      lastCheck: null,
      failureCount: 0,
      consecutiveFailures: 0
    });
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    if (!featureFlags.isEnabled('USE_AUTO_ROLLBACK')) {
      return;
    }

    const results = new Map();
    let totalChecks = 0;
    let passedChecks = 0;

    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const passed = await healthCheck.check();
        results.set(name, { passed, error: null });
        
        if (passed) {
          healthCheck.consecutiveFailures = 0;
          passedChecks++;
        } else {
          healthCheck.failureCount++;
          healthCheck.consecutiveFailures++;
        }
        
        totalChecks++;
        healthCheck.lastCheck = new Date();

      } catch (error) {
        results.set(name, { passed: false, error: error.message });
        healthCheck.failureCount++;
        healthCheck.consecutiveFailures++;
        healthCheck.lastCheck = new Date();
        totalChecks++;

        console.error(`Health check '${name}' failed:`, error);
      }
    }

    // 检查是否需要回滚
    this.evaluateRollbackNeed(results);

    // 记录健康检查结果
    performanceMonitor.record('health_check.total', totalChecks);
    performanceMonitor.record('health_check.passed', passedChecks);
    performanceMonitor.record('health_check.success_rate', (passedChecks / totalChecks) * 100);
  }

  /**
   * 评估是否需要回滚
   */
  evaluateRollbackNeed(results) {
    let criticalFailures = 0;
    let totalWeight = 0;
    let failedWeight = 0;

    for (const [name, result] of results) {
      const healthCheck = this.healthChecks.get(name);
      const weight = healthCheck.threshold;
      
      totalWeight += weight;
      
      if (!result.passed) {
        failedWeight += weight;
        
        // 检查连续失败次数
        if (healthCheck.consecutiveFailures >= 3) {
          criticalFailures++;
        }
      }
    }

    const healthScore = 1 - (failedWeight / totalWeight);
    
    // 记录健康分数
    performanceMonitor.record('system.health_score', healthScore * 100);

    // 回滚条件：健康分数低于60%或有2个以上关键失败
    if (healthScore < 0.6 || criticalFailures >= 2) {
      this.triggerAutoRollback('Health check failure', { healthScore, criticalFailures });
    }
  }

  /**
   * 处理关键告警
   */
  handleCriticalAlert(alert) {
    console.warn(`🚨 Critical alert received: ${alert.message}`);
    
    // 如果是内存或错误率相关的关键告警，考虑回滚
    if (alert.metricName.includes('memory') || alert.metricName.includes('error')) {
      this.triggerAutoRollback('Critical alert', { alert: alert.message });
    }
  }

  /**
   * 触发自动回滚
   */
  async triggerAutoRollback(reason, details = {}) {
    if (!featureFlags.isEnabled('USE_AUTO_ROLLBACK')) {
      console.warn('Auto rollback is disabled, skipping rollback');
      return;
    }

    // 找到最近的稳定回滚点
    const rollbackPoint = this.findStableRollbackPoint();
    if (!rollbackPoint) {
      console.error('No stable rollback point found, cannot perform auto rollback');
      return;
    }

    console.warn(`🚨 Triggering auto rollback - Reason: ${reason}`, details);
    
    try {
      await this.rollback(rollbackPoint.name, `Auto rollback: ${reason}`);
      
      // 暂时禁用可能有问题的功能
      this.disableRecentFeatures();
      
    } catch (error) {
      console.error('Auto rollback failed:', error);
      
      // 如果自动回滚失败，尝试进入安全模式
      this.enterSafeMode();
    }
  }

  /**
   * 寻找稳定的回滚点
   */
  findStableRollbackPoint() {
    const sortedPoints = Array.from(this.rollbackPoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const point of sortedPoints) {
      // 选择30分钟前的回滚点，确保稳定性
      if (Date.now() - point.timestamp.getTime() > 30 * 60 * 1000) {
        return point;
      }
    }

    return sortedPoints[sortedPoints.length - 1]; // 返回最老的回滚点
  }

  /**
   * 禁用最近启用的功能
   */
  disableRecentFeatures() {
    const recentFlags = featureFlags.getAllFlags();
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    for (const [flagName, flag] of Object.entries(recentFlags)) {
      if (flag.enabled && new Date(flag.updatedAt).getTime() > thirtyMinutesAgo) {
        console.warn(`Disabling recent feature: ${flagName}`);
        featureFlags.disable(flagName);
      }
    }
  }

  /**
   * 进入安全模式
   */
  enterSafeMode() {
    console.warn('🛡️ Entering safe mode - disabling all experimental features');
    
    // 禁用所有实验性功能
    const allFlags = featureFlags.getAllFlags();
    for (const [flagName, flag] of Object.entries(allFlags)) {
      if (flag.enabled && flagName.includes('EXPERIMENTAL')) {
        featureFlags.disable(flagName);
      }
    }

    // 启用安全检查
    featureFlags.enable('ENABLE_SAFETY_CHECKS');
  }

  /**
   * 等待系统稳定
   */
  async waitForStability(timeout = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 进行快速健康检查
      let allHealthy = true;
      for (const [name, healthCheck] of this.healthChecks) {
        try {
          const result = await healthCheck.check();
          if (!result) {
            allHealthy = false;
            break;
          }
        } catch (error) {
          allHealthy = false;
          break;
        }
      }
      
      if (allHealthy) {
        console.log('System stabilized');
        return true;
      }
    }
    
    throw new Error('System failed to stabilize within timeout');
  }

  /**
   * 捕获功能开关状态
   */
  captureFeatureFlags() {
    return featureFlags.getAllFlags();
  }

  /**
   * 恢复功能开关状态
   */
  async restoreFeatureFlags(flagsState) {
    for (const [flagName, flag] of Object.entries(flagsState)) {
      try {
        if (flag.enabled) {
          featureFlags.enable(flagName, { rolloutPercentage: flag.rolloutPercentage });
        } else {
          featureFlags.disable(flagName);
        }
      } catch (error) {
        console.error(`Failed to restore feature flag ${flagName}:`, error);
      }
    }
  }

  /**
   * 捕获指标快照
   */
  captureMetrics() {
    return {
      timestamp: new Date(),
      healthScore: performanceMonitor.getStats('system.health_score'),
      errorRate: performanceMonitor.getStats('error.rate'),
      responseTime: performanceMonitor.getStats('api.response_time')
    };
  }

  /**
   * 深度克隆对象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * 设置状态恢复器
   */
  setStateRestorer(restorer) {
    this.stateRestorer = restorer;
  }

  /**
   * 获取回滚历史
   */
  getRollbackHistory() {
    return this.rollbackHistory.slice(); // 返回副本
  }

  /**
   * 获取健康状态
   */
  getHealthStatus() {
    const status = {};
    for (const [name, healthCheck] of this.healthChecks) {
      status[name] = {
        description: healthCheck.description,
        lastCheck: healthCheck.lastCheck,
        failureCount: healthCheck.failureCount,
        consecutiveFailures: healthCheck.consecutiveFailures
      };
    }
    return status;
  }
}

// 创建全局实例
const autoRollback = new AutoRollback();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutoRollback, autoRollback };
}

export { AutoRollback, autoRollback };