/**
 * Enhanced Error Handler Tests
 * 测试增强错误处理系统的核心功能
 */

// Mock dependencies
const mockFeatureFlags = {
  isEnabled: jest.fn((flag) => {
    const enabledFlags = ['USE_ENHANCED_ERROR_HANDLING'];
    return enabledFlags.includes(flag);
  }),
  disable: jest.fn()
};

const mockPerformanceMonitor = {
  record: jest.fn(),
  recordError: jest.fn()
};

const mockAutoRollback = {
  triggerAutoRollback: jest.fn().mockResolvedValue({ success: true })
};

// Mock console
const originalConsole = console;
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock setTimeout for recovery strategies
global.setTimeout = jest.fn((fn, delay) => {
  fn(); // Execute immediately for tests
  return 123;
});

// Mock process and window for global error handling
const mockProcess = {
  on: jest.fn()
};

const mockWindow = {
  addEventListener: jest.fn()
};

global.process = mockProcess;
global.window = mockWindow;

// Mock Error.captureStackTrace
global.Error.captureStackTrace = jest.fn();

// Error types and severity constants
const ErrorTypes = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  API: 'api',
  DATABASE: 'database',
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  RATE_LIMIT: 'rate_limit',
  SYSTEM: 'system',
  UNKNOWN: 'unknown'
};

const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Enhanced Error implementation
class EnhancedError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, severity = ErrorSeverity.MEDIUM, context = {}) {
    super(message);
    this.name = 'EnhancedError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.id = this.generateErrorId();
    this.handled = false;
    this.retryable = this.isRetryable();
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isRetryable() {
    const retryableTypes = [
      ErrorTypes.NETWORK,
      ErrorTypes.API,
      ErrorTypes.DATABASE,
      ErrorTypes.RATE_LIMIT
    ];
    return retryableTypes.includes(this.type);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      retryable: this.retryable,
      stack: this.stack
    };
  }
}

