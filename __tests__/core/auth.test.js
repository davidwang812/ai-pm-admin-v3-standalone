/**
 * Auth Module Tests
 * 测试主认证模块
 */

import { Auth } from '../../_core/auth.js';
import { MockApiClient, builders } from '../helpers/api-mocks.js';

describe('Auth', () => {
  let auth;
  let mockApi;
  let mockStorage;

  beforeEach(() => {
    // Create mock API client
    mockApi = new MockApiClient();
    
    // Create mock storage
    mockStorage = {
      data: {},
      getItem: jest.fn(key => mockStorage.data[key] || null),
      setItem: jest.fn((key, value) => { mockStorage.data[key] = value; }),
      removeItem: jest.fn(key => { delete mockStorage.data[key]; }),
      clear: jest.fn(() => { mockStorage.data = {}; })
    };
    
    // Set global mocks
    global.localStorage = mockStorage;
    global.fetch = mockApi.getMockResponse.bind(mockApi);
    
    // Create auth instance
    auth = new Auth();
    auth.api = mockApi;
  });

  afterEach(() => {
    mockStorage.clear();
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        username: 'admin',
        password: 'password123'
      };
      
      const mockResponse = {
        success: true,
        token: 'test-jwt-token',
        user: builders.user({ username: 'admin' })
      };
      
      mockApi.setMockResponse('POST', '/api/auth/admin/login', mockResponse);
      
      const result = await auth.login(credentials.username, credentials.password);
      
      expect(result.success).toBe(true);
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.user).toEqual(mockResponse.user);
      expect(mockStorage.setItem).toHaveBeenCalledWith('admin_token_v3', mockResponse.token);
    });

    it('should handle login failure', async () => {
      mockApi.setMockResponse('POST', '/api/auth/admin/login', {
        success: false,
        error: 'Invalid credentials'
      });
      
      const result = await auth.login('admin', 'wrong-password');
      
      expect(result.success).toBe(false);
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.user).toBeNull();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockApi.setMockResponse('POST', '/api/auth/admin/login', null, {
        throwError: true,
        errorMessage: 'Network error'
      });
      
      const result = await auth.login('admin', 'password');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should validate input', async () => {
      const result1 = await auth.login('', 'password');
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Username and password required');
      
      const result2 = await auth.login('admin', '');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Username and password required');
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      // Setup authenticated state
      mockStorage.data['admin_token_v3'] = 'test-token';
      mockStorage.data['admin_user_v3'] = JSON.stringify(builders.user());
      auth.isAuthenticated = true;
      auth.user = builders.user();
      auth.token = 'test-token';
    });

    it('should logout successfully', async () => {
      mockApi.setMockResponse('POST', '/api/auth/admin/logout', {
        success: true
      });
      
      await auth.logout();
      
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.user).toBeNull();
      expect(auth.token).toBeNull();
      expect(mockStorage.removeItem).toHaveBeenCalledWith('admin_token_v3');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('admin_user_v3');
    });

    it('should clear local state even if API call fails', async () => {
      mockApi.setMockResponse('POST', '/api/auth/admin/logout', null, {
        throwError: true
      });
      
      await auth.logout();
      
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.user).toBeNull();
      expect(mockStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('token management', () => {
    it('should check token validity', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test';
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjEwMDAwMDAwMDB9.test';
      
      expect(auth.isValidToken(validToken)).toBe(true);
      expect(auth.isValidToken(expiredToken)).toBe(false);
      expect(auth.isValidToken('invalid')).toBe(false);
      expect(auth.isValidToken(null)).toBe(false);
    });

    it('should refresh token', async () => {
      auth.token = 'old-token';
      
      mockApi.setMockResponse('POST', '/api/auth/admin/refresh', {
        success: true,
        token: 'new-token',
        user: builders.user()
      });
      
      const result = await auth.refreshToken();
      
      expect(result).toBe(true);
      expect(auth.token).toBe('new-token');
      expect(mockStorage.setItem).toHaveBeenCalledWith('admin_token_v3', 'new-token');
    });

    it('should handle refresh failure', async () => {
      auth.token = 'old-token';
      
      mockApi.setMockResponse('POST', '/api/auth/admin/refresh', {
        success: false
      });
      
      const result = await auth.refreshToken();
      
      expect(result).toBe(false);
      expect(auth.token).toBe('old-token'); // Should not change
    });
  });

  describe('session persistence', () => {
    it('should load saved session on init', async () => {
      const savedUser = builders.user();
      mockStorage.data['admin_token_v3'] = 'saved-token';
      mockStorage.data['admin_user_v3'] = JSON.stringify(savedUser);
      
      mockApi.setMockResponse('POST', '/api/auth/admin/verify', {
        success: true,
        valid: true
      });
      
      await auth.init();
      
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.user).toEqual(savedUser);
      expect(auth.token).toBe('saved-token');
    });

    it('should clear invalid saved session', async () => {
      mockStorage.data['admin_token_v3'] = 'invalid-token';
      mockStorage.data['admin_user_v3'] = JSON.stringify(builders.user());
      
      mockApi.setMockResponse('POST', '/api/auth/admin/verify', {
        success: true,
        valid: false
      });
      
      await auth.init();
      
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.user).toBeNull();
      expect(mockStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('auth headers', () => {
    it('should provide authorization headers when authenticated', () => {
      auth.token = 'test-token';
      auth.isAuthenticated = true;
      
      const headers = auth.getAuthHeaders();
      
      expect(headers['Authorization']).toBe('Bearer test-token');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should not include auth header when not authenticated', () => {
      auth.isAuthenticated = false;
      
      const headers = auth.getAuthHeaders();
      
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('user permissions', () => {
    it('should check user role', () => {
      auth.user = builders.user({ role: 'admin' });
      
      expect(auth.hasRole('admin')).toBe(true);
      expect(auth.hasRole('user')).toBe(false);
      expect(auth.isAdmin()).toBe(true);
    });

    it('should handle missing user', () => {
      auth.user = null;
      
      expect(auth.hasRole('admin')).toBe(false);
      expect(auth.isAdmin()).toBe(false);
    });
  });
});