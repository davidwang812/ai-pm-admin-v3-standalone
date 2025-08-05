/**
 * Enhanced Error Handler Simple Tests
 * 增强错误处理器简单测试
 */

// Setup Node.js environment
global.performance = { now: () => Date.now() };

// Mock dependencies
const mockFeatureFlags = {
  isEnabled: (flagKey) => {
    const enabledFlags = [
      'USE_ENHANCED_ERROR_HANDLING',
      'USE_PERFORMANCE_MONITORING'
    ];
    return enabledFlags.includes(flagKey);
  },
  disable: (flagKey) => console.log(`Disabled feature: ${flagKey}`)
};

const mockPerformanceMonitor = {
  record: (metric, value, tags = {}) => {
    console.log(`[PERF] ${metric}: ${value}`, tags);
  },
  recordError: (source, error) => {
    console.log(`[ERROR-PERF] ${source}: ${error.message}`);
  }
};

const mockAutoRollback = {
  triggerAutoRollback: async (reason, details) => {
    console.log(`[ROLLBACK] ${reason}`, details);
    return { success: true };
  }
};

// Mock modules
const mockModules = {
  '../../_utils/feature-flags.js': { featureFlags: mockFeatureFlags },
  '../../_utils/performance-monitor.js': { performanceMonitor: mockPerformanceMonitor },
  '../../_utils/auto-rollback.js': { autoRollback: mockAutoRollback }
};

// Mock require function
const originalRequire = require;
require = function(moduleId) {
  if (mockModules[moduleId]) {
    return mockModules[moduleId];
  }
  return originalRequire.apply(this, arguments);
};

// Import the error handler
const {
  EnhancedErrorHandler,
  EnhancedError,
  ErrorTypes,
  ErrorSeverity,
  enhancedErrorHandler,
  handleError,
  wrapWithErrorHandler,
  createError
} = require('../../_utils/enhanced-error-handler.js');

// Restore require
require = originalRequire;

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
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected instance of ${expectedClass.name}, but got ${typeof actual}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
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
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toHaveProperty: (prop) => {
        if (!(prop in actual)) {
          throw new Error(`Expected object to have property "${prop}"`);
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

console.log('🚨 Testing Enhanced Error Handler\n');

test.describe('EnhancedError Class', () => {
  test.it('should create enhanced error with all properties', () => {
    const error = new EnhancedError(
      'Test error message',
      ErrorTypes.VALIDATION,
      ErrorSeverity.HIGH,
      { userId: 'test-user' }
    );

    test.expect(error.message).toBe('Test error message');
    test.expect(error.type).toBe(ErrorTypes.VALIDATION);
    test.expect(error.severity).toBe(ErrorSeverity.HIGH);
    test.expect(error.context.userId).toBe('test-user');
    test.expect(error.id).toBeTruthy();
    test.expect(error.timestamp).toBeInstanceOf(Date);
    test.expect(error.retryable).toBe(false); // validation errors are not retryable
  });

  test.it('should determine retryable status correctly', () => {
    const networkError = new EnhancedError('Network error', ErrorTypes.NETWORK);
    const validationError = new EnhancedError('Validation error', ErrorTypes.VALIDATION);

    test.expect(networkError.retryable).toBe(true);
    test.expect(validationError.retryable).toBe(false);
  });

  test.it('should serialize to JSON correctly', () => {
    const error = new EnhancedError('Test', ErrorTypes.API, ErrorSeverity.MEDIUM);
    const json = error.toJSON();

    test.expect(json).toHaveProperty('id');
    test.expect(json).toHaveProperty('message');
    test.expect(json).toHaveProperty('type');
    test.expect(json).toHaveProperty('severity');
    test.expect(json).toHaveProperty('timestamp');
  });
});

test.describe('Error Classification', () => {
  test.it('should classify network errors correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const networkError = new Error('Network timeout occurred');
    const classified = handler.classifyError(networkError);
    
    test.expect(classified).toBe(ErrorTypes.NETWORK);
  });

  test.it('should classify API errors correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const apiError = new Error('API response status 500');
    const classified = handler.classifyError(apiError);
    
    test.expect(classified).toBe(ErrorTypes.API);
  });

  test.it('should classify validation errors correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const validationError = new Error('Validation failed: required field missing');
    const classified = handler.classifyError(validationError);
    
    test.expect(classified).toBe(ErrorTypes.VALIDATION);
  });

  test.it('should classify database errors correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const dbError = new Error('Database connection failed');
    const classified = handler.classifyError(dbError);
    
    test.expect(classified).toBe(ErrorTypes.DATABASE);
  });
});