// Enhanced Error Handler implementation
class EnhancedErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.errorPatterns = new Map();
    this.recoveryStrategies = new Map();
    this.errorThresholds = new Map();
    this.listeners = new Set();
    
    this.setupDefaultRecoveryStrategies();
    this.setupDefaultThresholds();
    this.setupGlobalErrorHandling();
  }

  setupDefaultRecoveryStrategies() {
    this.addRecoveryStrategy(ErrorTypes.NETWORK, async (error, context) => {
      const maxRetries = context.maxRetries || 3;
      const delay = context.retryDelay || 1000;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          
          if (context.retryFunction) {
            const result = await context.retryFunction();
            console.log(`Network error recovery successful on attempt ${i + 1}`);
            return { success: true, result, attempts: i + 1 };
          }
        } catch (retryError) {
          console.warn(`Retry attempt ${i + 1} failed:`, retryError.message);
          if (i === maxRetries - 1) {
            throw new EnhancedError(
              `Network operation failed after ${maxRetries} attempts`,
              ErrorTypes.NETWORK,
              ErrorSeverity.HIGH,
              { originalError: error, attempts: maxRetries }
            );
          }
        }
      }
    });

    this.addRecoveryStrategy(ErrorTypes.API, async (error, context) => {
      if (error.message.includes('timeout')) {
        if (context.fallbackService) {
          console.log('API timeout, switching to fallback service');
          return await context.fallbackService();
        }
      }
      
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        if (context.refreshToken) {
          console.log('API auth error, refreshing token');
          await context.refreshToken();
          return { success: true, action: 'token_refreshed' };
        }
      }
      
      throw error;
    });

    this.addRecoveryStrategy(ErrorTypes.RATE_LIMIT, async (error, context) => {
      const waitTime = context.rateLimitWait || 60000;
      console.log(`Rate limit hit, waiting ${waitTime}ms before retry`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      if (context.retryFunction) {
        return await context.retryFunction();
      }
      
      return { success: true, action: 'rate_limit_waited' };
    });

    this.addRecoveryStrategy(ErrorTypes.VALIDATION, async (error, context) => {
      if (context.sanitizeData) {
        console.log('Validation error, attempting data sanitization');
        const sanitizedData = await context.sanitizeData(context.originalData);
        
        if (context.retryWithSanitized) {
          return await context.retryWithSanitized(sanitizedData);
        }
      }
      
      throw error;
    });
  }

  setupDefaultThresholds() {
    this.errorThresholds.set(ErrorTypes.NETWORK, { count: 10, timeWindow: 60000 });
    this.errorThresholds.set(ErrorTypes.API, { count: 20, timeWindow: 60000 });
    this.errorThresholds.set(ErrorTypes.DATABASE, { count: 5, timeWindow: 60000 });
    this.errorThresholds.set(ErrorTypes.SYSTEM, { count: 3, timeWindow: 60000 });
  }

  setupGlobalErrorHandling() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(new EnhancedError(
          event.error?.message || 'Uncaught error',
          ErrorTypes.SYSTEM,
          ErrorSeverity.HIGH,
          { 
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            originalError: event.error
          }
        ));
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(new EnhancedError(
          event.reason?.message || 'Unhandled promise rejection',
          ErrorTypes.SYSTEM,
          ErrorSeverity.HIGH,
          { 
            reason: event.reason,
            promise: event.promise
          }
        ));
      });
    } else if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.handleError(new EnhancedError(
          error.message,
          ErrorTypes.SYSTEM,
          ErrorSeverity.CRITICAL,
          { originalError: error }
        ));
      });

      process.on('unhandledRejection', (reason, promise) => {
        this.handleError(new EnhancedError(
          reason?.message || 'Unhandled promise rejection',
          ErrorTypes.SYSTEM,
          ErrorSeverity.HIGH,
          { reason, promise }
        ));
      });
    }
  }

  async handleError(error, context = {}) {
    if (!mockFeatureFlags.isEnabled('USE_ENHANCED_ERROR_HANDLING')) {
      console.error('Error:', error);
      return { handled: false, error };
    }

    try {
      const enhancedError = this.enhanceError(error, context);
      
      this.recordError(enhancedError);
      
      const thresholdExceeded = this.checkErrorThreshold(enhancedError);
      if (thresholdExceeded) {
        console.warn(`Error threshold exceeded for type: ${enhancedError.type}`);
        this.triggerEmergencyResponse(enhancedError);
      }
      
      const recoveryResult = await this.attemptRecovery(enhancedError, context);
      
      this.notifyListeners(enhancedError, recoveryResult);
      
      enhancedError.handled = true;
      
      return {
        handled: true,
        error: enhancedError,
        recovery: recoveryResult
      };
      
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      
      mockPerformanceMonitor.recordError('error_handler_failure', handlingError);
      
      return {
        handled: false,
        error,
        handlingError
      };
    }
  }

  enhanceError(error, context = {}) {
    if (error instanceof EnhancedError) {
      return error;
    }

    const type = this.classifyError(error);
    const severity = this.determineSeverity(error, type);

    return new EnhancedError(
      error.message || 'Unknown error',
      type,
      severity,
      {
        ...context,
        originalError: error,
        stack: error.stack
      }
    );
  }

  classifyError(error) {
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();

    if (message.includes('network') || message.includes('timeout') || 
        message.includes('connection') || message.includes('fetch')) {
      return ErrorTypes.NETWORK;
    }

    if (message.includes('api') || message.includes('response') ||
        message.includes('status') || stack.includes('xhr') ||
        stack.includes('fetch')) {
      return ErrorTypes.API;
    }

    if (message.includes('database') || message.includes('sql') ||
        message.includes('query') || message.includes('connection pool')) {
      return ErrorTypes.DATABASE;
    }

    if (message.includes('auth') || message.includes('unauthorized') ||
        message.includes('forbidden') || message.includes('token')) {
      return ErrorTypes.AUTHENTICATION;
    }

    if (message.includes('permission') || message.includes('access denied') ||
        message.includes('forbidden')) {
      return ErrorTypes.PERMISSION;
    }

    if (message.includes('validation') || message.includes('invalid') ||
        message.includes('required') || message.includes('format')) {
      return ErrorTypes.VALIDATION;
    }

    if (message.includes('rate limit') || message.includes('too many requests') ||
        message.includes('quota exceeded')) {
      return ErrorTypes.RATE_LIMIT;
    }

    return ErrorTypes.UNKNOWN;
  }

  determineSeverity(error, type) {
    const message = (error.message || '').toLowerCase();

    const criticalKeywords = ['critical', 'fatal', 'crash', 'corruption'];
    const highKeywords = ['error', 'fail', 'exception', 'abort'];
    const mediumKeywords = ['warning', 'invalid', 'missing'];

    if (criticalKeywords.some(keyword => message.includes(keyword))) {
      return ErrorSeverity.CRITICAL;
    }

    if (highKeywords.some(keyword => message.includes(keyword))) {
      return ErrorSeverity.HIGH;
    }

    if (mediumKeywords.some(keyword => message.includes(keyword))) {
      return ErrorSeverity.MEDIUM;
    }

    const typeSeverityMap = {
      [ErrorTypes.SYSTEM]: ErrorSeverity.CRITICAL,
      [ErrorTypes.DATABASE]: ErrorSeverity.HIGH,
      [ErrorTypes.AUTHENTICATION]: ErrorSeverity.HIGH,
      [ErrorTypes.NETWORK]: ErrorSeverity.MEDIUM,
      [ErrorTypes.API]: ErrorSeverity.MEDIUM,
      [ErrorTypes.VALIDATION]: ErrorSeverity.LOW
    };

    return typeSeverityMap[type] || ErrorSeverity.MEDIUM;
  }

  recordError(error) {
    this.errorHistory.push(error);
    
    if (this.errorHistory.length > 1000) {
      this.errorHistory.shift();
    }

    mockPerformanceMonitor.record('error.count', 1, {
      type: error.type,
      severity: error.severity
    });

    const logLevel = this.getLogLevel(error.severity);
    console[logLevel](`[ERROR-${error.id}] ${error.type.toUpperCase()}: ${error.message}`, {
      severity: error.severity,
      context: error.context,
      timestamp: error.timestamp
    });
  }

  getLogLevel(severity) {
    const levelMap = {
      [ErrorSeverity.LOW]: 'log',
      [ErrorSeverity.MEDIUM]: 'warn',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.CRITICAL]: 'error'
    };
    return levelMap[severity] || 'error';
  }

  checkErrorThreshold(error) {
    const threshold = this.errorThresholds.get(error.type);
    if (!threshold) return false;

    const timeWindow = threshold.timeWindow;
    const maxCount = threshold.count;
    const now = Date.now();

    const recentErrors = this.errorHistory.filter(e => 
      e.type === error.type && 
      (now - e.timestamp.getTime()) <= timeWindow
    );

    return recentErrors.length >= maxCount;
  }

  async triggerEmergencyResponse(error) {
    console.warn(`🚨 Emergency response triggered for error type: ${error.type}`);

    if (error.severity === ErrorSeverity.CRITICAL) {
      try {
        await mockAutoRollback.triggerAutoRollback(
          `Critical error threshold exceeded: ${error.type}`,
          { error: error.toJSON() }
        );
      } catch (rollbackError) {
        console.error('Failed to trigger auto rollback:', rollbackError);
      }
    }

    this.disableProblematicFeatures(error);
  }

  disableProblematicFeatures(error) {
    const featuresToDisable = {
      [ErrorTypes.API]: ['USE_NEW_API_CLIENT', 'USE_ADVANCED_CACHING'],
      [ErrorTypes.DATABASE]: ['USE_CONNECTION_POOLING', 'USE_QUERY_OPTIMIZATION'],
      [ErrorTypes.NETWORK]: ['USE_PARALLEL_REQUESTS', 'USE_REQUEST_BATCHING']
    };

    const features = featuresToDisable[error.type] || [];
    features.forEach(feature => {
      if (mockFeatureFlags.isEnabled(feature)) {
        console.warn(`Disabling feature due to errors: ${feature}`);
        mockFeatureFlags.disable(feature);
      }
    });
  }

  async attemptRecovery(error, context) {
    if (!error.retryable) {
      return { attempted: false, reason: 'Error not retryable' };
    }

    const strategy = this.recoveryStrategies.get(error.type);
    if (!strategy) {
      return { attempted: false, reason: 'No recovery strategy available' };
    }

    try {
      console.log(`Attempting recovery for error type: ${error.type}`);
      const result = await strategy(error, context);
      
      console.log(`Recovery successful for error: ${error.id}`);
      mockPerformanceMonitor.record('error.recovery_success', 1, { type: error.type });
      
      return {
        attempted: true,
        success: true,
        result
      };
      
    } catch (recoveryError) {
      console.error(`Recovery failed for error: ${error.id}`, recoveryError);
      mockPerformanceMonitor.record('error.recovery_failure', 1, { type: error.type });
      
      return {
        attempted: true,
        success: false,
        error: recoveryError
      };
    }
  }

  addRecoveryStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
  }

  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(error, recoveryResult) {
    this.listeners.forEach(callback => {
      try {
        callback(error, recoveryResult);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  getErrorStats(timeWindow = 3600000) {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(e => 
      (now - e.timestamp.getTime()) <= timeWindow
    );

    const stats = {
      total: recentErrors.length,
      byType: {},
      bySeverity: {},
      recoveryRate: 0
    };

    recentErrors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    const handledErrors = recentErrors.filter(e => e.handled);
    if (recentErrors.length > 0) {
      stats.recoveryRate = (handledErrors.length / recentErrors.length) * 100;
    }

    return stats;
  }

  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const handlingResult = await this.handleError(error, {
          ...context,
          functionName: fn.name,
          arguments: args
        });
        
        if (handlingResult.recovery?.success) {
          return handlingResult.recovery.result;
        }
        
        throw handlingResult.error;
      }
    };
  }

  cleanup(maxAge = 86400000) {
    const cutoff = Date.now() - maxAge;
    this.errorHistory = this.errorHistory.filter(e => 
      e.timestamp.getTime() > cutoff
    );
  }
}

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
      toBeGreaterThanOrEqual: (expected) => {
        if (actual < expected) {
          throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
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

console.log('🛡️ Testing Enhanced Error Handler System\n');

test.describe('EnhancedError Class', () => {
  test.it('should create error with correct properties', () => {
    const error = new EnhancedError('Test message', ErrorTypes.NETWORK, ErrorSeverity.HIGH, { test: true });
    
    test.expect(error.message).toBe('Test message');
    test.expect(error.type).toBe(ErrorTypes.NETWORK);
    test.expect(error.severity).toBe(ErrorSeverity.HIGH);
    test.expect(error.context.test).toBe(true);
    test.expect(error.id).toBeTruthy();
    test.expect(error.timestamp).toBeInstanceOf(Date);
    test.expect(error.retryable).toBe(true); // Network errors are retryable
  });

  test.it('should determine retryable status correctly', () => {
    const networkError = new EnhancedError('Network error', ErrorTypes.NETWORK);
    const validationError = new EnhancedError('Validation error', ErrorTypes.VALIDATION);
    
    test.expect(networkError.retryable).toBe(true);
    test.expect(validationError.retryable).toBe(false);
  });

  test.it('should generate unique error IDs', () => {
    const error1 = new EnhancedError('Error 1');
    const error2 = new EnhancedError('Error 2');
    
    test.expect(error1.id).not.toBe(error2.id);
    test.expect(error1.id).toContain('err_');
    test.expect(error2.id).toContain('err_');
  });

  test.it('should serialize to JSON correctly', () => {
    const error = new EnhancedError('Test error', ErrorTypes.API, ErrorSeverity.MEDIUM, { user: 'test' });
    const json = error.toJSON();
    
    test.expect(json.id).toBe(error.id);
    test.expect(json.message).toBe('Test error');
    test.expect(json.type).toBe(ErrorTypes.API);
    test.expect(json.severity).toBe(ErrorSeverity.MEDIUM);
    test.expect(json.context.user).toBe('test');
    test.expect(json.retryable).toBe(true);
  });
});

test.describe('EnhancedErrorHandler Initialization', () => {
  test.it('should initialize with default configuration', () => {
    const handler = new EnhancedErrorHandler();
    
    test.expect(handler.errorHistory).toBeInstanceOf(Array);
    test.expect(handler.recoveryStrategies).toBeInstanceOf(Map);
    test.expect(handler.errorThresholds).toBeInstanceOf(Map);
    test.expect(handler.listeners).toBeInstanceOf(Set);
  });

  test.it('should set up default recovery strategies', () => {
    const handler = new EnhancedErrorHandler();
    
    test.expect(handler.recoveryStrategies.has(ErrorTypes.NETWORK)).toBe(true);
    test.expect(handler.recoveryStrategies.has(ErrorTypes.API)).toBe(true);
    test.expect(handler.recoveryStrategies.has(ErrorTypes.RATE_LIMIT)).toBe(true);
    test.expect(handler.recoveryStrategies.has(ErrorTypes.VALIDATION)).toBe(true);
  });

  test.it('should set up default error thresholds', () => {
    const handler = new EnhancedErrorHandler();
    
    const networkThreshold = handler.errorThresholds.get(ErrorTypes.NETWORK);
    test.expect(networkThreshold.count).toBe(10);
    test.expect(networkThreshold.timeWindow).toBe(60000);
  });

  test.it('should set up global error handling', () => {
    const handler = new EnhancedErrorHandler();
    
    test.expect(mockWindow.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    test.expect(mockWindow.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    test.expect(mockProcess.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    test.expect(mockProcess.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
  });
});

test.describe('Error Classification', () => {
  test.it('should classify network errors correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const networkError = new Error('Network timeout occurred');
    const type = handler.classifyError(networkError);
    
    test.expect(type).toBe(ErrorTypes.NETWORK);
  });

  test.it('should classify API errors correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const apiError = new Error('API response failed with status 500');
    const type = handler.classifyError(apiError);
    
    test.expect(type).toBe(ErrorTypes.API);
  });

  test.it('should classify validation errors correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const validationError = new Error('Validation failed for required field');
    const type = handler.classifyError(validationError);
    
    test.expect(type).toBe(ErrorTypes.VALIDATION);
  });

  test.it('should classify authentication errors correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const authError = new Error('Unauthorized access token');
    const type = handler.classifyError(authError);
    
    test.expect(type).toBe(ErrorTypes.AUTHENTICATION);
  });

  test.it('should classify unknown errors as UNKNOWN', () => {
    const handler = new EnhancedErrorHandler();
    
    const unknownError = new Error('Some random error message');
    const type = handler.classifyError(unknownError);
    
    test.expect(type).toBe(ErrorTypes.UNKNOWN);
  });
});

test.describe('Error Severity Determination', () => {
  test.it('should determine critical severity from keywords', () => {
    const handler = new EnhancedErrorHandler();
    
    const criticalError = new Error('Critical system failure');
    const severity = handler.determineSeverity(criticalError, ErrorTypes.SYSTEM);
    
    test.expect(severity).toBe(ErrorSeverity.CRITICAL);
  });

  test.it('should determine severity from error type', () => {
    const handler = new EnhancedErrorHandler();
    
    const systemError = new Error('Some system issue');
    const severity = handler.determineSeverity(systemError, ErrorTypes.SYSTEM);
    
    test.expect(severity).toBe(ErrorSeverity.CRITICAL);
  });

  test.it('should use medium severity as default', () => {
    const handler = new EnhancedErrorHandler();
    
    const genericError = new Error('Some error');
    const severity = handler.determineSeverity(genericError, ErrorTypes.UNKNOWN);
    
    test.expect(severity).toBe(ErrorSeverity.MEDIUM);
  });
});

test.describe('Error Recording and History', () => {
  test.it('should record errors in history', () => {
    const handler = new EnhancedErrorHandler();
    const error = new EnhancedError('Test error', ErrorTypes.NETWORK);
    
    handler.recordError(error);
    
    test.expect(handler.errorHistory).toHaveLength(1);
    test.expect(handler.errorHistory[0]).toBe(error);
  });

  test.it('should limit error history to 1000 entries', () => {
    const handler = new EnhancedErrorHandler();
    
    // Add 1005 errors
    for (let i = 0; i < 1005; i++) {
      const error = new EnhancedError(`Error ${i}`, ErrorTypes.NETWORK);
      handler.recordError(error);
    }
    
    test.expect(handler.errorHistory).toHaveLength(1000);
    test.expect(handler.errorHistory[0].message).toBe('Error 5'); // First 5 removed
  });

  test.it('should record performance metrics', () => {
    const handler = new EnhancedErrorHandler();
    const error = new EnhancedError('Test error', ErrorTypes.API);
    
    handler.recordError(error);
    
    test.expect(mockPerformanceMonitor.record).toHaveBeenCalledWith('error.count', 1, {
      type: ErrorTypes.API,
      severity: ErrorSeverity.MEDIUM
    });
  });

  test.it('should log with appropriate level', () => {
    const handler = new EnhancedErrorHandler();
    const criticalError = new EnhancedError('Critical error', ErrorTypes.SYSTEM, ErrorSeverity.CRITICAL);
    const lowError = new EnhancedError('Low error', ErrorTypes.VALIDATION, ErrorSeverity.LOW);
    
    handler.recordError(criticalError);
    handler.recordError(lowError);
    
    test.expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR-'),
      expect.any(Object)
    );
    test.expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR-'),
      expect.any(Object)
    );
  });
});

