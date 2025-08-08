/**
 * Performance Monitor
 * 性能监控和告警系统
 */

import { featureFlags } from './feature-flags.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = new Map();
    this.alerts = [];
    this.observers = [];
    this.timers = new Map();
    
    // 设置默认阈值
    this.setDefaultThresholds();
    
    // 启动监控
    this.startMonitoring();
  }

  /**
   * 设置默认性能阈值
   */
  setDefaultThresholds() {
    const defaultThresholds = {
      // API响应时间 (毫秒)
      'api.response_time': { warning: 1000, critical: 3000 },
      
      // 内存使用
      'memory.heap_used': { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 }, // 50MB, 100MB
      
      // 函数执行时间
      'function.execution_time': { warning: 500, critical: 2000 },
      
      // 错误率 (百分比)
      'error.rate': { warning: 5, critical: 10 },
      
      // DOM操作时间
      'dom.render_time': { warning: 100, critical: 500 },
      
      // 缓存命中率
      'cache.hit_rate': { warning: 80, critical: 60 }, // 低于这个值告警
      
      // 请求队列长度
      'queue.length': { warning: 10, critical: 50 }
    };

    for (const [key, value] of Object.entries(defaultThresholds)) {
      this.thresholds.set(key, value);
    }
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    if (!featureFlags.isEnabled('USE_PERFORMANCE_MONITORING')) {
      return;
    }

    // 监控内存使用
    if (typeof process !== 'undefined') {
      setInterval(() => this.collectMemoryMetrics(), 30000); // 30秒
    }

    // 监控DOM性能
    if (typeof window !== 'undefined') {
      this.observeWebVitals();
    }

    console.log('Performance monitoring started');
  }

  /**
   * 记录性能指标
   */
  record(metricName, value, tags = {}) {
    if (!featureFlags.isEnabled('USE_PERFORMANCE_MONITORING')) {
      return;
    }

    const timestamp = Date.now();
    const metric = {
      name: metricName,
      value,
      tags,
      timestamp
    };

    // 存储指标
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    
    const metricHistory = this.metrics.get(metricName);
    metricHistory.push(metric);
    
    // 保持最近1000个数据点
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    // 检查阈值
    this.checkThresholds(metricName, value);

    // 日志记录
    if (featureFlags.isEnabled('ENABLE_PERFORMANCE_LOGS')) {
      console.log(`[PERF] ${metricName}: ${value}`, tags);
    }
  }

  /**
   * 标记性能时间点
   */
  mark(markName, tags = {}) {
    if (typeof performance !== 'undefined' && performance.mark) {
      try {
        performance.mark(markName);
      } catch (e) {
        // 某些环境可能不支持performance.mark
      }
    }
    // 记录到metrics中
    this.record(`mark.${markName}`, performance.now(), tags);
  }

  /**
   * 测量两个标记之间的时间
   */
  measure(measureName, startMark, endMark) {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(measureName, startMark, endMark);
      } catch (e) {
        // 某些环境可能不支持performance.measure
      }
    }
  }

  /**
   * 开始计时
   */
  startTimer(timerName, tags = {}) {
    this.timers.set(timerName, {
      startTime: performance.now(),
      tags
    });
  }

  /**
   * 结束计时并记录
   */
  endTimer(timerName) {
    const timer = this.timers.get(timerName);
    if (!timer) {
      console.warn(`Timer '${timerName}' not found`);
      return null;
    }

    const duration = performance.now() - timer.startTime;
    this.record(`timer.${timerName}`, duration, timer.tags);
    this.timers.delete(timerName);
    
    return duration;
  }

  /**
   * 监控函数执行性能
   */
  monitor(functionName, fn, context = null) {
    return (...args) => {
      const startTime = performance.now();
      const timerName = `function.${functionName}`;
      
      try {
        const result = context ? fn.apply(context, args) : fn(...args);
        
        // 如果是Promise，监控异步执行
        if (result && typeof result.then === 'function') {
          return result
            .then(value => {
              const duration = performance.now() - startTime;
              this.record(timerName, duration, { status: 'success' });
              return value;
            })
            .catch(error => {
              const duration = performance.now() - startTime;
              this.record(timerName, duration, { status: 'error' });
              this.recordError(functionName, error);
              throw error;
            });
        } else {
          // 同步函数
          const duration = performance.now() - startTime;
          this.record(timerName, duration, { status: 'success' });
          return result;
        }
      } catch (error) {
        const duration = performance.now() - startTime;
        this.record(timerName, duration, { status: 'error' });
        this.recordError(functionName, error);
        throw error;
      }
    };
  }

  /**
   * 记录错误
   */
  recordError(source, error) {
    this.record('error.count', 1, {
      source,
      message: error.message,
      stack: error.stack
    });
  }

  /**
   * 收集内存指标
   */
  collectMemoryMetrics() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      this.record('memory.heap_used', memory.heapUsed);
      this.record('memory.heap_total', memory.heapTotal);
      this.record('memory.external', memory.external);
      this.record('memory.rss', memory.rss);
    }

    if (typeof window !== 'undefined' && window.performance.memory) {
      const memory = window.performance.memory;
      this.record('memory.js_heap_used', memory.usedJSHeapSize);
      this.record('memory.js_heap_total', memory.totalJSHeapSize);
    }
  }

  /**
   * 观察Web Vitals
   */
  observeWebVitals() {
    if (typeof window === 'undefined') return;

    // First Contentful Paint (FCP)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.record('web_vitals.fcp', entry.startTime);
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('Failed to observe paint metrics:', e);
      }
    }

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.record('web_vitals.lcp', lastEntry.startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('Failed to observe LCP:', e);
      }
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          this.record('web_vitals.cls', clsValue);
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('Failed to observe CLS:', e);
      }
    }
  }

  /**
   * 检查阈值并触发告警
   */
  checkThresholds(metricName, value) {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return;

    let alertLevel = null;
    let message = null;

    // 对于命中率类型的指标，低于阈值才告警
    if (metricName.includes('hit_rate')) {
      if (value < threshold.critical) {
        alertLevel = 'critical';
        message = `${metricName} is critically low: ${value}% (threshold: ${threshold.critical}%)`;
      } else if (value < threshold.warning) {
        alertLevel = 'warning';
        message = `${metricName} is low: ${value}% (threshold: ${threshold.warning}%)`;
      }
    } else {
      // 对于其他指标，高于阈值才告警
      if (value > threshold.critical) {
        alertLevel = 'critical';
        message = `${metricName} exceeded critical threshold: ${value} (threshold: ${threshold.critical})`;
      } else if (value > threshold.warning) {
        alertLevel = 'warning';
        message = `${metricName} exceeded warning threshold: ${value} (threshold: ${threshold.warning})`;
      }
    }

    if (alertLevel) {
      this.triggerAlert(alertLevel, message, metricName, value);
    }
  }

  /**
   * 触发告警
   */
  triggerAlert(level, message, metricName, value) {
    const alert = {
      id: Date.now() + Math.random(),
      level,
      message,
      metricName,
      value,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // 保持最近100个告警
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // 通知观察者
    this.notifyObservers(alert);

    // 控制台输出
    const emoji = level === 'critical' ? '🚨' : '⚠️';
    console.warn(`${emoji} [ALERT] ${message}`);
  }

  /**
   * 添加告警观察者
   */
  addAlertObserver(callback) {
    this.observers.push(callback);
    
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * 通知观察者
   */
  notifyObservers(alert) {
    this.observers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert observer:', error);
      }
    });
  }

  /**
   * 获取性能统计
   */
  getStats(metricName, timeRange = 300000) { // 5分钟
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const now = Date.now();
    const recentMetrics = metrics.filter(m => now - m.timestamp <= timeRange);
    
    if (recentMetrics.length === 0) {
      return null;
    }

    const values = recentMetrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum,
      latest: values[values.length - 1]
    };
  }

  /**
   * 获取所有活跃告警
   */
  getActiveAlerts() {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
    }
  }

  /**
   * 创建性能报告
   */
  generateReport(timeRange = 3600000) { // 1小时
    const report = {
      generatedAt: new Date(),
      timeRange,
      metrics: {},
      alerts: this.getActiveAlerts(),
      summary: {}
    };

    // 收集各项指标统计
    for (const [metricName] of this.metrics) {
      const stats = this.getStats(metricName, timeRange);
      if (stats) {
        report.metrics[metricName] = stats;
      }
    }

    // 生成摘要
    report.summary = {
      totalMetrics: Object.keys(report.metrics).length,
      activeAlerts: report.alerts.length,
      criticalAlerts: report.alerts.filter(a => a.level === 'critical').length,
      warningAlerts: report.alerts.filter(a => a.level === 'warning').length
    };

    return report;
  }

  /**
   * 清理历史数据
   */
  cleanup(maxAge = 3600000) { // 1小时
    const cutoff = Date.now() - maxAge;
    
    for (const [metricName, metrics] of this.metrics) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(metricName, filtered);
    }

    // 清理旧告警
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp.getTime() > cutoff || !alert.acknowledged
    );
  }

  /**
   * 重置监控
   */
  reset() {
    this.metrics.clear();
    this.alerts = [];
    this.timers.clear();
    console.log('Performance monitor reset');
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

// 监控包装器函数
export function monitorFunction(name, fn, context = null) {
  return performanceMonitor.monitor(name, fn, context);
}

// 计时器辅助函数
export function withTimer(name, fn, tags = {}) {
  return async (...args) => {
    performanceMonitor.startTimer(name, tags);
    try {
      const result = await fn(...args);
      performanceMonitor.endTimer(name);
      return result;
    } catch (error) {
      performanceMonitor.endTimer(name);
      throw error;
    }
  };
}

// ES6 模块导出
export { PerformanceMonitor, performanceMonitor };
export default performanceMonitor;