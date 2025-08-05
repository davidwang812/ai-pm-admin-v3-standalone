/**
 * Unified Config Module Tests
 * 测试统一配置管理
 */

import { UnifiedConfigManager } from '../../../_app/modules/unified-config.js';

describe('UnifiedConfigManager', () => {
  let manager;

  beforeEach(() => {
    manager = new UnifiedConfigManager();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      expect(manager.activeProfile).toBe('default');
      expect(manager.configs.size).toBe(0);
      expect(manager.profiles.size).toBe(0);
      expect(manager.cache.size).toBe(0);
      expect(manager.watchers.size).toBe(0);
    });
  });

  describe('basic operations', () => {
    it('should set and get config values', () => {
      manager.set('key1', 'value1');
      expect(manager.get('key1')).toBe('value1');
    });

    it('should return default value when key not found', () => {
      expect(manager.get('nonexistent', 'default')).toBe('default');
    });

    it('should handle different data types', () => {
      manager.set('string', 'hello');
      manager.set('number', 42);
      manager.set('boolean', true);
      manager.set('array', [1, 2, 3]);
      manager.set('object', { a: 1, b: 2 });
      
      expect(manager.get('string')).toBe('hello');
      expect(manager.get('number')).toBe(42);
      expect(manager.get('boolean')).toBe(true);
      expect(manager.get('array')).toEqual([1, 2, 3]);
      expect(manager.get('object')).toEqual({ a: 1, b: 2 });
    });

    it('should delete config values', () => {
      manager.set('key1', 'value1');
      manager.delete('key1');
      expect(manager.get('key1')).toBe(null);
    });

    it('should check if key exists', () => {
      manager.set('key1', 'value1');
      expect(manager.has('key1')).toBe(true);
      expect(manager.has('nonexistent')).toBe(false);
    });
  });

  describe('nested config operations', () => {
    it('should set nested values', () => {
      manager.setNested('app.server.port', 3000);
      
      const app = manager.get('app');
      expect(app).toEqual({
        server: { port: 3000 }
      });
    });

    it('should get nested values', () => {
      manager.set('app', {
        server: {
          port: 3000,
          host: 'localhost'
        }
      });
      
      expect(manager.getNested('app.server.port')).toBe(3000);
      expect(manager.getNested('app.server.host')).toBe('localhost');
    });

    it('should return default for non-existent nested path', () => {
      expect(manager.getNested('app.server.port', 8080)).toBe(8080);
    });

    it('should handle deep nesting', () => {
      manager.setNested('a.b.c.d.e', 'deep');
      expect(manager.getNested('a.b.c.d.e')).toBe('deep');
    });
  });

  describe('profile management', () => {
    it('should create new profile', () => {
      const profile = manager.createProfile('development');
      
      expect(profile.name).toBe('development');
      expect(profile.baseProfile).toBe('default');
      expect(profile.created).toBeInstanceOf(Date);
      expect(manager.profiles.has('development')).toBe(true);
    });

    it('should not allow duplicate profiles', () => {
      manager.createProfile('development');
      
      expect(() => {
        manager.createProfile('development');
      }).toThrow('Profile development already exists');
    });

    it('should copy config when creating profile from base', () => {
      manager.set('key1', 'value1');
      manager.set('key2', { nested: 'value' });
      
      manager.createProfile('development', 'default');
      manager.switchProfile('development');
      
      expect(manager.get('key1')).toBe('value1');
      expect(manager.get('key2')).toEqual({ nested: 'value' });
    });

    it('should switch profiles', () => {
      manager.createProfile('development');
      manager.switchProfile('development');
      
      expect(manager.getCurrentProfile()).toBe('development');
    });

    it('should throw error when switching to non-existent profile', () => {
      expect(() => {
        manager.switchProfile('nonexistent');
      }).toThrow('Profile nonexistent does not exist');
    });

    it('should list all profiles', () => {
      manager.createProfile('development');
      manager.createProfile('staging');
      
      const profiles = manager.getProfiles();
      expect(profiles).toHaveLength(2);
      expect(profiles.map(p => p.name)).toEqual(['development', 'staging']);
    });
  });

  describe('profile inheritance', () => {
    beforeEach(() => {
      manager.set('baseKey', 'baseValue');
      manager.set('overrideKey', 'originalValue');
      manager.createProfile('development', 'default');
    });

    it('should inherit from default profile', () => {
      manager.switchProfile('development');
      expect(manager.get('baseKey')).toBe('baseValue');
    });

    it('should override base profile values', () => {
      manager.switchProfile('development');
      manager.set('overrideKey', 'newValue');
      
      expect(manager.get('overrideKey')).toBe('newValue');
      
      // Base profile should remain unchanged
      manager.switchProfile('default');
      expect(manager.get('overrideKey')).toBe('originalValue');
    });

    it('should fall back to default profile for missing keys', () => {
      manager.switchProfile('development');
      manager.delete('baseKey'); // Delete from development profile
      
      // Should still get value from default profile
      expect(manager.get('baseKey')).toBe('baseValue');
    });
  });

  describe('caching', () => {
    it('should cache get results', () => {
      manager.set('key1', 'value1');
      
      // First call
      manager.get('key1');
      expect(manager.cache.has('default:key1')).toBe(true);
      
      // Second call should use cache
      const spy = jest.spyOn(manager.configs.get('default'), 'get');
      manager.get('key1');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should clear cache when setting value', () => {
      manager.set('key1', 'value1');
      manager.get('key1'); // Cache it
      
      manager.set('key1', 'value2');
      expect(manager.cache.has('default:key1')).toBe(false);
    });

    it('should clear cache when deleting value', () => {
      manager.set('key1', 'value1');
      manager.get('key1'); // Cache it
      
      manager.delete('key1');
      expect(manager.cache.has('default:key1')).toBe(false);
    });

    it('should clear all cache when switching profiles', () => {
      manager.set('key1', 'value1');
      manager.get('key1');
      manager.createProfile('development');
      
      expect(manager.cache.size).toBe(1);
      
      manager.switchProfile('development');
      expect(manager.cache.size).toBe(0);
    });
  });

  describe('watchers', () => {
    it('should notify watchers on value change', () => {
      const watcher = jest.fn();
      manager.watch('key1', watcher);
      
      manager.set('key1', 'value1');
      
      expect(watcher).toHaveBeenCalledWith('value1', undefined, 'key1', 'default');
    });

    it('should notify with old value on update', () => {
      const watcher = jest.fn();
      manager.set('key1', 'oldValue');
      manager.watch('key1', watcher);
      
      manager.set('key1', 'newValue');
      
      expect(watcher).toHaveBeenCalledWith('newValue', 'oldValue', 'key1', 'default');
    });

    it('should unwatch when returned function is called', () => {
      const watcher = jest.fn();
      const unwatch = manager.watch('key1', watcher);
      
      unwatch();
      manager.set('key1', 'value1');
      
      expect(watcher).not.toHaveBeenCalled();
    });

    it('should support multiple watchers', () => {
      const watcher1 = jest.fn();
      const watcher2 = jest.fn();
      
      manager.watch('key1', watcher1);
      manager.watch('key1', watcher2);
      
      manager.set('key1', 'value1');
      
      expect(watcher1).toHaveBeenCalled();
      expect(watcher2).toHaveBeenCalled();
    });

    it('should notify profile change watchers', () => {
      const watcher = jest.fn();
      manager.watch('$profile', watcher);
      manager.createProfile('development');
      
      manager.switchProfile('development');
      
      expect(watcher).toHaveBeenCalledWith('development', 'default', '$profile', 'development');
    });

    it('should handle watcher errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorWatcher = jest.fn().mockImplementation(() => {
        throw new Error('Watcher error');
      });
      const normalWatcher = jest.fn();
      
      manager.watch('key1', errorWatcher);
      manager.watch('key1', normalWatcher);
      
      manager.set('key1', 'value1');
      
      expect(normalWatcher).toHaveBeenCalled(); // Should still call other watchers
      expect(consoleSpy).toHaveBeenCalledWith('Config watcher error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('export/import', () => {
    beforeEach(() => {
      manager.set('key1', 'value1');
      manager.set('key2', { nested: 'value' });
      manager.set('key3', [1, 2, 3]);
    });

    it('should export config as JSON', () => {
      const exported = manager.export();
      const data = JSON.parse(exported);
      
      expect(data).toEqual({
        key1: 'value1',
        key2: { nested: 'value' },
        key3: [1, 2, 3]
      });
    });

    it('should export config as env format', () => {
      manager.set('db', { host: 'localhost', port: 5432 });
      
      const exported = manager.export(null, 'env');
      
      expect(exported).toContain('KEY1=value1');
      expect(exported).toContain('DB_HOST=localhost');
      expect(exported).toContain('DB_PORT=5432');
    });

    it('should export empty profile', () => {
      manager.createProfile('empty');
      const exported = manager.export('empty');
      
      expect(exported).toBe('{}');
    });

    it('should import JSON config', () => {
      const data = {
        imported1: 'value1',
        imported2: { nested: 'value' }
      };
      
      manager.import(JSON.stringify(data));
      
      expect(manager.get('imported1')).toBe('value1');
      expect(manager.get('imported2')).toEqual({ nested: 'value' });
    });

    it('should import object config', () => {
      const data = { imported: 'value' };
      
      manager.import(data);
      
      expect(manager.get('imported')).toBe('value');
    });

    it('should merge imported config', () => {
      manager.import({ newKey: 'newValue' }, null, true);
      
      expect(manager.get('key1')).toBe('value1'); // Original preserved
      expect(manager.get('newKey')).toBe('newValue'); // New added
    });

    it('should replace config when not merging', () => {
      manager.import({ newKey: 'newValue' }, null, false);
      
      expect(manager.get('key1')).toBe(null); // Original gone
      expect(manager.get('newKey')).toBe('newValue'); // New added
    });
  });

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(manager.deepClone('string')).toBe('string');
      expect(manager.deepClone(42)).toBe(42);
      expect(manager.deepClone(true)).toBe(true);
      expect(manager.deepClone(null)).toBe(null);
    });

    it('should clone dates', () => {
      const date = new Date('2025-01-01');
      const cloned = manager.deepClone(date);
      
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date); // Different instance
    });

    it('should clone arrays', () => {
      const arr = [1, { a: 2 }, [3, 4]];
      const cloned = manager.deepClone(arr);
      
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone objects', () => {
      const obj = {
        a: 1,
        b: { c: 2 },
        d: [3, 4],
        e: new Date()
      };
      const cloned = manager.deepClone(obj);
      
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
      expect(cloned.d).not.toBe(obj.d);
      expect(cloned.e).not.toBe(obj.e);
    });
  });

  describe('getSummary', () => {
    it('should return config summary', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');
      manager.get('key1'); // Create cache entry
      manager.watch('key1', jest.fn());
      manager.createProfile('development');
      
      const summary = manager.getSummary();
      
      expect(summary).toEqual({
        activeProfile: 'default',
        profileCount: 1,
        configCount: 2,
        cacheSize: 1,
        watcherCount: 1
      });
    });

    it('should handle empty config', () => {
      const summary = manager.getSummary();
      
      expect(summary).toEqual({
        activeProfile: 'default',
        profileCount: 0,
        configCount: 0,
        cacheSize: 0,
        watcherCount: 0
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values', () => {
      manager.set('nullKey', null);
      manager.set('undefinedKey', undefined);
      
      expect(manager.get('nullKey')).toBe(null);
      expect(manager.get('undefinedKey')).toBe(undefined);
    });

    it('should handle circular references in deepClone', () => {
      const obj = { a: 1 };
      obj.circular = obj;
      
      // Should not throw or infinite loop
      expect(() => manager.deepClone(obj)).not.toThrow();
    });

    it('should handle special characters in keys', () => {
      manager.set('key.with.dots', 'value1');
      manager.set('key:with:colons', 'value2');
      manager.set('key with spaces', 'value3');
      
      expect(manager.get('key.with.dots')).toBe('value1');
      expect(manager.get('key:with:colons')).toBe('value2');
      expect(manager.get('key with spaces')).toBe('value3');
    });
  });
});