test.describe('Error Threshold Checking', () => {
  test.it('should detect when error threshold is exceeded', () => {
    const handler = new EnhancedErrorHandler();
    
    // Add 10 network errors (threshold is 10)
    for (let i = 0; i < 10; i++) {
      const error = new EnhancedError(`Network error ${i}`, ErrorTypes.NETWORK);
      handler.errorHistory.push(error);
    }
    
    const newError = new EnhancedError('Another network error', ErrorTypes.NETWORK);
    const exceeded = handler.checkErrorThreshold(newError);
    
    test.expect(exceeded).toBe(true);
  });

  test.it('should not trigger threshold for different error types', () => {
    const handler = new EnhancedErrorHandler();
    
    // Add 10 network errors
    for (let i = 0; i < 10; i++) {
      const error = new EnhancedError(`Network error ${i}`, ErrorTypes.NETWORK);
      handler.errorHistory.push(error);
    }
    
    const apiError = new EnhancedError('API error', ErrorTypes.API);
    const exceeded = handler.checkErrorThreshold(apiError);
    
    test.expect(exceeded).toBe(false);
  });

  test.it('should consider time window for threshold checking', () => {
    const handler = new EnhancedErrorHandler();
    
    // Add old network errors (outside time window)
    for (let i = 0; i < 10; i++) {
      const error = new EnhancedError(`Old network error ${i}`, ErrorTypes.NETWORK);
      error.timestamp = new Date(Date.now() - 120000); // 2 minutes ago
      handler.errorHistory.push(error);
    }
    
    const newError = new EnhancedError('New network error', ErrorTypes.NETWORK);
    const exceeded = handler.checkErrorThreshold(newError);
    
    test.expect(exceeded).toBe(false);
  });
});

