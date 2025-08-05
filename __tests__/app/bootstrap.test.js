/**
 * Bootstrap Tests
 * 测试应用程序初始化
 */

import { Bootstrap } from '../../_app/bootstrap.js';
import { createMockDocument, createMockWindow } from '../helpers/dom-mocks.js';

describe('Bootstrap', () => {
  let bootstrap;
  let mockDocument;
  let mockWindow;
  let mockApp;

  beforeEach(() => {
    // Setup DOM mocks
    mockDocument = createMockDocument();
    mockWindow = createMockWindow();
    
    // Create app content element
    const appElement = mockDocument.createElement('div');
    appElement.id = 'app';
    mockDocument._registerElement('#app', appElement);
    
    // Create loading screen
    const loadingScreen = mockDocument.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.style.display = 'block';
    mockDocument._registerElement('#loading-screen', loadingScreen);
    
    // Set globals
    global.document = mockDocument;
    global.window = mockWindow;
    
    // Mock app instance
    mockApp = {
      init: jest.fn().mockResolvedValue(true),
      config: {}
    };
    
    // Create bootstrap instance
    bootstrap = new Bootstrap();
  });

  afterEach(() => {
    mockDocument._reset();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const result = await bootstrap.init();
      
      expect(result).toBe(true);
      expect(bootstrap.initialized).toBe(true);
    });

    it('should detect environment correctly', () => {
      // Test localhost
      mockWindow.location.hostname = 'localhost';
      expect(bootstrap.detectEnvironment()).toBe('development');
      
      // Test production
      mockWindow.location.hostname = 'app.example.com';
      expect(bootstrap.detectEnvironment()).toBe('production');
      
      // Test with explicit env
      mockWindow.ADMIN_ENV = 'staging';
      expect(bootstrap.detectEnvironment()).toBe('staging');
    });

    it('should load configuration', async () => {
      const config = await bootstrap.loadConfig();
      
      expect(config).toHaveProperty('apiBaseUrl');
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('environment');
    });
  });

  describe('module preloading', () => {
    it('should preload critical modules', async () => {
      const modules = await bootstrap.preloadModules();
      
      expect(modules).toBeInstanceOf(Array);
      expect(modules.length).toBeGreaterThan(0);
      
      // Should include critical modules
      const moduleNames = modules.map(m => m.name);
      expect(moduleNames).toContain('api-client');
      expect(moduleNames).toContain('auth');
      expect(moduleNames).toContain('router');
    });

    it('should handle module load failures gracefully', async () => {
      // Mock a module that fails to load
      bootstrap.criticalModules = [
        { name: 'failing-module', path: './non-existent.js' }
      ];
      
      const modules = await bootstrap.preloadModules();
      
      // Should not throw, just return empty array or partial results
      expect(modules).toBeInstanceOf(Array);
    });
  });

  describe('UI transitions', () => {
    it('should hide loading screen', async () => {
      const loadingScreen = mockDocument.getElementById('loading-screen');
      expect(loadingScreen.style.display).toBe('block');
      
      await bootstrap.hideLoadingScreen();
      
      expect(loadingScreen.style.display).toBe('none');
    });

    it('should show main app', async () => {
      const app = mockDocument.getElementById('app');
      app.style.display = 'none';
      
      await bootstrap.showMainApp();
      
      expect(app.style.display).toBe('block');
    });

    it('should handle missing elements gracefully', async () => {
      // Remove loading screen
      mockDocument._reset();
      
      // Should not throw
      await expect(bootstrap.hideLoadingScreen()).resolves.not.toThrow();
      await expect(bootstrap.showMainApp()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should show error screen on initialization failure', async () => {
      // Mock init to fail
      bootstrap.loadConfig = jest.fn().mockRejectedValue(new Error('Config load failed'));
      
      const result = await bootstrap.init();
      
      expect(result).toBe(false);
      expect(bootstrap.initialized).toBe(false);
      
      // Should show error in app element
      const app = mockDocument.getElementById('app');
      expect(app.innerHTML).toContain('error');
    });

    it('should handle network errors', async () => {
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const config = await bootstrap.loadConfig();
      
      // Should return default config
      expect(config).toHaveProperty('apiBaseUrl');
      expect(config.environment).toBeDefined();
    });
  });

  describe('performance monitoring', () => {
    it('should track loading time', async () => {
      const startTime = Date.now();
      
      await bootstrap.init();
      
      expect(bootstrap.loadTime).toBeGreaterThan(0);
      expect(bootstrap.loadTime).toBeLessThan(5000); // Should load in less than 5s
    });

    it('should emit performance metrics', async () => {
      const metricsHandler = jest.fn();
      bootstrap.on('metrics', metricsHandler);
      
      await bootstrap.init();
      
      expect(metricsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          loadTime: expect.any(Number),
          modulesLoaded: expect.any(Number)
        })
      );
    });
  });

  describe('event handling', () => {
    it('should emit ready event when initialized', async () => {
      const readyHandler = jest.fn();
      bootstrap.on('ready', readyHandler);
      
      await bootstrap.init();
      
      expect(readyHandler).toHaveBeenCalled();
    });

    it('should emit error event on failure', async () => {
      const errorHandler = jest.fn();
      bootstrap.on('error', errorHandler);
      
      bootstrap.loadConfig = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await bootstrap.init();
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error'
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      bootstrap.destroy();
      
      expect(bootstrap.initialized).toBe(false);
      expect(bootstrap.modules.size).toBe(0);
    });

    it('should remove event listeners', () => {
      const handler = jest.fn();
      bootstrap.on('ready', handler);
      
      bootstrap.destroy();
      bootstrap.emit('ready'); // Should not call handler
      
      expect(handler).not.toHaveBeenCalled();
    });
  });
});