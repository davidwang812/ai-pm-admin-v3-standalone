/**
 * 认证管理器V3测试
 */

import { jest } from '@jest/globals';
import { mockLocalStorage, mockFetch } from '../setup/test-utils.js';

describe('AuthManager', () => {
  let AuthManager;
  let authManager;
  let mockApiClient;

  beforeEach(async () => {
    // Mock依赖
    mockLocalStorage();
    mockFetch();

    mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
      setAuthToken: jest.fn()
    };

    // Mock jose
    jest.mock('jose', () => ({
      decodeJwt: jest.fn((token) => ({
        userId: 'test-user-id',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600
      }))
    }));

    const module = await import('../../_core/auth-v3.js');
    AuthManager = module.AuthManager;
    authManager = new AuthManager(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化', async () => {
      localStorage.getItem.mockReturnValue('test-token');
      
      const result = await authManager.init();
      
      expect(result).toBe(true);
      expect(authManager.isAuthenticated()).toBe(true);
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('test-token');
    });

    test('应该处理无token的情况', async () => {
      localStorage.getItem.mockReturnValue(null);
      
      const result = await authManager.init();
      
      expect(result).toBe(false);
      expect(authManager.isAuthenticated()).toBe(false);
    });

    test('应该处理过期的token', async () => {
      const expiredToken = 'expired-token';
      localStorage.getItem.mockReturnValue(expiredToken);
      
      // Mock过期的token
      jest.resetModules();
      jest.mock('jose', () => ({
        decodeJwt: jest.fn(() => ({
          exp: Math.floor(Date.now() / 1000) - 3600 // 1小时前过期
        }))
      }));
      
      const module = await import('../../_core/auth-v3.js');
      authManager = new module.AuthManager(mockApiClient);
      
      const result = await authManager.init();
      
      expect(result).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('adminV3_token');
    });
  });

  describe('登录功能', () => {
    test('应该成功登录', async () => {
      const credentials = {
        username: 'admin',
        password: 'password123'
      };
      
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: {
          token: 'new-token',
          user: {
            id: 'user-id',
            email: 'admin@example.com',
            isAdmin: true
          }
        }
      });
      
      const result = await authManager.login(credentials);
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 'user-id',
        email: 'admin@example.com',
        isAdmin: true
      });
      expect(localStorage.setItem).toHaveBeenCalledWith('adminV3_token', 'new-token');
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('new-token');
    });

    test('应该处理登录失败', async () => {
      mockApiClient.post.mockResolvedValue({
        success: false,
        error: '用户名或密码错误'
      });
      
      const result = await authManager.login({
        username: 'wrong',
        password: 'wrong'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('用户名或密码错误');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    test('应该处理网络错误', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));
      
      const result = await authManager.login({
        username: 'admin',
        password: 'password'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('登出功能', () => {
    test('应该成功登出', async () => {
      authManager.token = 'test-token';
      authManager.user = { id: '1', email: 'test@example.com' };
      
      mockApiClient.post.mockResolvedValue({ success: true });
      
      await authManager.logout();
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/admin/logout');
      expect(localStorage.removeItem).toHaveBeenCalledWith('adminV3_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('adminV3_user');
      expect(authManager.token).toBeNull();
      expect(authManager.user).toBeNull();
    });

    test('应该处理登出API失败但仍清除本地数据', async () => {
      authManager.token = 'test-token';
      mockApiClient.post.mockRejectedValue(new Error('API Error'));
      
      await authManager.logout();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('adminV3_token');
      expect(authManager.token).toBeNull();
    });
  });

  describe('Token管理', () => {
    test('应该验证有效的token', () => {
      authManager.token = 'valid-token';
      authManager.user = { id: '1' };
      authManager.tokenExpiry = Date.now() + 3600000; // 1小时后
      
      expect(authManager.isAuthenticated()).toBe(true);
    });

    test('应该拒绝过期的token', () => {
      authManager.token = 'expired-token';
      authManager.user = { id: '1' };
      authManager.tokenExpiry = Date.now() - 3600000; // 1小时前
      
      expect(authManager.isAuthenticated()).toBe(false);
    });

    test('应该刷新即将过期的token', async () => {
      authManager.token = 'old-token';
      authManager.tokenExpiry = Date.now() + 300000; // 5分钟后过期
      
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: {
          token: 'new-token',
          expiresIn: 3600
        }
      });
      
      const result = await authManager.refreshToken();
      
      expect(result).toBe(true);
      expect(authManager.token).toBe('new-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('adminV3_token', 'new-token');
    });
  });

  describe('权限检查', () => {
    test('应该检查管理员权限', () => {
      authManager.user = { id: '1', isAdmin: true };
      expect(authManager.hasPermission('admin')).toBe(true);
      
      authManager.user = { id: '2', isAdmin: false };
      expect(authManager.hasPermission('admin')).toBe(false);
    });

    test('应该检查超级管理员权限', () => {
      authManager.user = { id: '1', isSuperAdmin: true };
      expect(authManager.hasPermission('super_admin')).toBe(true);
      
      authManager.user = { id: '2', isSuperAdmin: false };
      expect(authManager.hasPermission('super_admin')).toBe(false);
    });

    test('应该检查特定功能权限', () => {
      authManager.user = {
        id: '1',
        permissions: ['view_users', 'edit_users', 'view_reports']
      };
      
      expect(authManager.hasPermission('view_users')).toBe(true);
      expect(authManager.hasPermission('delete_users')).toBe(false);
    });
  });

  describe('事件处理', () => {
    test('应该触发认证状态变化事件', async () => {
      const listener = jest.fn();
      authManager.on('authStateChanged', listener);
      
      await authManager.login({
        username: 'admin',
        password: 'password'
      });
      
      expect(listener).toHaveBeenCalledWith({
        authenticated: true,
        user: expect.any(Object)
      });
    });

    test('应该在401错误时自动登出', async () => {
      authManager.token = 'test-token';
      authManager.user = { id: '1' };
      
      const logoutSpy = jest.spyOn(authManager, 'logout');
      
      // 模拟401错误
      authManager.handleAuthError({ status: 401 });
      
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  describe('用户信息管理', () => {
    test('应该获取当前用户信息', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };
      authManager.user = user;
      
      expect(authManager.getCurrentUser()).toEqual(user);
    });

    test('应该更新用户信息', async () => {
      authManager.user = { id: '1', name: 'Old Name' };
      
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: {
          user: { id: '1', name: 'New Name' }
        }
      });
      
      const result = await authManager.updateUserProfile({ name: 'New Name' });
      
      expect(result.success).toBe(true);
      expect(authManager.user.name).toBe('New Name');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'adminV3_user',
        JSON.stringify({ id: '1', name: 'New Name' })
      );
    });
  });
});