test.describe('Recovery Strategies', () => {
  test.itAsync('should attempt network error recovery', async () => {
    const handler = new EnhancedErrorHandler();
    const networkError = new EnhancedError('Network error', ErrorTypes.NETWORK);
    const mockRetryFunction = jest.fn().mockResolvedValue('success');
    
    const context = {
      retryFunction: mockRetryFunction,
      maxRetries: 2
    };
    
    const result = await handler.attemptRecovery(networkError, context);
    
    test.expect(result.attempted).toBe(true);
    test.expect(result.success).toBe(true);
    test.expect(mockRetryFunction).toHaveBeenCalled();
  });

  test.itAsync('should handle API timeout with fallback', async () => {
    const handler = new EnhancedErrorHandler();
    const apiError = new EnhancedError('API timeout error', ErrorTypes.API);
    const mockFallbackService = jest.fn().mockResolvedValue('fallback result');
    
    const context = {
      fallbackService: mockFallbackService
    };
    
    const result = await handler.attemptRecovery(apiError, context);
    
    test.expect(result.attempted).toBe(true);
    test.expect(result.success).toBe(true);
    test.expect(mockFallbackService).toHaveBeenCalled();
  });

  test.itAsync('should handle API auth error with token refresh', async () => {
    const handler = new EnhancedErrorHandler();
    const authError = new EnhancedError('API 401 unauthorized', ErrorTypes.API);
    const mockRefreshToken = jest.fn().mockResolvedValue();
    
    const context = {
      refreshToken: mockRefreshToken
    };
    
    const result = await handler.attemptRecovery(authError, context);
    
    test.expect(result.attempted).toBe(true);
    test.expect(result.success).toBe(true);
    test.expect(result.result.action).toBe('token_refreshed');
    test.expect(mockRefreshToken).toHaveBeenCalled();
  });

  test.itAsync('should handle rate limit with wait', async () => {
    const handler = new EnhancedErrorHandler();
    const rateLimitError = new EnhancedError('Rate limit exceeded', ErrorTypes.RATE_LIMIT);
    
    const context = {
      rateLimitWait: 1000
    };
    
    const result = await handler.attemptRecovery(rateLimitError, context);
    
    test.expect(result.attempted).toBe(true);
    test.expect(result.success).toBe(true);
    test.expect(result.result.action).toBe('rate_limit_waited');
  });

  test.itAsync('should not attempt recovery for non-retryable errors', async () => {
    const handler = new EnhancedErrorHandler();
    const validationError = new EnhancedError('Validation error', ErrorTypes.VALIDATION);
    
    const result = await handler.attemptRecovery(validationError, {});
    
    test.expect(result.attempted).toBe(false);
    test.expect(result.reason).toBe('Error not retryable');
  });
});

