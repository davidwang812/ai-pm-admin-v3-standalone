/**
 * Log Stats Tests
 * 测试日志统计工具
 */

describe('LogStats', () => {
  let originalConsole;
  let logStats;

  beforeEach(() => {
    // Save original console methods
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
    
    // Reset window.logStats
    if (window.logStats) {
      window.logStats.counts = {
        log: 0,
        error: 0,
        warn: 0,
        info: 0,
        debug: 0
      };
    }
    
    // Re-import to get fresh instance
    delete window.logStats;
    require('../../_utils/log-stats.js');
    logStats = window.logStats;
  });

  afterEach(() => {
    // Restore original console methods
    Object.assign(console, originalConsole);
  });

  describe('initialization', () => {
    it('should create logStats on window object', () => {
      expect(window.logStats).toBeDefined();
      expect(window.logStats.counts).toBeDefined();
      expect(window.logStats.init).toBeDefined();
      expect(window.logStats.report).toBeDefined();
    });

    it('should initialize counts to zero', () => {
      expect(logStats.counts).toEqual({
        log: 0,
        error: 0,
        warn: 0,
        info: 0,
        debug: 0
      });
    });

    it('should auto-initialize on localhost', () => {
      // Mock localhost
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        writable: true
      });
      
      // Re-import
      delete window.logStats;
      require('../../_utils/log-stats.js');
      
      // Should be initialized
      console.log('test');
      expect(window.logStats.counts.log).toBe(1);
    });
  });

  describe('console interception', () => {
    beforeEach(() => {
      logStats.init();
    });

    it('should count console.log calls', () => {
      console.log('test 1');
      console.log('test 2');
      
      expect(logStats.counts.log).toBe(2);
    });

    it('should count console.error calls', () => {
      console.error('error 1');
      console.error('error 2');
      console.error('error 3');
      
      expect(logStats.counts.error).toBe(3);
    });

    it('should count console.warn calls', () => {
      console.warn('warning');
      
      expect(logStats.counts.warn).toBe(1);
    });

    it('should count console.info calls', () => {
      console.info('info 1');
      console.info('info 2');
      
      expect(logStats.counts.info).toBe(2);
    });

    it('should count console.debug calls', () => {
      console.debug('debug message');
      
      expect(logStats.counts.debug).toBe(1);
    });

    it('should still execute original console methods', () => {
      const logSpy = jest.spyOn(originalConsole, 'log');
      const errorSpy = jest.spyOn(originalConsole, 'error');
      
      console.log('test message');
      console.error('error message');
      
      expect(logSpy).toHaveBeenCalledWith('test message');
      expect(errorSpy).toHaveBeenCalledWith('error message');
    });
  });

  describe('reporting', () => {
    beforeEach(() => {
      logStats.init();
      
      // Mock console.table and console.log for report
      console.table = jest.fn();
      originalConsole.log = jest.fn();
    });

    it('should report counts via console.table', () => {
      console.log('test');
      console.error('error');
      console.warn('warn');
      
      logStats.report();
      
      expect(console.table).toHaveBeenCalledWith({
        log: 1,
        error: 1,
        warn: 1,
        info: 0,
        debug: 0
      });
    });

    it('should report total count', () => {
      console.log('test');
      console.error('error');
      console.info('info');
      
      logStats.report();
      
      expect(originalConsole.log).toHaveBeenCalledWith('Total console calls: 3');
    });

    it('should handle empty counts', () => {
      logStats.report();
      
      expect(console.table).toHaveBeenCalledWith({
        log: 0,
        error: 0,
        warn: 0,
        info: 0,
        debug: 0
      });
      expect(originalConsole.log).toHaveBeenCalledWith('Total console calls: 0');
    });
  });

  describe('multiple initializations', () => {
    it('should not double-count on multiple init calls', () => {
      logStats.init();
      logStats.init(); // Second init
      
      console.log('test');
      
      expect(logStats.counts.log).toBe(1); // Should still be 1, not 2
    });
  });

  describe('edge cases', () => {
    it('should handle console calls with multiple arguments', () => {
      logStats.init();
      
      console.log('message', { data: 'test' }, 123);
      
      expect(logStats.counts.log).toBe(1);
    });

    it('should handle console calls with no arguments', () => {
      logStats.init();
      
      console.log();
      console.error();
      
      expect(logStats.counts.log).toBe(1);
      expect(logStats.counts.error).toBe(1);
    });

    it('should preserve this context for console methods', () => {
      logStats.init();
      
      const obj = {
        value: 'test',
        log: function() {
          console.log(this.value);
        }
      };
      
      obj.log();
      
      expect(logStats.counts.log).toBe(1);
    });
  });

  describe('reset functionality', () => {
    it('should reset counts', () => {
      logStats.init();
      
      console.log('test');
      console.error('error');
      
      expect(logStats.counts.log).toBe(1);
      expect(logStats.counts.error).toBe(1);
      
      // Reset
      logStats.reset = function() {
        this.counts = {
          log: 0,
          error: 0,
          warn: 0,
          info: 0,
          debug: 0
        };
      };
      
      logStats.reset();
      
      expect(logStats.counts.log).toBe(0);
      expect(logStats.counts.error).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should calculate percentages', () => {
      logStats.init();
      
      // Create a distribution
      for (let i = 0; i < 50; i++) console.log('log');
      for (let i = 0; i < 30; i++) console.error('error');
      for (let i = 0; i < 20; i++) console.warn('warn');
      
      logStats.getPercentages = function() {
        const total = Object.values(this.counts).reduce((a, b) => a + b, 0);
        const percentages = {};
        
        for (const [method, count] of Object.entries(this.counts)) {
          percentages[method] = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        }
        
        return percentages;
      };
      
      const percentages = logStats.getPercentages();
      
      expect(percentages.log).toBe('50.0');
      expect(percentages.error).toBe('30.0');
      expect(percentages.warn).toBe('20.0');
    });
  });
});