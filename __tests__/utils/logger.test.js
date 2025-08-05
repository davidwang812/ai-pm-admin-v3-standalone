/**
 * Logger Tests
 * 测试日志服务
 */

import { Logger } from '../../_utils/logger.js';

describe('Logger', () => {
  let logger;
  let consoleSpies;

  beforeEach(() => {
    // Create console spies
    consoleSpies = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation()
    };
    
    // Create logger instance
    logger = new Logger('TestModule');
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpies).forEach(spy => spy.mockRestore());
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      
      expect(consoleSpies.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('[TestModule]'),
        'Test info message'
      );
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      
      expect(consoleSpies.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('[TestModule]'),
        'Test error message'
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      
      expect(consoleSpies.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.stringContaining('[TestModule]'),
        'Test warning message'
      );
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message');
      
      expect(consoleSpies.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('[TestModule]'),
        'Test debug message'
      );
    });
  });

  describe('log formatting', () => {
    it('should include timestamp', () => {
      logger.info('Test message');
      
      const call = consoleSpies.log.mock.calls[0];
      const timestamp = call[0];
      
      // Should match ISO date format
      expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should format multiple arguments', () => {
      logger.info('User', { id: 1, name: 'Test' }, 'logged in');
      
      expect(consoleSpies.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'User',
        { id: 1, name: 'Test' },
        'logged in'
      );
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('An error occurred:', error);
      
      expect(consoleSpies.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'An error occurred:',
        error
      );
    });
  });

  describe('module context', () => {
    it('should include module name in logs', () => {
      const moduleLogger = new Logger('AuthModule');
      moduleLogger.info('Authentication successful');
      
      expect(consoleSpies.log).toHaveBeenCalledWith(
        expect.any(String),
        '[INFO] [AuthModule]',
        'Authentication successful'
      );
    });

    it('should handle empty module name', () => {
      const defaultLogger = new Logger();
      defaultLogger.info('Default log');
      
      expect(consoleSpies.log).toHaveBeenCalledWith(
        expect.any(String),
        '[INFO] [App]',
        'Default log'
      );
    });
  });

  describe('log levels configuration', () => {
    it('should respect minimum log level', () => {
      logger.setMinLevel('warn');
      
      logger.debug('Debug message'); // Should not log
      logger.info('Info message');   // Should not log
      logger.warn('Warn message');   // Should log
      logger.error('Error message'); // Should log
      
      expect(consoleSpies.debug).not.toHaveBeenCalled();
      expect(consoleSpies.log).not.toHaveBeenCalled();
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpies.error).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid log level', () => {
      logger.setMinLevel('invalid');
      
      // Should default to 'info'
      logger.debug('Debug message'); // Should not log
      logger.info('Info message');   // Should log
      
      expect(consoleSpies.debug).not.toHaveBeenCalled();
      expect(consoleSpies.log).toHaveBeenCalled();
    });
  });

  describe('production mode', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production', () => {
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger('ProdModule');
      
      prodLogger.debug('Debug in production');
      
      expect(consoleSpies.debug).not.toHaveBeenCalled();
    });

    it('should still log errors in production', () => {
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger('ProdModule');
      
      prodLogger.error('Error in production');
      
      expect(consoleSpies.error).toHaveBeenCalled();
    });
  });

  describe('performance logging', () => {
    it('should measure execution time', async () => {
      const timer = logger.time('operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      timer.end();
      
      expect(consoleSpies.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('[PERF]'),
        expect.stringContaining('operation'),
        expect.stringContaining('ms')
      );
    });

    it('should handle nested timers', () => {
      const timer1 = logger.time('outer');
      const timer2 = logger.time('inner');
      
      timer2.end();
      timer1.end();
      
      expect(consoleSpies.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('log history', () => {
    it('should maintain log history', () => {
      logger.enableHistory();
      
      logger.info('Message 1');
      logger.error('Message 2');
      logger.warn('Message 3');
      
      const history = logger.getHistory();
      
      expect(history).toHaveLength(3);
      expect(history[0]).toMatchObject({
        level: 'info',
        message: 'Message 1',
        module: 'TestModule'
      });
    });

    it('should limit history size', () => {
      logger.enableHistory(2); // Max 2 entries
      
      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');
      
      const history = logger.getHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Message 2');
      expect(history[1].message).toBe('Message 3');
    });
  });

  describe('remote logging preparation', () => {
    it('should prepare log data for remote sending', () => {
      const logData = logger.prepareRemoteLog('info', 'Test message', {
        userId: 123,
        action: 'login'
      });
      
      expect(logData).toMatchObject({
        level: 'info',
        module: 'TestModule',
        message: 'Test message',
        metadata: {
          userId: 123,
          action: 'login'
        },
        timestamp: expect.any(String),
        environment: expect.any(String)
      });
    });

    it('should include error stack traces', () => {
      const error = new Error('Test error');
      const logData = logger.prepareRemoteLog('error', 'Error occurred', { error });
      
      expect(logData.metadata.error).toMatchObject({
        message: 'Test error',
        stack: expect.stringContaining('Error: Test error')
      });
    });
  });
});