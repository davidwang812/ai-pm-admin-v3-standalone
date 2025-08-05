/**
 * 缓存系统测试
 */

import { jest } from '@jest/globals';

describe('CacheManager', () => {
  let CacheManager;
  let cacheManager;

  beforeEach(async () => {
    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };

    // Mock performance.now
    global.performance = {
      now: jest.fn(() => Date.now())
    };

    const module = await import('../../_core/cache.js');
    CacheManager = module.CacheManager;
    cacheManager = new CacheManager({
      maxSize: 100,
      ttl: 3600000, // 1小时
      storage: 'memory' // 使用内存存储进行测试
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    cacheManager.clear();
  });

  describe('基础功能', () => {
    test('应该正确初始化', () => {
      expect(cacheManager).toBeDefined();
      expect(cacheManager.cache).toEqual({});
      expect(cacheManager.metadata).toEqual({});
      expect(cacheManager.config.maxSize).toBe(100);
      expect(cacheManager.config.ttl).toBe(3600000);
    });

    test('应该设置和获取缓存', () => {
      cacheManager.set('key1', 'value1');
      expect(cacheManager.get('key1')).toBe('value1');
    });

    test('应该支持对象缓存', () => {
      const obj = { name: 'test', data: [1, 2, 3] };
      cacheManager.set('obj', obj);
      
      const retrieved = cacheManager.get('obj');
      expect(retrieved).toEqual(obj);
      // 确保是深拷贝
      expect(retrieved).not.toBe(obj);
    });

    test('应该检查缓存是否存在', () => {
      cacheManager.set('exists', 'value');
      
      expect(cacheManager.has('exists')).toBe(true);
      expect(cacheManager.has('not-exists')).toBe(false);
    });

    test('应该删除缓存', () => {
      cacheManager.set('temp', 'value');
      expect(cacheManager.has('temp')).toBe(true);
      
      cacheManager.delete('temp');
      expect(cacheManager.has('temp')).toBe(false);
    });

    test('应该清除所有缓存', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');
      
      cacheManager.clear();
      
      expect(cacheManager.size()).toBe(0);
      expect(cacheManager.get('key1')).toBeUndefined();
    });
  });

  describe('TTL功能', () => {
    test('应该在TTL过期后返回undefined', () => {
      const shortTTLCache = new CacheManager({ ttl: 100 }); // 100ms
      
      shortTTLCache.set('expire', 'value');
      expect(shortTTLCache.get('expire')).toBe('value');
      
      // 模拟时间流逝
      jest.advanceTimersByTime(200);
      
      expect(shortTTLCache.get('expire')).toBeUndefined();
    });

    test('应该支持自定义TTL', () => {
      cacheManager.set('custom-ttl', 'value', { ttl: 1000 }); // 1秒
      
      expect(cacheManager.get('custom-ttl')).toBe('value');
      
      // 500ms后仍然有效
      jest.advanceTimersByTime(500);
      expect(cacheManager.get('custom-ttl')).toBe('value');
      
      // 1500ms后过期
      jest.advanceTimersByTime(1000);
      expect(cacheManager.get('custom-ttl')).toBeUndefined();
    });

    test('应该支持永不过期的缓存', () => {
      cacheManager.set('permanent', 'value', { ttl: Infinity });
      
      // 模拟很长时间
      jest.advanceTimersByTime(Number.MAX_SAFE_INTEGER);
      
      expect(cacheManager.get('permanent')).toBe('value');
    });
  });

  describe('大小限制', () => {
    test('应该遵守最大缓存数量限制', () => {
      const limitedCache = new CacheManager({ maxSize: 3 });
      
      limitedCache.set('key1', 'value1');
      limitedCache.set('key2', 'value2');
      limitedCache.set('key3', 'value3');
      limitedCache.set('key4', 'value4'); // 应该触发LRU淘汰
      
      expect(limitedCache.size()).toBe(3);
      expect(limitedCache.has('key1')).toBe(false); // 最早的被淘汰
      expect(limitedCache.has('key4')).toBe(true);
    });

    test('应该实现LRU淘汰策略', () => {
      const lruCache = new CacheManager({ maxSize: 3 });
      
      lruCache.set('a', 1);
      lruCache.set('b', 2);
      lruCache.set('c', 3);
      
      // 访问'a'，使其变为最近使用
      lruCache.get('a');
      
      // 添加新项，'b'应该被淘汰（最久未使用）
      lruCache.set('d', 4);
      
      expect(lruCache.has('a')).toBe(true);
      expect(lruCache.has('b')).toBe(false);
      expect(lruCache.has('c')).toBe(true);
      expect(lruCache.has('d')).toBe(true);
    });
  });

  describe('统计功能', () => {
    test('应该跟踪缓存命中率', () => {
      cacheManager.set('hit', 'value');
      
      // 2次命中
      cacheManager.get('hit');
      cacheManager.get('hit');
      
      // 3次未命中
      cacheManager.get('miss1');
      cacheManager.get('miss2');
      cacheManager.get('miss3');
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBe(0.4); // 2/5 = 0.4
    });

    test('应该提供缓存元数据', () => {
      cacheManager.set('meta-test', 'value');
      
      const metadata = cacheManager.getMetadata('meta-test');
      expect(metadata).toMatchObject({
        createdAt: expect.any(Number),
        lastAccessed: expect.any(Number),
        accessCount: 0,
        size: expect.any(Number)
      });
    });

    test('应该更新访问计数', () => {
      cacheManager.set('count-test', 'value');
      
      cacheManager.get('count-test');
      cacheManager.get('count-test');
      cacheManager.get('count-test');
      
      const metadata = cacheManager.getMetadata('count-test');
      expect(metadata.accessCount).toBe(3);
    });
  });

  describe('批量操作', () => {
    test('应该支持批量设置', () => {
      cacheManager.mset({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      });
      
      expect(cacheManager.get('key1')).toBe('value1');
      expect(cacheManager.get('key2')).toBe('value2');
      expect(cacheManager.get('key3')).toBe('value3');
    });

    test('应该支持批量获取', () => {
      cacheManager.set('a', 1);
      cacheManager.set('b', 2);
      cacheManager.set('c', 3);
      
      const values = cacheManager.mget(['a', 'b', 'c', 'd']);
      
      expect(values).toEqual({
        a: 1,
        b: 2,
        c: 3,
        d: undefined
      });
    });

    test('应该支持批量删除', () => {
      cacheManager.set('del1', 'value1');
      cacheManager.set('del2', 'value2');
      cacheManager.set('keep', 'value3');
      
      cacheManager.mdel(['del1', 'del2']);
      
      expect(cacheManager.has('del1')).toBe(false);
      expect(cacheManager.has('del2')).toBe(false);
      expect(cacheManager.has('keep')).toBe(true);
    });
  });

  describe('高级功能', () => {
    test('应该支持缓存预热', async () => {
      const loader = jest.fn().mockResolvedValue({
        preload1: 'value1',
        preload2: 'value2'
      });
      
      await cacheManager.warmup(loader);
      
      expect(loader).toHaveBeenCalled();
      expect(cacheManager.get('preload1')).toBe('value1');
      expect(cacheManager.get('preload2')).toBe('value2');
    });

    test('应该支持懒加载', async () => {
      const loader = jest.fn().mockResolvedValue('loaded-value');
      
      // 第一次调用，触发加载
      const value1 = await cacheManager.getOrLoad('lazy-key', loader);
      expect(value1).toBe('loaded-value');
      expect(loader).toHaveBeenCalledTimes(1);
      
      // 第二次调用，从缓存获取
      const value2 = await cacheManager.getOrLoad('lazy-key', loader);
      expect(value2).toBe('loaded-value');
      expect(loader).toHaveBeenCalledTimes(1); // 没有再次调用
    });

    test('应该支持缓存更新', () => {
      cacheManager.set('update', 'old-value');
      
      const updated = cacheManager.update('update', (oldValue) => {
        return oldValue + '-updated';
      });
      
      expect(updated).toBe('old-value-updated');
      expect(cacheManager.get('update')).toBe('old-value-updated');
    });

    test('应该支持条件设置', () => {
      // 只在不存在时设置
      cacheManager.setIfAbsent('new-key', 'value1');
      expect(cacheManager.get('new-key')).toBe('value1');
      
      // 已存在，不应该覆盖
      cacheManager.setIfAbsent('new-key', 'value2');
      expect(cacheManager.get('new-key')).toBe('value1');
    });
  });

  describe('持久化功能', () => {
    test('应该支持导出缓存', () => {
      cacheManager.set('export1', 'value1');
      cacheManager.set('export2', 'value2');
      
      const exported = cacheManager.export();
      
      expect(exported).toMatchObject({
        version: expect.any(String),
        timestamp: expect.any(Number),
        data: {
          export1: { value: 'value1', metadata: expect.any(Object) },
          export2: { value: 'value2', metadata: expect.any(Object) }
        }
      });
    });

    test('应该支持导入缓存', () => {
      const importData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          import1: {
            value: 'value1',
            metadata: {
              createdAt: Date.now(),
              ttl: 3600000
            }
          },
          import2: {
            value: 'value2',
            metadata: {
              createdAt: Date.now(),
              ttl: 3600000
            }
          }
        }
      };
      
      cacheManager.import(importData);
      
      expect(cacheManager.get('import1')).toBe('value1');
      expect(cacheManager.get('import2')).toBe('value2');
    });
  });

  describe('LocalStorage集成', () => {
    test('应该支持localStorage存储', () => {
      const storageCache = new CacheManager({ storage: 'localStorage' });
      
      storageCache.set('storage-key', 'storage-value');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cache_storage-key',
        expect.any(String)
      );
    });

    test('应该从localStorage恢复', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({
        value: 'restored-value',
        metadata: {
          createdAt: Date.now(),
          ttl: 3600000
        }
      }));
      
      const storageCache = new CacheManager({ storage: 'localStorage' });
      const value = storageCache.get('restored-key');
      
      expect(localStorage.getItem).toHaveBeenCalledWith('cache_restored-key');
      expect(value).toBe('restored-value');
    });
  });
});