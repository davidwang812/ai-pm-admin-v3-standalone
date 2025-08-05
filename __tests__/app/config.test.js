/**
 * Config Tests
 * 测试应用配置模块
 */

import { Config } from '../../_app/config.js';

describe('Config', () => {
  let config;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset environment
    process.env = {};
    
    // Create new config instance
    config = new Config();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('environment detection', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      config = new Config();
      
      expect(config.env).toBe('development');
      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      config = new Config();
      
      expect(config.env).toBe('production');
      expect(config.isDevelopment()).toBe(false);
      expect(config.isProduction()).toBe(true);
    });

    it('should default to development without NODE_ENV', () => {
      delete process.env.NODE_ENV;
      config = new Config();
      
      expect(config.env).toBe('development');
      expect(config.isDevelopment()).toBe(true);
    });
  });

  describe('API configuration', () => {
    it('should use default API URL in development', () => {
      process.env.NODE_ENV = 'development';
      config = new Config();
      
      expect(config.apiBaseUrl).toBe('/api');
      expect(config.apiTimeout).toBe(30000);
    });

    it('should use environment API URL if provided', () => {
      process.env.API_BASE_URL = 'https://api.example.com';
      process.env.API_TIMEOUT = '60000';
      config = new Config();
      
      expect(config.apiBaseUrl).toBe('https://api.example.com');
      expect(config.apiTimeout).toBe(60000);
    });

    it('should build full API endpoints', () => {
      config.apiBaseUrl = 'https://api.example.com';
      
      expect(config.getApiEndpoint('/users')).toBe('https://api.example.com/users');
      expect(config.getApiEndpoint('users')).toBe('https://api.example.com/users');
    });
  });

  describe('feature flags', () => {
    it('should load feature flags from environment', () => {
      process.env.FEATURE_NEW_UI = 'true';
      process.env.FEATURE_BETA_API = 'false';
      config = new Config();
      
      expect(config.isFeatureEnabled('NEW_UI')).toBe(true);
      expect(config.isFeatureEnabled('BETA_API')).toBe(false);
    });

    it('should support default feature flags', () => {
      config.setDefaultFeatureFlags({
        'DARK_MODE': true,
        'ANALYTICS': false
      });
      
      expect(config.isFeatureEnabled('DARK_MODE')).toBe(true);
      expect(config.isFeatureEnabled('ANALYTICS')).toBe(false);
      expect(config.isFeatureEnabled('UNKNOWN')).toBe(false);
    });

    it('should allow runtime feature flag updates', () => {
      config.setFeatureFlag('TEST_FEATURE', true);
      expect(config.isFeatureEnabled('TEST_FEATURE')).toBe(true);
      
      config.setFeatureFlag('TEST_FEATURE', false);
      expect(config.isFeatureEnabled('TEST_FEATURE')).toBe(false);
    });
  });

  describe('version information', () => {
    it('should provide version info', () => {
      expect(config.version).toBeDefined();
      expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should include build info in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.BUILD_ID = 'abc123';
      process.env.BUILD_TIME = '2025-01-01T00:00:00Z';
      config = new Config();
      
      const buildInfo = config.getBuildInfo();
      expect(buildInfo.buildId).toBe('abc123');
      expect(buildInfo.buildTime).toBe('2025-01-01T00:00:00Z');
      expect(buildInfo.version).toBeDefined();
    });
  });

  describe('logging configuration', () => {
    it('should set appropriate log levels', () => {
      // Development
      process.env.NODE_ENV = 'development';
      config = new Config();
      expect(config.logLevel).toBe('debug');
      
      // Production
      process.env.NODE_ENV = 'production';
      config = new Config();
      expect(config.logLevel).toBe('error');
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'warn';
      config = new Config();
      
      expect(config.logLevel).toBe('warn');
    });
  });

  describe('security configuration', () => {
    it('should enforce HTTPS in production', () => {
      process.env.NODE_ENV = 'production';
      config = new Config();
      
      expect(config.requireHttps).toBe(true);
      expect(config.secureCookies).toBe(true);
    });

    it('should allow HTTP in development', () => {
      process.env.NODE_ENV = 'development';
      config = new Config();
      
      expect(config.requireHttps).toBe(false);
      expect(config.secureCookies).toBe(false);
    });

    it('should configure CORS settings', () => {
      process.env.CORS_ORIGIN = 'https://app.example.com';
      config = new Config();
      
      expect(config.corsOrigin).toBe('https://app.example.com');
      expect(config.corsCredentials).toBe(true);
    });
  });

  describe('performance configuration', () => {
    it('should set cache durations', () => {
      expect(config.cacheMaxAge).toBe(300); // 5 minutes default
      expect(config.staticCacheMaxAge).toBe(86400); // 1 day for static assets
    });

    it('should configure request limits', () => {
      expect(config.maxRequestSize).toBe('10mb');
      expect(config.uploadLimit).toBe('50mb');
    });

    it('should set rate limiting', () => {
      const rateLimits = config.getRateLimits();
      
      expect(rateLimits.api).toEqual({
        windowMs: 60000,
        max: 100
      });
      
      expect(rateLimits.auth).toEqual({
        windowMs: 900000,
        max: 5
      });
    });
  });

  describe('configuration validation', () => {
    it('should validate required settings', () => {
      const errors = config.validate();
      
      expect(errors).toEqual([]);
    });

    it('should report missing required environment variables', () => {
      config.requiredEnvVars = ['API_KEY', 'DATABASE_URL'];
      
      const errors = config.validate();
      
      expect(errors).toContain('Missing required environment variable: API_KEY');
      expect(errors).toContain('Missing required environment variable: DATABASE_URL');
    });
  });

  describe('configuration export', () => {
    it('should export safe configuration for client', () => {
      process.env.API_KEY = 'secret-key';
      config = new Config();
      config.apiBaseUrl = '/api';
      config.version = '1.0.0';
      
      const clientConfig = config.getClientConfig();
      
      expect(clientConfig.apiBaseUrl).toBe('/api');
      expect(clientConfig.version).toBe('1.0.0');
      expect(clientConfig.API_KEY).toBeUndefined(); // Should not include secrets
    });

    it('should export full configuration for debugging', () => {
      const fullConfig = config.toJSON();
      
      expect(fullConfig).toHaveProperty('env');
      expect(fullConfig).toHaveProperty('apiBaseUrl');
      expect(fullConfig).toHaveProperty('version');
      expect(fullConfig).toHaveProperty('features');
    });
  });
});