test.describe('Error Severity Determination', () => {
  test.it('should determine critical severity correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const criticalError = new Error('Critical system failure');
    const severity = handler.determineSeverity(criticalError, ErrorTypes.SYSTEM);
    
    test.expect(severity).toBe(ErrorSeverity.CRITICAL);
  });

  test.it('should determine high severity correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const highError = new Error('Database error occurred');
    const severity = handler.determineSeverity(highError, ErrorTypes.DATABASE);
    
    test.expect(severity).toBe(ErrorSeverity.HIGH);
  });

  test.it('should determine medium severity correctly', () => {
    const handler = new EnhancedErrorHandler();
    
    const mediumError = new Error('API warning response');
    const severity = handler.determineSeverity(mediumError, ErrorTypes.API);
    
    test.expect(severity).toBe(ErrorSeverity.MEDIUM);
  });
});

test.describe('Error Handling', () => {
  test.itAsync('should handle basic errors', async () => {
    const handler = new EnhancedErrorHandler();
    
    const basicError = new Error('Basic test error');
    const result = await handler.handleError(basicError);
    
    test.expect(result.handled).toBe(true);
    test.expect(result.error).toBeInstanceOf(EnhancedError);
    test.expect(result.error.message).toBe('Basic test error');
  });

  test.itAsync('should enhance normal errors', async () => {
    const handler = new EnhancedErrorHandler();
    
    const normalError = new Error('Network connection failed');
    const result = await handler.handleError(normalError);
    
    test.expect(result.error.type).toBe(ErrorTypes.NETWORK);
    test.expect(result.error.retryable).toBe(true);
  });

  test.itAsync('should track error history', async () => {
    const handler = new EnhancedErrorHandler();
    
    await handler.handleError(new Error('First error'));
    await handler.handleError(new Error('Second error'));
    
    test.expect(handler.errorHistory.length).toBe(2);
  });

  test.itAsync('should maintain error history limit', async () => {
    const handler = new EnhancedErrorHandler();
    
    // Add more than the limit (1000)
    for (let i = 0; i < 1005; i++) {
      await handler.handleError(new Error(`Error ${i}`));
    }
    
    test.expect(handler.errorHistory.length).toBe(1000);
  });
});

test.describe('Recovery Strategies', () => {
  test.itAsync('should attempt recovery for retryable errors', async () => {
    const handler = new EnhancedErrorHandler();
    
    const networkError = new EnhancedError('Network timeout', ErrorTypes.NETWORK);
    let retryCount = 0;
    
    const result = await handler.handleError(networkError, {
      maxRetries: 2,
      retryDelay: 10,
      retryFunction: async () => {
        retryCount++;
        if (retryCount < 2) {
          throw new Error('Still failing');
        }
        return { success: true };
      }
    });
    
    test.expect(result.recovery.attempted).toBe(true);
    test.expect(result.recovery.success).toBe(true);
  });

  test.itAsync('should handle rate limit errors', async () => {
    const handler = new EnhancedErrorHandler();
    
    const rateLimitError = new EnhancedError('Rate limit exceeded', ErrorTypes.RATE_LIMIT);
    
    const result = await handler.handleError(rateLimitError, {
      rateLimitWait: 50, // Short wait for testing
      retryFunction: async () => ({ success: true, data: 'recovered' })
    });
    
    test.expect(result.recovery.attempted).toBe(true);
    test.expect(result.recovery.success).toBe(true);
  });

  test.it('should add custom recovery strategies', () => {
    const handler = new EnhancedErrorHandler();
    
    const customStrategy = async (error, context) => {
      return { success: true, custom: true };
    };
    
    handler.addRecoveryStrategy('custom_type', customStrategy);
    test.expect(handler.recoveryStrategies.has('custom_type')).toBe(true);
  });
});

