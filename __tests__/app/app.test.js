/**
 * 主应用程序测试
 */

import { jest } from '@jest/globals';
import { mockLocalStorage, mockFetch, mockDOM } from '../setup/test-utils.js';

describe('AdminV3App', () => {
  let AdminV3App;
  let app;

  beforeEach(async () => {
    // 设置DOM环境
    mockDOM();
    
    // Mock依赖
    jest.mock('../../_core/api-client.js', () => ({
      ApiClient: jest.fn().mockImplementation(() => ({
        get: jest.fn().mockResolvedValue({ success: true }),
        post: jest.fn().mockResolvedValue({ success: true })
      }))
    }));

    jest.mock('../../_core/router.js', () => ({
      Router: jest.fn().mockImplementation(() => ({
        init: jest.fn(),
        navigate: jest.fn(),
        on: jest.fn()
      }))
    }));

    jest.mock('../../_core/auth-v3.js', () => ({
      AuthManager: jest.fn().mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(true),
        isAuthenticated: jest.fn().mockReturnValue(true),
        getCurrentUser: jest.fn().mockReturnValue({ id: '1', email: 'test@example.com' })
      }))
    }));

    // 动态导入
    const module = await import('../../_app/app.js');
    AdminV3App = module.AdminV3App;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确创建应用实例', () => {
      app = new AdminV3App();
      expect(app).toBeDefined();
      expect(app.modules).toEqual({});
      expect(app.currentModule).toBeNull();
    });

    test('应该正确初始化应用', async () => {
      app = new AdminV3App();
      const initSpy = jest.spyOn(app, 'init');
      
      await app.init();
      
      expect(initSpy).toHaveBeenCalled();
      expect(app.auth).toBeDefined();
      expect(app.api).toBeDefined();
      expect(app.router).toBeDefined();
    });

    test('应该处理初始化错误', async () => {
      app = new AdminV3App();
      app.auth = {
        init: jest.fn().mockRejectedValue(new Error('Auth failed'))
      };

      await expect(app.init()).rejects.toThrow('Auth failed');
    });
  });

  describe('模块管理', () => {
    beforeEach(async () => {
      app = new AdminV3App();
      await app.init();
    });

    test('应该注册模块', () => {
      const mockModule = {
        name: 'test-module',
        init: jest.fn(),
        render: jest.fn()
      };

      app.registerModule('test', mockModule);
      expect(app.modules.test).toBe(mockModule);
    });

    test('应该加载模块', async () => {
      const mockModule = {
        name: 'test-module',
        init: jest.fn().mockResolvedValue(true),
        render: jest.fn().mockReturnValue('<div>Test</div>')
      };

      app.registerModule('test', mockModule);
      await app.loadModule('test');

      expect(mockModule.init).toHaveBeenCalled();
      expect(app.currentModule).toBe('test');
    });

    test('应该处理模块加载错误', async () => {
      await expect(app.loadModule('non-existent')).rejects.toThrow();
    });
  });

  describe('工具方法', () => {
    beforeEach(async () => {
      app = new AdminV3App();
      await app.init();
    });

    test('showToast应该显示提示消息', () => {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);

      app.showToast('success', '操作成功');
      
      const toast = toastContainer.querySelector('.toast');
      expect(toast).toBeTruthy();
      expect(toast.textContent).toContain('操作成功');
    });

    test('showLoading应该显示加载状态', () => {
      const container = document.createElement('div');
      
      app.showLoading(container);
      expect(container.querySelector('.loading-spinner')).toBeTruthy();
      
      app.hideLoading(container);
      expect(container.querySelector('.loading-spinner')).toBeFalsy();
    });

    test('formatters应该正确格式化数据', () => {
      expect(app.formatters.currency(1234.56)).toBe('¥1,234.56');
      expect(app.formatters.percentage(0.856)).toBe('85.60%');
      expect(app.formatters.number(1234567)).toBe('1,234,567');
    });

    test('validators应该正确验证数据', () => {
      expect(app.validators.email('test@example.com')).toBe(true);
      expect(app.validators.email('invalid')).toBe(false);
      
      expect(app.validators.required('value')).toBe(true);
      expect(app.validators.required('')).toBe(false);
      
      expect(app.validators.minLength('test', 3)).toBe(true);
      expect(app.validators.minLength('te', 3)).toBe(false);
    });
  });

  describe('事件处理', () => {
    beforeEach(async () => {
      app = new AdminV3App();
      await app.init();
    });

    test('应该处理全局错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      
      window.dispatchEvent(new ErrorEvent('error', { error }));
      
      expect(consoleSpy).toHaveBeenCalledWith('Global error:', error);
    });

    test('应该处理未捕获的Promise错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const reason = new Error('Promise rejected');
      
      window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { reason }));
      
      expect(consoleSpy).toHaveBeenCalledWith('Unhandled promise rejection:', reason);
    });
  });

  describe('生命周期', () => {
    beforeEach(async () => {
      app = new AdminV3App();
    });

    test('应该正确销毁应用', async () => {
      await app.init();
      
      const destroySpy = jest.spyOn(app, 'destroy');
      app.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
      expect(app.currentModule).toBeNull();
      expect(app.modules).toEqual({});
    });
  });
});