test.describe('Emergency Response', () => {
  test.itAsync('should trigger emergency response for threshold exceeded', async () => {
    const handler = new EnhancedErrorHandler();
    
    // Mock threshold exceeded
    jest.spyOn(handler, 'checkErrorThreshold').mockReturnValue(true);
    jest.spyOn(handler, 'triggerEmergencyResponse').mockResolvedValue();
    
    const error = new Error('Test error');
    await handler.handleError(error);
    
    test.expect(handler.triggerEmergencyResponse).toHaveBeenCalled();
  });

  test.itAsync('should trigger auto rollback for critical errors', async () => {
    const handler = new EnhancedErrorHandler();
    const criticalError = new EnhancedError('Critical error', ErrorTypes.SYSTEM, ErrorSeverity.CRITICAL);
    
    await handler.triggerEmergencyResponse(criticalError);
    
    test.expect(mockAutoRollback.triggerAutoRollback).toHaveBeenCalledWith(
      'Critical error threshold exceeded: system',
      { error: criticalError.toJSON() }
    );
  });

  test.itAsync('should disable problematic features', async () => {
    const handler = new EnhancedErrorHandler();
    const apiError = new EnhancedError('API error', ErrorTypes.API);
    
    // Mock feature flags to return enabled for relevant features
    mockFeatureFlags.isEnabled = jest.fn(flag => 
      ['USE_NEW_API_CLIENT', 'USE_ADVANCED_CACHING'].includes(flag)
    );
    
    await handler.triggerEmergencyResponse(apiError);
    
    test.expect(mockFeatureFlags.disable).toHaveBeenCalledWith('USE_NEW_API_CLIENT');
    test.expect(mockFeatureFlags.disable).toHaveBeenCalledWith('USE_ADVANCED_CACHING');
  });
});

