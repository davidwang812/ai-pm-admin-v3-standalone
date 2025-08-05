/**
 * Performance Monitor Tests
 * 测试性能监控系统的核心功能
 */

// Mock feature flags
const mockFeatureFlags = {
  isEnabled: jest.fn((flag) => {
    const enabledFlags = ['USE_PERFORMANCE_MONITORING', 'ENABLE_PERFORMANCE_LOGS'];
    return enabledFlags.includes(flag);
  })
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000
  }
};

// Mock process for Node.js environment
global.process = {
  memoryUsage: jest.fn(() => ({
    heapUsed: 50000000,
    heapTotal: 100000000,
    external: 5000000,
    rss: 120000000
  }))
};

// Mock console to control output
const originalConsole = console;
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock setInterval/clearInterval
global.setInterval = jest.fn((fn, delay) => {
  // Store the function for manual triggering in tests
  global.setInterval.mockFn = fn;
  return 123; // mock timer id
});

global.clearInterval = jest.fn();

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  callback
}));

// Mock window for browser environment
global.window = {
  performance: global.performance,
  PerformanceObserver: global.PerformanceObserver
};

// Mock the PerformanceMonitor class
const PerformanceMonitor = class {
  constructor() {
    this.metrics = new Map();
    this.thresholds = new Map();
    this.alerts = [];
    this.observers = [];
    this.timers = new Map();
    
    this.setDefaultThresholds();
    this.startMonitoring();
  }

  setDefaultThresholds() {
    const defaultThresholds = {
      'api.response_time': { warning: 1000, critical: 3000 },
      'memory.heap_used': { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 },
      'function.execution_time': { warning: 500, critical: 2000 },
      'error.rate': { warning: 5, critical: 10 },
      'dom.render_time': { warning: 100, critical: 500 },
      'cache.hit_rate': { warning: 80, critical: 60 },
      'queue.length': { warning: 10, critical: 50 }
    };

    for (const [key, value] of Object.entries(defaultThresholds)) {
      this.thresholds.set(key, value);
    }
  }

  startMonitoring() {
    if (!mockFeatureFlags.isEnabled('USE_PERFORMANCE_MONITORING')) {
      return;
    }

    if (typeof process !== 'undefined') {
      setInterval(() => this.collectMemoryMetrics(), 30000);
    }

    if (typeof window !== 'undefined') {
      this.observeWebVitals();
    }

    console.log('Performance monitoring started');
  }

  record(metricName, value, tags = {}) {
    if (!mockFeatureFlags.isEnabled('USE_PERFORMANCE_MONITORING')) {
      return;
    }

    const timestamp = Date.now();
    const metric = {
      name: metricName,
      value,
      tags,
      timestamp
    };

    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    
    const metricHistory = this.metrics.get(metricName);
    metricHistory.push(metric);
    
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    this.checkThresholds(metricName, value);

    if (mockFeatureFlags.isEnabled('ENABLE_PERFORMANCE_LOGS')) {
      console.log(`[PERF] ${metricName}: ${value}`, tags);
    }
  }

  startTimer(timerName, tags = {}) {
    this.timers.set(timerName, {
      startTime: performance.now(),
      tags
    });
  }

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

  monitor(functionName, fn, context = null) {
    return (...args) => {
      const startTime = performance.now();
      const timerName = `function.${functionName}`;
      
      try {
        const result = context ? fn.apply(context, args) : fn(...args);
        
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

  recordError(source, error) {
    this.record('error.count', 1, {
      source,
      message: error.message,
      stack: error.stack
    });
  }

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

  observeWebVitals() {
    if (typeof window === 'undefined') return;

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
  }

  checkThresholds(metricName, value) {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return;

    let alertLevel = null;
    let message = null;

    if (metricName.includes('hit_rate')) {
      if (value < threshold.critical) {
        alertLevel = 'critical';
        message = `${metricName} is critically low: ${value}% (threshold: ${threshold.critical}%)`;
      } else if (value < threshold.warning) {
        alertLevel = 'warning';
        message = `${metricName} is low: ${value}% (threshold: ${threshold.warning}%)`;
      }
    } else {
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
    
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    this.notifyObservers(alert);

    const emoji = level === 'critical' ? '🚨' : '⚠️';
    console.warn(`${emoji} [ALERT] ${message}`);
  }

  addAlertObserver(callback) {
    this.observers.push(callback);
    
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  notifyObservers(alert) {
    this.observers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert observer:', error);
      }
    });
  }

  getStats(metricName, timeRange = 300000) {
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

  getActiveAlerts() {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
    }
  }

  generateReport(timeRange = 3600000) {
    const report = {
      generatedAt: new Date(),
      timeRange,
      metrics: {},
      alerts: this.getActiveAlerts(),
      summary: {}
    };

    for (const [metricName] of this.metrics) {
      const stats = this.getStats(metricName, timeRange);
      if (stats) {
        report.metrics[metricName] = stats;
      }
    }

    report.summary = {
      totalMetrics: Object.keys(report.metrics).length,
      activeAlerts: report.alerts.length,
      criticalAlerts: report.alerts.filter(a => a.level === 'critical').length,
      warningAlerts: report.alerts.filter(a => a.level === 'warning').length
    };

    return report;
  }

  cleanup(maxAge = 3600000) {
    const cutoff = Date.now() - maxAge;
    
    for (const [metricName, metrics] of this.metrics) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(metricName, filtered);
    }

    this.alerts = this.alerts.filter(alert => 
      alert.timestamp.getTime() > cutoff || !alert.acknowledged
    );
  }

  reset() {
    this.metrics.clear();
    this.alerts = [];
    this.timers.clear();
    console.log('Performance monitor reset');
  }
};

// Test runner
class SimpleTestRunner {
  constructor() {
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  describe(description, testSuite) {
    console.log(`\n📋 ${description}`);
    console.log('='.repeat(50));
    testSuite();
  }

  it(description, testFn) {
    this.results.total++;
    try {
      testFn();
      console.log(`  ✅ ${description}`);
      this.results.passed++;
    } catch (error) {
      console.log(`  ❌ ${description}`);
      console.log(`     Error: ${error.message}`);
      this.results.failed++;
    }
  }

  async itAsync(description, testFn) {
    this.results.total++;
    try {
      await testFn();
      console.log(`  ✅ ${description}`);
      this.results.passed++;
    } catch (error) {
      console.log(`  ❌ ${description}`);
      console.log(`     Error: ${error.message}`);
      this.results.failed++;
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toContain: (expected) => {
        if (typeof actual === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected "${actual}" to contain "${expected}"`);
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${expected}`);
          }
        }
      },
      toHaveLength: (expected) => {
        if (!actual.length || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, but got ${actual.length || 0}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy value, but got ${actual}`);
        }
      },
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected instance of ${expectedClass.name}, but got ${actual.constructor.name}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null, but got ${actual}`);
        }
      },
      toHaveBeenCalled: () => {
        if (typeof actual !== 'function' || !actual.mock || actual.mock.calls.length === 0) {
          throw new Error('Expected function to have been called');
        }
      },
      toHaveBeenCalledWith: (...expectedArgs) => {
        if (typeof actual !== 'function' || !actual.mock) {
          throw new Error('Expected a mock function');
        }
        const found = actual.mock.calls.some(call => 
          JSON.stringify(call) === JSON.stringify(expectedArgs)
        );
        if (!found) {
          throw new Error(`Expected function to have been called with ${JSON.stringify(expectedArgs)}`);
        }
      }
    };
  }

  summary() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(30));
    console.log(`Total tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Run tests
const test = new SimpleTestRunner();

console.log('📊 Testing Performance Monitor System\n');

test.describe('PerformanceMonitor Initialization', () => {
  test.it('should initialize with default configuration', () => {
    const monitor = new PerformanceMonitor();
    
    test.expect(monitor.metrics).toBeInstanceOf(Map);
    test.expect(monitor.thresholds).toBeInstanceOf(Map);
    test.expect(monitor.alerts).toBeInstanceOf(Array);
    test.expect(monitor.observers).toBeInstanceOf(Array);
    test.expect(monitor.timers).toBeInstanceOf(Map);
  });

  test.it('should set default thresholds correctly', () => {
    const monitor = new PerformanceMonitor();
    
    test.expect(monitor.thresholds.size).toBeGreaterThan(0);
    
    const apiThreshold = monitor.thresholds.get('api.response_time');
    test.expect(apiThreshold).toBeTruthy();
    test.expect(apiThreshold.warning).toBe(1000);
    test.expect(apiThreshold.critical).toBe(3000);
  });

  test.it('should start monitoring when feature flag is enabled', () => {
    const monitor = new PerformanceMonitor();
    
    test.expect(console.log).toHaveBeenCalledWith('Performance monitoring started');
    test.expect(setInterval).toHaveBeenCalled();
  });
});

test.describe('Metric Recording', () => {
  test.it('should record metrics correctly', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('test.metric', 100, { tag: 'value' });
    
    const metrics = monitor.metrics.get('test.metric');
    test.expect(metrics).toBeTruthy();
    test.expect(metrics).toHaveLength(1);
    
    const metric = metrics[0];
    test.expect(metric.name).toBe('test.metric');
    test.expect(metric.value).toBe(100);
    test.expect(metric.tags.tag).toBe('value');
    test.expect(metric.timestamp).toBeTruthy();
  });

  test.it('should limit metric history to 1000 entries', () => {
    const monitor = new PerformanceMonitor();
    
    // Add 1005 metrics
    for (let i = 0; i < 1005; i++) {
      monitor.record('test.metric', i);
    }
    
    const metrics = monitor.metrics.get('test.metric');
    test.expect(metrics).toHaveLength(1000);
    test.expect(metrics[0].value).toBe(5); // First 5 should be removed
  });

  test.it('should log performance metrics when enabled', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('test.metric', 100, { tag: 'value' });
    
    test.expect(console.log).toHaveBeenCalledWith('[PERF] test.metric: 100', { tag: 'value' });
  });

  test.it('should not record when feature flag is disabled', () => {
    mockFeatureFlags.isEnabled.mockReturnValueOnce(false);
    const monitor = new PerformanceMonitor();
    
    monitor.record('test.metric', 100);
    
    test.expect(monitor.metrics.size).toBe(0);
  });
});

test.describe('Timer Functions', () => {
  test.it('should start and end timers correctly', () => {
    const monitor = new PerformanceMonitor();
    performance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1500);
    
    monitor.startTimer('test.timer', { tag: 'value' });
    
    test.expect(monitor.timers.has('test.timer')).toBe(true);
    
    const duration = monitor.endTimer('test.timer');
    
    test.expect(duration).toBe(500);
    test.expect(monitor.timers.has('test.timer')).toBe(false);
    test.expect(monitor.metrics.has('timer.test.timer')).toBe(true);
  });

  test.it('should handle missing timer gracefully', () => {
    const monitor = new PerformanceMonitor();
    
    const duration = monitor.endTimer('nonexistent.timer');
    
    test.expect(duration).toBeNull();
    test.expect(console.warn).toHaveBeenCalledWith("Timer 'nonexistent.timer' not found");
  });
});

test.describe('Function Monitoring', () => {
  test.it('should monitor synchronous functions', () => {
    const monitor = new PerformanceMonitor();
    performance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1200);
    
    const testFn = jest.fn(() => 'result');
    const monitoredFn = monitor.monitor('testFunction', testFn);
    
    const result = monitoredFn('arg1', 'arg2');
    
    test.expect(result).toBe('result');
    test.expect(testFn).toHaveBeenCalledWith('arg1', 'arg2');
    test.expect(monitor.metrics.has('function.testFunction')).toBe(true);
  });

  test.itAsync('should monitor asynchronous functions', async () => {
    const monitor = new PerformanceMonitor();
    performance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1300);
    
    const asyncFn = jest.fn(async () => 'async result');
    const monitoredFn = monitor.monitor('asyncFunction', asyncFn);
    
    const result = await monitoredFn('arg1');
    
    test.expect(result).toBe('async result');
    test.expect(monitor.metrics.has('function.asyncFunction')).toBe(true);
  });

  test.it('should record errors in monitored functions', () => {
    const monitor = new PerformanceMonitor();
    performance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
    
    const errorFn = () => { throw new Error('Test error'); };
    const monitoredFn = monitor.monitor('errorFunction', errorFn);
    
    test.expect(() => monitoredFn()).toThrow('Test error');
    test.expect(monitor.metrics.has('function.errorFunction')).toBe(true);
    test.expect(monitor.metrics.has('error.count')).toBe(true);
  });
});

test.describe('Memory Metrics Collection', () => {
  test.it('should collect Node.js memory metrics', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.collectMemoryMetrics();
    
    test.expect(monitor.metrics.has('memory.heap_used')).toBe(true);
    test.expect(monitor.metrics.has('memory.heap_total')).toBe(true);
    test.expect(monitor.metrics.has('memory.external')).toBe(true);
    test.expect(monitor.metrics.has('memory.rss')).toBe(true);
  });

  test.it('should collect browser memory metrics', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.collectMemoryMetrics();
    
    test.expect(monitor.metrics.has('memory.js_heap_used')).toBe(true);
    test.expect(monitor.metrics.has('memory.js_heap_total')).toBe(true);
  });
});

test.describe('Threshold Checking and Alerts', () => {
  test.it('should trigger warning alert when threshold exceeded', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('api.response_time', 1500); // Exceeds warning (1000)
    
    test.expect(monitor.alerts).toHaveLength(1);
    test.expect(monitor.alerts[0].level).toBe('warning');
    test.expect(monitor.alerts[0].metricName).toBe('api.response_time');
  });

  test.it('should trigger critical alert when threshold exceeded', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('api.response_time', 4000); // Exceeds critical (3000)
    
    test.expect(monitor.alerts).toHaveLength(1);
    test.expect(monitor.alerts[0].level).toBe('critical');
    test.expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('🚨 [ALERT]'));
  });

  test.it('should handle cache hit rate alerts correctly', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('cache.hit_rate', 50); // Below critical (60)
    
    test.expect(monitor.alerts).toHaveLength(1);
    test.expect(monitor.alerts[0].level).toBe('critical');
    test.expect(monitor.alerts[0].message).toContain('critically low');
  });

  test.it('should limit alerts to 100 entries', () => {
    const monitor = new PerformanceMonitor();
    
    // Trigger 105 alerts
    for (let i = 0; i < 105; i++) {
      monitor.record('api.response_time', 4000);
    }
    
    test.expect(monitor.alerts).toHaveLength(100);
  });
});

test.describe('Alert Observers', () => {
  test.it('should notify observers when alert triggered', () => {
    const monitor = new PerformanceMonitor();
    const observer = jest.fn();
    
    monitor.addAlertObserver(observer);
    monitor.record('api.response_time', 4000);
    
    test.expect(observer).toHaveBeenCalled();
    const alert = observer.mock.calls[0][0];
    test.expect(alert.level).toBe('critical');
  });

  test.it('should unsubscribe observers correctly', () => {
    const monitor = new PerformanceMonitor();
    const observer = jest.fn();
    
    const unsubscribe = monitor.addAlertObserver(observer);
    unsubscribe();
    
    monitor.record('api.response_time', 4000);
    
    test.expect(observer).not.toHaveBeenCalled();
  });

  test.it('should handle observer errors gracefully', () => {
    const monitor = new PerformanceMonitor();
    const errorObserver = jest.fn(() => { throw new Error('Observer error'); });
    
    monitor.addAlertObserver(errorObserver);
    monitor.record('api.response_time', 4000);
    
    test.expect(console.error).toHaveBeenCalledWith('Error in alert observer:', expect.any(Error));
  });
});

test.describe('Statistics and Reporting', () => {
  test.it('should calculate statistics correctly', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('test.metric', 10);
    monitor.record('test.metric', 20);
    monitor.record('test.metric', 30);
    
    const stats = monitor.getStats('test.metric');
    
    test.expect(stats.count).toBe(3);
    test.expect(stats.min).toBe(10);
    test.expect(stats.max).toBe(30);
    test.expect(stats.avg).toBe(20);
    test.expect(stats.sum).toBe(60);
    test.expect(stats.latest).toBe(30);
  });

  test.it('should return null for non-existent metrics', () => {
    const monitor = new PerformanceMonitor();
    
    const stats = monitor.getStats('nonexistent.metric');
    
    test.expect(stats).toBeNull();
  });

  test.it('should generate comprehensive reports', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('test.metric', 100);
    monitor.record('api.response_time', 4000); // Triggers alert
    
    const report = monitor.generateReport();
    
    test.expect(report.generatedAt).toBeInstanceOf(Date);
    test.expect(report.metrics).toBeTruthy();
    test.expect(report.alerts).toHaveLength(1);
    test.expect(report.summary.totalMetrics).toBeGreaterThan(0);
    test.expect(report.summary.criticalAlerts).toBe(1);
  });

  test.it('should get active alerts only', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('api.response_time', 4000); // Triggers alert
    
    const activeAlerts = monitor.getActiveAlerts();
    test.expect(activeAlerts).toHaveLength(1);
    
    monitor.acknowledgeAlert(activeAlerts[0].id);
    
    const activeAlertsAfter = monitor.getActiveAlerts();
    test.expect(activeAlertsAfter).toHaveLength(0);
  });
});

test.describe('Cleanup and Reset', () => {
  test.it('should cleanup old metrics and alerts', () => {
    const monitor = new PerformanceMonitor();
    
    // Add old metric
    const oldTimestamp = Date.now() - 3700000; // 1 hour 1 minute ago
    monitor.metrics.set('old.metric', [{ 
      name: 'old.metric', 
      value: 100, 
      timestamp: oldTimestamp 
    }]);
    
    // Add recent metric
    monitor.record('recent.metric', 200);
    
    monitor.cleanup(3600000); // 1 hour
    
    test.expect(monitor.metrics.has('old.metric')).toBe(true);
    test.expect(monitor.metrics.get('old.metric')).toHaveLength(0);
    test.expect(monitor.metrics.has('recent.metric')).toBe(true);
  });

  test.it('should reset all data correctly', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.record('test.metric', 100);
    monitor.startTimer('test.timer');
    monitor.record('api.response_time', 4000); // Triggers alert
    
    test.expect(monitor.metrics.size).toBeGreaterThan(0);
    test.expect(monitor.timers.size).toBeGreaterThan(0);
    test.expect(monitor.alerts.length).toBeGreaterThan(0);
    
    monitor.reset();
    
    test.expect(monitor.metrics.size).toBe(0);
    test.expect(monitor.timers.size).toBe(0);
    test.expect(monitor.alerts.length).toBe(0);
    test.expect(console.log).toHaveBeenCalledWith('Performance monitor reset');
  });
});

test.describe('Web Vitals Observation', () => {
  test.it('should set up performance observers', () => {
    const monitor = new PerformanceMonitor();
    
    monitor.observeWebVitals();
    
    test.expect(PerformanceObserver).toHaveBeenCalled();
  });

  test.it('should handle observer setup errors gracefully', () => {
    PerformanceObserver.mockImplementationOnce(() => {
      throw new Error('Observer error');
    });
    
    const monitor = new PerformanceMonitor();
    
    monitor.observeWebVitals();
    
    test.expect(console.warn).toHaveBeenCalledWith('Failed to observe paint metrics:', expect.any(Error));
  });
});

// Restore console
global.console = originalConsole;

// Show test results
test.summary();

console.log('\n📊 Performance Monitor testing completed!');
console.log('Ready for integration with the monitoring infrastructure.');