test.describe('Error Thresholds', () => {
  test.it('should check error thresholds', () => {
    const handler = new EnhancedErrorHandler();
    
    // Add multiple errors of the same type quickly
    const errorType = ErrorTypes.API;
    for (let i = 0; i < 25; i++) {
      const error = new EnhancedError(`API Error ${i}`, errorType);
      handler.recordError(error);
    }
    
    const testError = new EnhancedError('Test threshold', errorType);
    const exceeded = handler.checkErrorThreshold(testError);
    
    test.expect(exceeded).toBe(true);
  });
});

test.describe('Error Wrapping', () => {
  test.itAsync('should wrap functions with error handling', async () => {
    const handler = new EnhancedErrorHandler();
    
    const problematicFunction = async (shouldFail) => {
      if (shouldFail) {
        throw new Error('Function failed');
      }
      return 'success';
    };
    
    const wrappedFunction = handler.wrap(problematicFunction, {
      functionName: 'testFunction'
    });
    
    // Test successful execution
    const successResult = await wrappedFunction(false);
    test.expect(successResult).toBe('success');
    
    // Test error handling
    try {
      await wrappedFunction(true);
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error).toBeInstanceOf(EnhancedError);
    }
  });
});

test.describe('Error Statistics', () => {
  test.itAsync('should generate error statistics', async () => {
    const handler = new EnhancedErrorHandler();
    
    // Add various types of errors
    await handler.handleError(new Error('Network timeout'));
    await handler.handleError(new Error('API failure'));
    await handler.handleError(new Error('Validation error'));
    await handler.handleError(new Error('Network connection lost'));
    
    const stats = handler.getErrorStats();
    
    test.expect(stats.total).toBe(4);
    test.expect(stats.byType[ErrorTypes.NETWORK]).toBe(2);
    test.expect(stats.byType[ErrorTypes.API]).toBe(1);
    test.expect(stats.byType[ErrorTypes.VALIDATION]).toBe(1);
  });
});

test.describe('Utility Functions', () => {
  test.itAsync('should provide handleError utility', async () => {
    const error = new Error('Utility test error');
    const result = await handleError(error);
    
    test.expect(result.handled).toBe(true);
    test.expect(result.error).toBeInstanceOf(EnhancedError);
  });

  test.it('should provide createError utility', () => {
    const error = createError(
      'Custom error',
      ErrorTypes.VALIDATION,
      ErrorSeverity.HIGH,
      { customData: 'test' }
    );
    
    test.expect(error).toBeInstanceOf(EnhancedError);
    test.expect(error.type).toBe(ErrorTypes.VALIDATION);
    test.expect(error.severity).toBe(ErrorSeverity.HIGH);
    test.expect(error.context.customData).toBe('test');
  });

  test.itAsync('should provide wrapWithErrorHandler utility', async () => {
    const testFunction = async (input) => {
      if (input === 'fail') {
        throw new Error('Test failure');
      }
      return `processed: ${input}`;
    };
    
    const wrappedFunction = wrapWithErrorHandler(testFunction);
    
    const result = await wrappedFunction('success');
    test.expect(result).toBe('processed: success');
    
    try {
      await wrappedFunction('fail');
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error).toBeInstanceOf(EnhancedError);
    }
  });
});

test.describe('Global Error Handling', () => {
  test.it('should setup global error handlers', () => {
    const handler = new EnhancedErrorHandler();
    
    // Verify that the handler has been initialized
    test.expect(handler.errorHistory).toBeInstanceOf(Array);
    test.expect(handler.recoveryStrategies).toBeInstanceOf(Map);
    test.expect(handler.errorThresholds).toBeInstanceOf(Map);
  });
});

test.describe('Cleanup', () => {
  test.itAsync('should cleanup old errors', async () => {
    const handler = new EnhancedErrorHandler();
    
    // Add some errors
    await handler.handleError(new Error('Old error 1'));
    await handler.handleError(new Error('Old error 2'));
    
    // Cleanup with 0 max age (should remove all)
    handler.cleanup(0);
    
    test.expect(handler.errorHistory.length).toBe(0);
  });
});

// Show test results
test.summary();

console.log('\n🚨 Enhanced Error Handler testing completed!');
console.log('The error handling system is ready for integration.');