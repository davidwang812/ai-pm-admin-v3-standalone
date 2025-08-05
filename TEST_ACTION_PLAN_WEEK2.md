# Test Action Plan - Week 2 (70% Coverage Target)

## 📊 Current Status
- **Current Coverage**: ~30% (14/38 files tested)
- **Target**: 70% coverage
- **Gap**: Need to add tests for 13 more files (27/38 = 71%)

## 🎯 Priority Files for Testing

### Critical Core Files (Must Test)
1. **auth-config.js** - Authentication configuration
2. **auth.js** - Main authentication module
3. **bootstrap.js** - Application initialization

### High-Value Page Components
4. **_pages/ai-service/index.js** - Main AI service page
5. **_pages/ai-service/catalog/catalog-manager.js** - Provider catalog management
6. **_pages/ai-service/data-sources.js** - Data source configuration

### Utility Modules
7. **_utils/logger.js** - Logging service (already created)
8. **_app/config.js** - Application configuration
9. **_app/lazy-loader.js** - Module lazy loading

### Additional Coverage Boosters
10. **_pages/ai-service/events/event-handlers.js** - Event handling
11. **_pages/ai-service/catalog-comparator.js** - Catalog comparison
12. **_pages/ai-service/price-standardizer.js** - Price standardization
13. **_app/modules/cost-analysis.js** - Cost analysis module

## 📝 Test Implementation Strategy

### Phase 1: Core Module Tests (Files 1-3)
Create comprehensive tests for authentication and bootstrap:

```javascript
// __tests__/core/auth-config.test.js
describe('AuthConfig', () => {
  test('loads default configuration', () => {});
  test('validates token format', () => {});
  test('handles expired tokens', () => {});
});

// __tests__/core/auth.test.js
describe('Auth', () => {
  test('login with valid credentials', () => {});
  test('logout clears session', () => {});
  test('token refresh works', () => {});
});

// __tests__/app/bootstrap.test.js
describe('Bootstrap', () => {
  test('initializes application', () => {});
  test('loads required modules', () => {});
  test('handles initialization errors', () => {});
});
```

### Phase 2: Page Component Tests (Files 4-6)
Test main page components with mocked DOM:

```javascript
// __tests__/pages/ai-service/index.test.js
describe('AIServicePage', () => {
  test('renders all tabs', () => {});
  test('switches between tabs', () => {});
  test('loads module data', () => {});
});
```

### Phase 3: Utility Tests (Files 7-9)
Simple unit tests for utilities:

```javascript
// __tests__/utils/logger.test.js
describe('Logger', () => {
  test('logs different levels', () => {});
  test('formats messages correctly', () => {});
  test('respects log level settings', () => {});
});
```

### Phase 4: Event and Data Tests (Files 10-13)
Test event handling and data processing:

```javascript
// __tests__/pages/ai-service/events/event-handlers.test.js
describe('EventHandlers', () => {
  test('handles button clicks', () => {});
  test('validates form input', () => {});
  test('triggers correct actions', () => {});
});
```

## 🛠️ Test Templates

### Basic Test Template
```javascript
import { ModuleName } from '../../path/to/module.js';

describe('ModuleName', () => {
  let instance;
  
  beforeEach(() => {
    instance = new ModuleName();
  });
  
  describe('method', () => {
    it('should handle success case', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = instance.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
    
    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

### API Mock Template
```javascript
import { MockApiClient } from '../helpers/api-mocks.js';

describe('Module with API', () => {
  let apiClient;
  
  beforeEach(() => {
    apiClient = new MockApiClient();
    apiClient.setMockResponse('GET', '/endpoint', {
      success: true,
      data: { /* mock data */ }
    });
  });
  
  it('should fetch data', async () => {
    const result = await moduleMethod(apiClient);
    expect(result).toEqual(/* expected */);
    expect(apiClient.getCallCount('GET', '/endpoint')).toBe(1);
  });
});
```

### DOM Test Template
```javascript
import { createMockDocument, fireEvent } from '../helpers/dom-mocks.js';

describe('DOM Component', () => {
  let document;
  
  beforeEach(() => {
    document = createMockDocument();
    global.document = document;
  });
  
  it('should handle click events', () => {
    const button = document.createElement('button');
    const handler = jest.fn();
    
    button.addEventListener('click', handler);
    fireEvent(button, 'click');
    
    expect(handler).toHaveBeenCalled();
  });
});
```

## 📈 Expected Coverage After Implementation

| Module | Current | After | Files Added |
|--------|---------|-------|-------------|
| _core | 67% | 100% | +3 |
| _pages | 35% | 65% | +6 |
| _app | 14% | 57% | +3 |
| _utils | 0% | 50% | +1 |
| **Total** | **37%** | **71%** | **+13** |

## ⏱️ Time Estimates

- Core module tests: 2 hours
- Page component tests: 3 hours
- Utility tests: 1 hour
- Event/data tests: 2 hours
- **Total: ~8 hours**

## 🚀 Quick Start Commands

```bash
# Create all test files
for file in auth-config auth bootstrap index catalog-manager data-sources logger config lazy-loader event-handlers catalog-comparator price-standardizer cost-analysis; do
  touch __tests__/${file}.test.js
done

# Run coverage check
node scripts/coverage-summary.js

# Run simple tests
node scripts/run-simple-tests.js

# Analyze test issues
node scripts/analyze-test-issues.js
```

## ✅ Success Criteria

1. File coverage reaches 70% (27/38 files)
2. All critical auth modules have tests
3. Main page components are tested
4. No regression in existing tests
5. Tests can run without full Jest setup

---

*Next: Week 3 - Achieve 85% coverage with integration tests*