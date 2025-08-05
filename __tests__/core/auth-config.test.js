/**
 * Auth Config Tests
 * 测试认证配置模块
 */

import { AuthConfig } from '../../_core/auth-config.js';

describe('AuthConfig', () => {
  let config;

  beforeEach(() => {
    // Reset config for each test
    config = new AuthConfig();
  });

  describe('initialization', () => {
    it('should load default configuration', () => {
      expect(config.tokenKey).toBe('admin_token_v3');
      expect(config.userKey).toBe('admin_user_v3');
      expect(config.tokenExpiry).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
    });

    it('should accept custom configuration', () => {
      const customConfig = new AuthConfig({
        tokenKey: 'custom_token',
        userKey: 'custom_user',
        tokenExpiry: 3600000 // 1 hour
      });

      expect(customConfig.tokenKey).toBe('custom_token');
      expect(customConfig.userKey).toBe('custom_user');
      expect(customConfig.tokenExpiry).toBe(3600000);
    });
  });

  describe('token validation', () => {
    it('should validate token format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const invalidToken = 'invalid-token-format';

      expect(config.isValidTokenFormat(validToken)).toBe(true);
      expect(config.isValidTokenFormat(invalidToken)).toBe(false);
      expect(config.isValidTokenFormat('')).toBe(false);
      expect(config.isValidTokenFormat(null)).toBe(false);
    });
  });

  describe('auth endpoints', () => {
    it('should provide correct endpoint URLs', () => {
      expect(config.getLoginEndpoint()).toBe('/api/auth/admin/login');
      expect(config.getLogoutEndpoint()).toBe('/api/auth/admin/logout');
      expect(config.getRefreshEndpoint()).toBe('/api/auth/admin/refresh');
      expect(config.getVerifyEndpoint()).toBe('/api/auth/admin/verify');
    });

    it('should support custom API base URL', () => {
      const customConfig = new AuthConfig({
        apiBaseUrl: 'https://api.example.com'
      });

      expect(customConfig.getLoginEndpoint()).toBe('https://api.example.com/api/auth/admin/login');
    });
  });

  describe('security settings', () => {
    it('should have secure defaults', () => {
      expect(config.requireHttps).toBe(true);
      expect(config.sameSite).toBe('strict');
      expect(config.httpOnly).toBe(true);
    });

    it('should allow localhost without HTTPS in development', () => {
      const devConfig = new AuthConfig({
        environment: 'development'
      });

      expect(devConfig.requireHttps).toBe(false);
    });
  });

  describe('token expiry', () => {
    it('should calculate token expiry correctly', () => {
      const now = Date.now();
      const expiryTime = config.getTokenExpiryTime();
      
      expect(expiryTime).toBeGreaterThan(now);
      expect(expiryTime - now).toBe(config.tokenExpiry);
    });

    it('should check if token is expired', () => {
      const expiredTime = Date.now() - 1000; // 1 second ago
      const validTime = Date.now() + 3600000; // 1 hour from now

      expect(config.isTokenExpired(expiredTime)).toBe(true);
      expect(config.isTokenExpired(validTime)).toBe(false);
    });
  });

  describe('storage keys', () => {
    it('should generate namespaced storage keys', () => {
      expect(config.getStorageKey('test')).toBe('admin_v3_test');
      expect(config.getStorageKey('session')).toBe('admin_v3_session');
    });

    it('should handle empty key names', () => {
      expect(config.getStorageKey('')).toBe('admin_v3_');
      expect(config.getStorageKey(null)).toBe('admin_v3_null');
    });
  });

  describe('CORS configuration', () => {
    it('should provide CORS headers', () => {
      const headers = config.getCORSHeaders();
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
    });

    it('should include credentials for same-origin requests', () => {
      const options = config.getFetchOptions();
      
      expect(options.credentials).toBe('same-origin');
      expect(options.mode).toBe('cors');
    });
  });
});