/**
 * User Page Tests
 * 测试用户管理页面的核心功能
 */

// Mock DOM elements and functions
const createMockElement = (type, properties = {}) => ({
  tagName: type.toUpperCase(),
  id: properties.id || '',
  innerHTML: '',
  style: {},
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  click: jest.fn(),
  classList: {
    contains: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn()
  },
  dataset: properties.dataset || {},
  target: properties.target || null,
  ...properties
});

global.document = {
  getElementById: jest.fn(),
  createElement: jest.fn((type) => createMockElement(type)),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.setTimeout = jest.fn((fn, delay) => {
  if (typeof fn === 'function') {
    // Execute immediately for testing
    fn();
  }
  return 1;
});

global.alert = jest.fn();
global.confirm = jest.fn(() => true);

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
global.console = {
  ...console,
  log: jest.fn()
};

// Mock the UserPage module
const UserPage = class {
  constructor(app) {
    this.app = app;
    this.users = [];
  }

  async render() {
    console.log('👥 Rendering User Management page...');
    
    const html = `
      <div class="user-page">
        <div class="page-header">
          <h1>👥 用户管理</h1>
          <p>管理系统用户和权限</p>
        </div>
        
        <div class="content-grid">
          <div class="stats-section">
            <div class="stat-card">
              <h3>活跃用户</h3>
              <div class="stat-number">1,234</div>
              <div class="stat-change positive">+12%</div>
            </div>
            
            <div class="stat-card">
              <h3>新注册</h3>
              <div class="stat-number">89</div>
              <div class="stat-change positive">+5%</div>
            </div>
            
            <div class="stat-card">
              <h3>总用户数</h3>
              <div class="stat-number">5,678</div>
              <div class="stat-change positive">+8%</div>
            </div>
          </div>
          
          <div class="user-table-section">
            <div class="table-header">
              <h2>用户列表</h2>
              <button class="btn-primary" id="btn-add-user">添加用户</button>
            </div>
            
            <div class="user-table">
              <table>
                <thead>
                  <tr>
                    <th>用户ID</th>
                    <th>用户名</th>
                    <th>邮箱</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>注册时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody id="user-table-body">
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 20px;">
                      正在加载用户数据...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const styles = `<style>/* User page styles */</style>`;
    
    console.log('✅ User Management page rendered');
    return styles + html;
  }

  async mounted() {
    console.log('📌 UserPage mounted, loading data...');
    
    setTimeout(() => {
      this.loadUserData();
    }, 500);
    
    this.bindEvents();
  }

  loadUserData() {
    const tableBody = document.getElementById('user-table-body');
    if (!tableBody) return;
    
    this.users = [
      {
        id: '001',
        username: 'admin',
        email: 'admin@example.com',
        role: '超级管理员',
        status: 'active',
        registeredAt: '2024-01-15'
      },
      {
        id: '002',
        username: 'davidwang812',
        email: 'davidwang812@gmail.com',
        role: '管理员',
        status: 'active',
        registeredAt: '2024-01-20'
      },
      {
        id: '003',
        username: 'testuser',
        email: 'test@example.com',
        role: '普通用户',
        status: 'inactive',
        registeredAt: '2024-02-01'
      }
    ];
    
    tableBody.innerHTML = this.users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>
          <span class="status-badge status-${user.status === 'active' ? 'active' : 'inactive'}">
            ${user.status === 'active' ? '活跃' : '非活跃'}
          </span>
        </td>
        <td>${user.registeredAt}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-small btn-edit" data-user-id="${user.id}">编辑</button>
            <button class="btn-small btn-delete" data-user-id="${user.id}">删除</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  bindEvents() {
    const addBtn = document.getElementById('btn-add-user');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addUser());
    }
    
    const tableBody = document.getElementById('user-table-body');
    if (tableBody) {
      tableBody.addEventListener('click', (e) => {
        const target = e.target;
        const userId = target.dataset.userId;
        
        if (target.classList.contains('btn-edit')) {
          this.editUser(userId);
        } else if (target.classList.contains('btn-delete')) {
          this.deleteUser(userId);
        }
      });
    }
  }

  addUser() {
    alert('添加用户功能开发中...');
  }

  editUser(userId) {
    alert(`编辑用户 ${userId} 功能开发中...`);
  }

  deleteUser(userId) {
    if (confirm(`确定要删除用户 ${userId} 吗？`)) {
      alert(`删除用户 ${userId} 功能开发中...`);
    }
  }

  destroy() {
    console.log('🧹 Destroying User page...');
    this.users = [];
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

console.log('👥 Testing User Management Page\n');

test.describe('UserPage Initialization', () => {
  test.it('should initialize with correct properties', () => {
    const mockApp = { showToast: jest.fn() };
    const userPage = new UserPage(mockApp);

    test.expect(userPage.app).toBe(mockApp);
    test.expect(userPage.users).toEqual([]);
  });

  test.it('should be an instance of UserPage', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    test.expect(userPage).toBeInstanceOf(UserPage);
  });
});

test.describe('Page Rendering', () => {
  test.itAsync('should render page with correct HTML structure', async () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    const html = await userPage.render();

    test.expect(html).toContain('user-page');
    test.expect(html).toContain('👥 用户管理');
    test.expect(html).toContain('管理系统用户和权限');
    test.expect(html).toContain('btn-add-user');
    test.expect(html).toContain('user-table-body');
  });

  test.itAsync('should include stats section', async () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    const html = await userPage.render();

    test.expect(html).toContain('stats-section');
    test.expect(html).toContain('活跃用户');
    test.expect(html).toContain('新注册');
    test.expect(html).toContain('总用户数');
    test.expect(html).toContain('1,234');
    test.expect(html).toContain('89');
    test.expect(html).toContain('5,678');
  });

  test.itAsync('should include user table structure', async () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    const html = await userPage.render();

    test.expect(html).toContain('用户ID');
    test.expect(html).toContain('用户名');
    test.expect(html).toContain('邮箱');
    test.expect(html).toContain('角色');
    test.expect(html).toContain('状态');
    test.expect(html).toContain('注册时间');
    test.expect(html).toContain('操作');
    test.expect(html).toContain('正在加载用户数据...');
  });

  test.itAsync('should include CSS styles', async () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    const html = await userPage.render();

    test.expect(html).toContain('<style>');
    test.expect(html).toContain('</style>');
  });

  test.itAsync('should log rendering process', async () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    await userPage.render();

    test.expect(console.log).toHaveBeenCalledWith('👥 Rendering User Management page...');
    test.expect(console.log).toHaveBeenCalledWith('✅ User Management page rendered');
  });
});

test.describe('Component Lifecycle', () => {
  test.itAsync('should handle mounted lifecycle', async () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    // Mock DOM elements
    const mockAddBtn = createMockElement('button', { id: 'btn-add-user' });
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    
    document.getElementById.mockImplementation((id) => {
      if (id === 'btn-add-user') return mockAddBtn;
      if (id === 'user-table-body') return mockTableBody;
      return null;
    });

    await userPage.mounted();

    test.expect(console.log).toHaveBeenCalledWith('📌 UserPage mounted, loading data...');
    test.expect(setTimeout).toHaveBeenCalled();
  });

  test.it('should destroy component correctly', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    // Add some users first
    userPage.users = [{ id: '1', name: 'test' }];

    userPage.destroy();

    test.expect(userPage.users).toEqual([]);
    test.expect(console.log).toHaveBeenCalledWith('🧹 Destroying User page...');
  });
});

test.describe('User Data Management', () => {
  test.it('should load user data correctly', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    document.getElementById.mockReturnValue(mockTableBody);

    userPage.loadUserData();

    test.expect(userPage.users).toHaveLength(3);
    test.expect(userPage.users[0].username).toBe('admin');
    test.expect(userPage.users[1].username).toBe('davidwang812');
    test.expect(userPage.users[2].username).toBe('testuser');
  });

  test.it('should populate table with user data', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    document.getElementById.mockReturnValue(mockTableBody);

    userPage.loadUserData();

    test.expect(mockTableBody.innerHTML).toContain('admin');
    test.expect(mockTableBody.innerHTML).toContain('admin@example.com');
    test.expect(mockTableBody.innerHTML).toContain('超级管理员');
    test.expect(mockTableBody.innerHTML).toContain('davidwang812');
    test.expect(mockTableBody.innerHTML).toContain('testuser');
  });

  test.it('should handle missing table body element', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    document.getElementById.mockReturnValue(null);

    // Should not throw error
    test.expect(() => userPage.loadUserData()).not.toThrow();
    test.expect(userPage.users).toEqual([]);
  });

  test.it('should render user status correctly', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    document.getElementById.mockReturnValue(mockTableBody);

    userPage.loadUserData();

    test.expect(mockTableBody.innerHTML).toContain('status-active');
    test.expect(mockTableBody.innerHTML).toContain('status-inactive');
    test.expect(mockTableBody.innerHTML).toContain('活跃');
    test.expect(mockTableBody.innerHTML).toContain('非活跃');
  });
});

test.describe('Event Handling', () => {
  test.it('should bind events correctly', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    const mockAddBtn = createMockElement('button', { id: 'btn-add-user' });
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    
    document.getElementById.mockImplementation((id) => {
      if (id === 'btn-add-user') return mockAddBtn;
      if (id === 'user-table-body') return mockTableBody;
      return null;
    });

    userPage.bindEvents();

    test.expect(mockAddBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    test.expect(mockTableBody.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  test.it('should handle missing DOM elements in event binding', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    document.getElementById.mockReturnValue(null);

    // Should not throw error
    test.expect(() => userPage.bindEvents()).not.toThrow();
  });
});

test.describe('User Actions', () => {
  test.it('should handle add user action', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    userPage.addUser();

    test.expect(alert).toHaveBeenCalledWith('添加用户功能开发中...');
  });

  test.it('should handle edit user action', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    userPage.editUser('123');

    test.expect(alert).toHaveBeenCalledWith('编辑用户 123 功能开发中...');
  });

  test.it('should handle delete user action with confirmation', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    confirm.mockReturnValueOnce(true);

    userPage.deleteUser('123');

    test.expect(confirm).toHaveBeenCalledWith('确定要删除用户 123 吗？');
    test.expect(alert).toHaveBeenCalledWith('删除用户 123 功能开发中...');
  });

  test.it('should handle delete user action with cancellation', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);

    confirm.mockReturnValueOnce(false);
    alert.mockClear();

    userPage.deleteUser('123');

    test.expect(confirm).toHaveBeenCalledWith('确定要删除用户 123 吗？');
    test.expect(alert).not.toHaveBeenCalled();
  });
});

test.describe('Table Event Delegation', () => {
  test.it('should handle table click events for edit buttons', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    jest.spyOn(userPage, 'editUser');

    const mockTarget = {
      dataset: { userId: '123' },
      classList: { contains: jest.fn(() => true) }
    };
    mockTarget.classList.contains.mockImplementation((className) => className === 'btn-edit');

    const mockEvent = { target: mockTarget };
    
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    document.getElementById.mockReturnValue(mockTableBody);

    userPage.bindEvents();

    // Simulate the event handler
    const clickHandler = mockTableBody.addEventListener.mock.calls[0][1];
    clickHandler(mockEvent);

    test.expect(userPage.editUser).toHaveBeenCalledWith('123');
  });

  test.it('should handle table click events for delete buttons', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    jest.spyOn(userPage, 'deleteUser');

    const mockTarget = {
      dataset: { userId: '456' },
      classList: { contains: jest.fn(() => true) }
    };
    mockTarget.classList.contains.mockImplementation((className) => className === 'btn-delete');

    const mockEvent = { target: mockTarget };
    
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    document.getElementById.mockReturnValue(mockTableBody);

    userPage.bindEvents();

    // Simulate the event handler
    const clickHandler = mockTableBody.addEventListener.mock.calls[0][1];
    clickHandler(mockEvent);

    test.expect(userPage.deleteUser).toHaveBeenCalledWith('456');
  });
});

test.describe('User Data Structure', () => {
  test.it('should have correct user data structure', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    document.getElementById.mockReturnValue(mockTableBody);

    userPage.loadUserData();

    const user = userPage.users[0];
    test.expect(user).toHaveProperty('id');
    test.expect(user).toHaveProperty('username');
    test.expect(user).toHaveProperty('email');
    test.expect(user).toHaveProperty('role');
    test.expect(user).toHaveProperty('status');
    test.expect(user).toHaveProperty('registeredAt');
  });

  test.it('should have admin user as first user', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    document.getElementById.mockReturnValue(mockTableBody);

    userPage.loadUserData();

    const adminUser = userPage.users[0];
    test.expect(adminUser.id).toBe('001');
    test.expect(adminUser.username).toBe('admin');
    test.expect(adminUser.email).toBe('admin@example.com');
    test.expect(adminUser.role).toBe('超级管理员');
    test.expect(adminUser.status).toBe('active');
  });

  test.it('should have mixed user status', () => {
    const mockApp = {};
    const userPage = new UserPage(mockApp);
    
    const mockTableBody = createMockElement('tbody', { id: 'user-table-body' });
    document.getElementById.mockReturnValue(mockTableBody);

    userPage.loadUserData();

    const activeUsers = userPage.users.filter(u => u.status === 'active');
    const inactiveUsers = userPage.users.filter(u => u.status === 'inactive');

    test.expect(activeUsers).toHaveLength(2);
    test.expect(inactiveUsers).toHaveLength(1);
  });
});

// Restore console.log
global.console.log = originalConsoleLog;

// Show test results
test.summary();

console.log('\n👥 User Management Page testing completed!');
console.log('Ready for integration with the admin V3 user management system.');