/**
 * Lazy Loader Tests
 * 测试模块延迟加载
 */

import { LazyLoader } from '../../_app/lazy-loader.js';

describe('LazyLoader', () => {
  let loader;
  let mockModules;

  beforeEach(() => {
    loader = new LazyLoader();
    
    // Mock dynamic import
    mockModules = {
      '/modules/test.js': { default: { name: 'TestModule' } },
      '/modules/async.js': { default: { name: 'AsyncModule' } },
      '/modules/error.js': null
    };
    
    global.import = jest.fn(path => {
      if (mockModules[path] === null) {
        return Promise.reject(new Error('Module not found'));
      }
      return Promise.resolve(mockModules[path]);
    });
  });

  describe('module loading', () => {
    it('should load module successfully', async () => {
      const module = await loader.load('/modules/test.js');
      
      expect(module).toEqual({ name: 'TestModule' });
      expect(global.import).toHaveBeenCalledWith('/modules/test.js');
    });

    it('should cache loaded modules', async () => {
      const module1 = await loader.load('/modules/test.js');
      const module2 = await loader.load('/modules/test.js');
      
      expect(module1).toBe(module2); // Same reference
      expect(global.import).toHaveBeenCalledTimes(1); // Only loaded once
    });

    it('should handle loading errors', async () => {
      await expect(loader.load('/modules/error.js')).rejects.toThrow('Module not found');
    });

    it('should support custom error handler', async () => {
      const errorHandler = jest.fn();
      loader.setErrorHandler(errorHandler);
      
      try {
        await loader.load('/modules/error.js');
      } catch (e) {
        // Expected
      }
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Module not found'
        }),
        '/modules/error.js'
      );
    });
  });

  describe('preloading', () => {
    it('should preload multiple modules', async () => {
      const paths = ['/modules/test.js', '/modules/async.js'];
      const modules = await loader.preload(paths);
      
      expect(modules).toHaveLength(2);
      expect(modules[0]).toEqual({ name: 'TestModule' });
      expect(modules[1]).toEqual({ name: 'AsyncModule' });
    });

    it('should continue loading despite individual failures', async () => {
      const paths = ['/modules/test.js', '/modules/error.js', '/modules/async.js'];
      const modules = await loader.preload(paths);
      
      expect(modules).toHaveLength(2); // Only successful modules
      expect(modules[0]).toEqual({ name: 'TestModule' });
      expect(modules[1]).toEqual({ name: 'AsyncModule' });
    });

    it('should report preload progress', async () => {
      const progressHandler = jest.fn();
      loader.onProgress(progressHandler);
      
      const paths = ['/modules/test.js', '/modules/async.js'];
      await loader.preload(paths);
      
      expect(progressHandler).toHaveBeenCalledWith({
        loaded: 1,
        total: 2,
        percent: 50,
        current: '/modules/test.js'
      });
      
      expect(progressHandler).toHaveBeenCalledWith({
        loaded: 2,
        total: 2,
        percent: 100,
        current: '/modules/async.js'
      });
    });
  });

  describe('conditional loading', () => {
    it('should load module based on condition', async () => {
      const module = await loader.loadIf(
        () => true,
        '/modules/test.js'
      );
      
      expect(module).toEqual({ name: 'TestModule' });
    });

    it('should skip loading when condition is false', async () => {
      const module = await loader.loadIf(
        () => false,
        '/modules/test.js'
      );
      
      expect(module).toBeNull();
      expect(global.import).not.toHaveBeenCalled();
    });

    it('should support async conditions', async () => {
      const asyncCondition = jest.fn().mockResolvedValue(true);
      
      const module = await loader.loadIf(
        asyncCondition,
        '/modules/test.js'
      );
      
      expect(asyncCondition).toHaveBeenCalled();
      expect(module).toEqual({ name: 'TestModule' });
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed loads', async () => {
      let attempts = 0;
      global.import = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockModules['/modules/test.js']);
      });
      
      loader.setRetryConfig({ maxAttempts: 3, delay: 10 });
      
      const module = await loader.load('/modules/test.js');
      
      expect(module).toEqual({ name: 'TestModule' });
      expect(global.import).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retry attempts', async () => {
      global.import = jest.fn().mockRejectedValue(new Error('Network error'));
      
      loader.setRetryConfig({ maxAttempts: 2, delay: 10 });
      
      await expect(loader.load('/modules/test.js')).rejects.toThrow('Network error');
      expect(global.import).toHaveBeenCalledTimes(2);
    });
  });

  describe('module registry', () => {
    it('should register modules manually', () => {
      const testModule = { name: 'ManualModule' };
      loader.register('/modules/manual.js', testModule);
      
      expect(loader.has('/modules/manual.js')).toBe(true);
      expect(loader.get('/modules/manual.js')).toBe(testModule);
    });

    it('should list all loaded modules', async () => {
      await loader.load('/modules/test.js');
      await loader.load('/modules/async.js');
      loader.register('/modules/manual.js', {});
      
      const modules = loader.getLoadedModules();
      
      expect(modules).toContain('/modules/test.js');
      expect(modules).toContain('/modules/async.js');
      expect(modules).toContain('/modules/manual.js');
      expect(modules).toHaveLength(3);
    });

    it('should clear module cache', async () => {
      await loader.load('/modules/test.js');
      expect(loader.has('/modules/test.js')).toBe(true);
      
      loader.clear('/modules/test.js');
      expect(loader.has('/modules/test.js')).toBe(false);
      
      // Should reload on next request
      await loader.load('/modules/test.js');
      expect(global.import).toHaveBeenCalledTimes(2);
    });

    it('should clear all modules', async () => {
      await loader.load('/modules/test.js');
      await loader.load('/modules/async.js');
      
      loader.clearAll();
      
      expect(loader.getLoadedModules()).toHaveLength(0);
    });
  });

  describe('loading states', () => {
    it('should track loading state', () => {
      const loadPromise = loader.load('/modules/test.js');
      
      expect(loader.isLoading('/modules/test.js')).toBe(true);
      expect(loader.getLoadingCount()).toBe(1);
      
      return loadPromise.then(() => {
        expect(loader.isLoading('/modules/test.js')).toBe(false);
        expect(loader.getLoadingCount()).toBe(0);
      });
    });

    it('should prevent concurrent loads of same module', async () => {
      const promise1 = loader.load('/modules/test.js');
      const promise2 = loader.load('/modules/test.js');
      
      const [module1, module2] = await Promise.all([promise1, promise2]);
      
      expect(module1).toBe(module2);
      expect(global.import).toHaveBeenCalledTimes(1); // Only one actual load
    });
  });

  describe('module dependencies', () => {
    it('should load module with dependencies', async () => {
      mockModules['/modules/with-deps.js'] = {
        default: { name: 'WithDeps' },
        dependencies: ['/modules/dep1.js', '/modules/dep2.js']
      };
      
      mockModules['/modules/dep1.js'] = { default: { name: 'Dep1' } };
      mockModules['/modules/dep2.js'] = { default: { name: 'Dep2' } };
      
      const module = await loader.loadWithDependencies('/modules/with-deps.js');
      
      expect(module).toEqual({ name: 'WithDeps' });
      expect(loader.has('/modules/dep1.js')).toBe(true);
      expect(loader.has('/modules/dep2.js')).toBe(true);
    });
  });

  describe('performance', () => {
    it('should measure load time', async () => {
      const perfHandler = jest.fn();
      loader.onPerformance(perfHandler);
      
      await loader.load('/modules/test.js');
      
      expect(perfHandler).toHaveBeenCalledWith({
        path: '/modules/test.js',
        duration: expect.any(Number),
        cached: false
      });
    });

    it('should report cache hits', async () => {
      const perfHandler = jest.fn();
      loader.onPerformance(perfHandler);
      
      await loader.load('/modules/test.js');
      await loader.load('/modules/test.js');
      
      expect(perfHandler).toHaveBeenLastCalledWith({
        path: '/modules/test.js',
        duration: expect.any(Number),
        cached: true
      });
    });
  });
});