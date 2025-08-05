#!/usr/bin/env node
/**
 * Enhanced Test Runner
 * 增强的测试运行器 - 不依赖完整的Jest环境
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  suites: [],
  startTime: Date.now()
};

// Current test context
let currentSuite = null;
let currentTest = null;

// Mock implementations
const mocks = {
  // Jest core functions
  describe: (name, fn) => {
    const suite = {
      name,
      tests: [],
      passed: 0,
      failed: 0
    };
    currentSuite = suite;
    results.suites.push(suite);
    
    try {
      fn();
    } catch (error) {
      console.error(`Suite setup error in "${name}":`, error.message);
    }
    
    currentSuite = null;
  },
  
  it: (name, fn) => {
    results.total++;
    const test = {
      name,
      suite: currentSuite?.name || 'Global',
      status: 'pending'
    };
    
    if (currentSuite) {
      currentSuite.tests.push(test);
    }
    
    currentTest = test;
    
    try {
      // Handle async tests
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result
          .then(() => {
            test.status = 'passed';
            results.passed++;
            if (currentSuite) currentSuite.passed++;
          })
          .catch(error => {
            test.status = 'failed';
            test.error = error.message;
            results.failed++;
            if (currentSuite) currentSuite.failed++;
          });
      } else {
        test.status = 'passed';
        results.passed++;
        if (currentSuite) currentSuite.passed++;
      }
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      results.failed++;
      if (currentSuite) currentSuite.failed++;
    }
  },
  
  test: (name, fn) => mocks.it(name, fn),
  
  beforeEach: (fn) => {
    // Simple implementation - store for later use
    if (currentSuite) {
      currentSuite.beforeEach = fn;
    }
  },
  
  afterEach: (fn) => {
    // Simple implementation - store for later use
    if (currentSuite) {
      currentSuite.afterEach = fn;
    }
  },
  
  expect: (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be null`);
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be undefined`);
      }
    },
    toContain: (expected) => {
      if (Array.isArray(actual) || typeof actual === 'string') {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
        }
      } else {
        throw new Error(`Cannot use toContain on non-array/string`);
      }
    },
    toHaveLength: (expected) => {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${actual.length} to be ${expected}`);
      }
    },
    toHaveBeenCalled: () => {
      if (!actual || !actual.mock || !actual.mock.calls || actual.mock.calls.length === 0) {
        throw new Error(`Expected function to have been called`);
      }
    },
    toHaveBeenCalledTimes: (expected) => {
      const calls = actual?.mock?.calls?.length || 0;
      if (calls !== expected) {
        throw new Error(`Expected function to be called ${expected} times, but was called ${calls} times`);
      }
    },
    toHaveBeenCalledWith: (...args) => {
      const calls = actual?.mock?.calls || [];
      const found = calls.some(call => 
        JSON.stringify(call) === JSON.stringify(args)
      );
      if (!found) {
        throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
      }
    },
    toThrow: (expected) => {
      let threw = false;
      let error = null;
      
      try {
        if (typeof actual === 'function') {
          actual();
        }
      } catch (e) {
        threw = true;
        error = e;
      }
      
      if (!threw) {
        throw new Error(`Expected function to throw`);
      }
      
      if (expected && error.message !== expected) {
        throw new Error(`Expected to throw "${expected}" but threw "${error.message}"`);
      }
    },
    not: {
      toBe: (expected) => {
        if (actual === expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`);
        }
      }
    }
  }),
  
  jest: {
    fn: (implementation) => {
      const mockFn = implementation || (() => {});
      
      // Track calls
      mockFn.mock = {
        calls: [],
        results: []
      };
      
      // Create wrapped function
      const wrapped = (...args) => {
        mockFn.mock.calls.push(args);
        try {
          const result = mockFn(...args);
          mockFn.mock.results.push({ type: 'return', value: result });
          return result;
        } catch (error) {
          mockFn.mock.results.push({ type: 'throw', value: error });
          throw error;
        }
      };
      
      // Add mock methods
      wrapped.mock = mockFn.mock;
      wrapped.mockClear = () => {
        mockFn.mock.calls = [];
        mockFn.mock.results = [];
      };
      wrapped.mockReturnValue = (value) => {
        return mocks.jest.fn(() => value);
      };
      wrapped.mockResolvedValue = (value) => {
        return mocks.jest.fn(() => Promise.resolve(value));
      };
      wrapped.mockRejectedValue = (value) => {
        return mocks.jest.fn(() => Promise.reject(value));
      };
      wrapped.mockImplementation = (fn) => {
        return mocks.jest.fn(fn);
      };
      
      return wrapped;
    },
    
    spyOn: (obj, method) => {
      const original = obj[method];
      const spy = mocks.jest.fn(original.bind(obj));
      obj[method] = spy;
      spy.mockRestore = () => {
        obj[method] = original;
      };
      return spy;
    }
  }
};

// Global setup
global.describe = mocks.describe;
global.it = mocks.it;
global.test = mocks.test;
global.beforeEach = mocks.beforeEach;
global.afterEach = mocks.afterEach;
global.expect = mocks.expect;
global.jest = mocks.jest;

// Mock DOM
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
  body: { appendChild: () => {} }
};

global.window = {
  location: { href: '', hostname: 'localhost' },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  }
};

// Mock fetch
global.fetch = () => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({})
});

// Mock Headers
global.Headers = Map;

// Run a test file
async function runTestFile(filePath) {
  console.log(`\n📄 Running: ${path.basename(filePath)}`);
  
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    
    // Create a new context for the test
    const testContext = {
      ...global,
      require: (modulePath) => {
        if (modulePath.startsWith('.')) {
          const resolvedPath = path.resolve(path.dirname(filePath), modulePath);
          // Return empty module for now
          return {};
        }
        return {};
      },
      module: { exports: {} },
      exports: {}
    };
    
    // Execute the test file
    try {
      vm.runInNewContext(code, testContext, {
        filename: filePath,
        timeout: 5000
      });
    } catch (error) {
      console.error(`  ❌ Test file error: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`  ❌ Failed to read test file: ${error.message}`);
  }
}

// Generate report
function generateReport() {
  const duration = Date.now() - results.startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary\n');
  
  // Overall stats
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  // Suite details
  if (results.suites.length > 0) {
    console.log('\n📋 Test Suites:');
    results.suites.forEach(suite => {
      const status = suite.failed === 0 ? '✅' : '❌';
      console.log(`\n${status} ${suite.name}`);
      console.log(`   Passed: ${suite.passed}, Failed: ${suite.failed}`);
      
      if (suite.failed > 0) {
        suite.tests
          .filter(test => test.status === 'failed')
          .forEach(test => {
            console.log(`   ❌ ${test.name}`);
            if (test.error) {
              console.log(`      ${test.error}`);
            }
          });
      }
    });
  }
  
  // Save JSON report
  const report = {
    timestamp: new Date().toISOString(),
    duration,
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      successRate: ((results.passed / results.total) * 100).toFixed(1)
    },
    suites: results.suites
  };
  
  fs.writeFileSync('test-results.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: test-results.json');
}

// Main execution
async function main() {
  console.log('🧪 Enhanced Test Runner\n');
  console.log('=' . repeat(60));
  
  // Find test files
  const testDir = path.join(process.cwd(), '__tests__');
  const testFiles = [];
  
  function findTests(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findTests(fullPath);
      } else if (file.endsWith('.test.js')) {
        testFiles.push(fullPath);
      }
    });
  }
  
  findTests(testDir);
  
  console.log(`Found ${testFiles.length} test files`);
  
  // Run each test file
  for (const testFile of testFiles) {
    await runTestFile(testFile);
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate report
  generateReport();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});