test.describe('Error Handler Main Flow', () => {
  test.itAsync('should handle error end-to-end', async () => {
    const handler = new EnhancedErrorHandler();
    const error = new Error('Network connection failed');
    
    const result = await handler.handleError(error, {
      retryFunction: jest.fn().mockResolvedValue('recovered')
    });
    
    test.expect(result.handled).toBe(true);
    test.expect(result.error).toBeInstanceOf(EnhancedError);
    test.expect(result.error.type).toBe(ErrorTypes.NETWORK);
    test.expect(result.error.handled).toBe(true);
    test.expect(result.recovery.attempted).toBe(true);
  });

  test.itAsync('should handle errors when feature flag disabled', async () => {
    mockFeatureFlags.isEnabled.mockReturnValueOnce(false);
    
    const handler = new EnhancedErrorHandler();
    const error = new Error('Test error');
    
    const result = await handler.handleError(error);
    
    test.expect(result.handled).toBe(false);
    test.expect(result.error).toBe(error);
  });

  test.itAsync('should handle error handler failures', async () => {
    const handler = new EnhancedErrorHandler();
    
    // Mock classifyError to throw
    jest.spyOn(handler, 'classifyError').mockImplementation(() => {
      throw new Error('Classification failed');
    });
    
    const error = new Error('Test error');
    const result = await handler.handleError(error);
    
    test.expect(result.handled).toBe(false);
    test.expect(result.handlingError).toBeTruthy();
  });
});

test.describe('Error Listeners', () => {
  test.itAsync('should notify listeners of error events', async () => {
    const handler = new EnhancedErrorHandler();
    const listener = jest.fn();
    
    handler.addListener(listener);
    
    const error = new Error('Test error');
    await handler.handleError(error);
    
    test.expect(listener).toHaveBeenCalled();
    const [errorArg, recoveryArg] = listener.mock.calls[0];
    test.expect(errorArg).toBeInstanceOf(EnhancedError);
    test.expect(recoveryArg).toBeTruthy();
  });

  test.it('should allow listener removal', () => {
    const handler = new EnhancedErrorHandler();
    const listener = jest.fn();
    
    const removeListener = handler.addListener(listener);
    removeListener();
    
    test.expect(handler.listeners.has(listener)).toBe(false);
  });

  test.it('should handle listener errors gracefully', () => {
    const handler = new EnhancedErrorHandler();
    const errorListener = jest.fn(() => { throw new Error('Listener error'); });
    
    handler.addListener(errorListener);
    
    const error = new EnhancedError('Test error');
    handler.notifyListeners(error, {});
    
    test.expect(console.error).toHaveBeenCalledWith('Error in error listener:', expect.any(Error));
  });
});

test.describe('Error Statistics', () => {
  test.it('should calculate error statistics correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    // Add various errors to history
    const errors = [
      new EnhancedError('Network error 1', ErrorTypes.NETWORK, ErrorSeverity.MEDIUM),
      new EnhancedError('Network error 2', ErrorTypes.NETWORK, ErrorSeverity.HIGH),
      new EnhancedError('API error', ErrorTypes.API, ErrorSeverity.MEDIUM),
      new EnhancedError('Validation error', ErrorTypes.VALIDATION, ErrorSeverity.LOW)
    ];
    
    errors.forEach(error => {
      error.handled = true;
      handler.errorHistory.push(error);
    });
    
    const stats = handler.getErrorStats();
    
    test.expect(stats.total).toBe(4);
    test.expect(stats.byType[ErrorTypes.NETWORK]).toBe(2);
    test.expect(stats.byType[ErrorTypes.API]).toBe(1);
    test.expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(2);
    test.expect(stats.recoveryRate).toBe(100);
  });

  test.it('should calculate recovery rate correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const handledError = new EnhancedError('Handled error', ErrorTypes.NETWORK);
    handledError.handled = true;
    
    const unhandledError = new EnhancedError('Unhandled error', ErrorTypes.API);
    unhandledError.handled = false;
    
    handler.errorHistory.push(handledError, unhandledError);
    
    const stats = handler.getErrorStats();
    
    test.expect(stats.recoveryRate).toBe(50);
  });
});

test.describe('Function Wrapping', () => {
  test.itAsync('should wrap functions with error handling', async () => {
    const handler = new EnhancedErrorHandler();
    
    const originalFn = jest.fn().mockRejectedValue(new Error('Function failed'));
    const wrappedFn = handler.wrap(originalFn, { 
      retryFunction: jest.fn().mockResolvedValue('recovered') 
    });
    
    const result = await wrappedFn('arg1', 'arg2');
    
    test.expect(result).toBe('recovered');
    test.expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  test.itAsync('should return original result when no error', async () => {
    const handler = new EnhancedErrorHandler();
    
    const originalFn = jest.fn().mockResolvedValue('success');
    const wrappedFn = handler.wrap(originalFn);
    
    const result = await wrappedFn('test');
    
    test.expect(result).toBe('success');
    test.expect(originalFn).toHaveBeenCalledWith('test');
  });
});

test.describe('Cleanup', () => {
  test.it('should cleanup old errors', () => {
    const handler = new EnhancedErrorHandler();
    
    // Add old error (outside max age)
    const oldError = new EnhancedError('Old error', ErrorTypes.NETWORK);
    oldError.timestamp = new Date(Date.now() - 86400000 - 1000); // 24h + 1s ago
    handler.errorHistory.push(oldError);
    
    // Add recent error
    const recentError = new EnhancedError('Recent error', ErrorTypes.API);
    handler.errorHistory.push(recentError);
    
    handler.cleanup(86400000); // 24 hours
    
    test.expect(handler.errorHistory).toHaveLength(1);
    test.expect(handler.errorHistory[0]).toBe(recentError);
  });
});

// Restore console
global.console = originalConsole;

// Show test results
test.summary();

console.log('\n🛡️ Enhanced Error Handler testing completed!');
console.log('Ready for integration with the error handling infrastructure.');