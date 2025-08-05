/**
 * 状态管理测试
 */

import { jest } from '@jest/globals';

describe('StateManager', () => {
  let StateManager;
  let stateManager;

  beforeEach(async () => {
    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };

    const module = await import('../../_core/state.js');
    StateManager = module.StateManager;
    stateManager = new StateManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础功能', () => {
    test('应该正确初始化', () => {
      expect(stateManager).toBeDefined();
      expect(stateManager.state).toEqual({});
      expect(stateManager.listeners).toEqual({});
    });

    test('应该设置和获取状态', () => {
      stateManager.set('user', { id: 1, name: 'Test' });
      expect(stateManager.get('user')).toEqual({ id: 1, name: 'Test' });
    });

    test('应该获取嵌套路径的值', () => {
      stateManager.set('app', {
        config: {
          theme: 'dark',
          language: 'zh-CN'
        }
      });

      expect(stateManager.get('app.config.theme')).toBe('dark');
      expect(stateManager.get('app.config.language')).toBe('zh-CN');
    });

    test('应该返回undefined对于不存在的键', () => {
      expect(stateManager.get('nonexistent')).toBeUndefined();
    });

    test('应该删除状态', () => {
      stateManager.set('temp', 'value');
      expect(stateManager.get('temp')).toBe('value');
      
      stateManager.remove('temp');
      expect(stateManager.get('temp')).toBeUndefined();
    });

    test('应该清除所有状态', () => {
      stateManager.set('key1', 'value1');
      stateManager.set('key2', 'value2');
      
      stateManager.clear();
      
      expect(stateManager.get('key1')).toBeUndefined();
      expect(stateManager.get('key2')).toBeUndefined();
      expect(stateManager.state).toEqual({});
    });
  });

  describe('监听器功能', () => {
    test('应该添加和触发监听器', () => {
      const listener = jest.fn();
      stateManager.on('user', listener);
      
      stateManager.set('user', { id: 1 });
      
      expect(listener).toHaveBeenCalledWith(
        { id: 1 },
        undefined,
        'user'
      );
    });

    test('应该支持多个监听器', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      stateManager.on('data', listener1);
      stateManager.on('data', listener2);
      
      stateManager.set('data', 'value');
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    test('应该移除监听器', () => {
      const listener = jest.fn();
      stateManager.on('test', listener);
      
      stateManager.off('test', listener);
      stateManager.set('test', 'value');
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('应该监听嵌套路径的变化', () => {
      const listener = jest.fn();
      stateManager.on('app.config.theme', listener);
      
      stateManager.set('app', {
        config: {
          theme: 'light'
        }
      });
      
      expect(listener).toHaveBeenCalledWith('light', undefined, 'app.config.theme');
    });
  });

  describe('持久化功能', () => {
    test('应该保存状态到localStorage', () => {
      stateManager.set('persistent', { data: 'value' }, { persist: true });
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'adminV3_state_persistent',
        JSON.stringify({ data: 'value' })
      );
    });

    test('应该从localStorage加载状态', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify({ data: 'loaded' }));
      
      stateManager.loadFromStorage('persistent');
      
      expect(stateManager.get('persistent')).toEqual({ data: 'loaded' });
    });

    test('应该处理localStorage错误', () => {
      localStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => stateManager.loadFromStorage('key')).not.toThrow();
    });
  });

  describe('批量操作', () => {
    test('应该批量设置状态', () => {
      const listener = jest.fn();
      stateManager.on('batch', listener);
      
      stateManager.batch(() => {
        stateManager.set('key1', 'value1');
        stateManager.set('key2', 'value2');
        stateManager.set('key3', 'value3');
      });
      
      // 批量操作应该只触发一次更新
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('应该合并状态', () => {
      stateManager.set('config', {
        theme: 'dark',
        language: 'en'
      });
      
      stateManager.merge('config', {
        language: 'zh-CN',
        fontSize: 14
      });
      
      expect(stateManager.get('config')).toEqual({
        theme: 'dark',
        language: 'zh-CN',
        fontSize: 14
      });
    });
  });

  describe('计算属性', () => {
    test('应该支持计算属性', () => {
      stateManager.set('firstName', 'John');
      stateManager.set('lastName', 'Doe');
      
      stateManager.computed('fullName', ['firstName', 'lastName'], (firstName, lastName) => {
        return `${firstName} ${lastName}`;
      });
      
      expect(stateManager.get('fullName')).toBe('John Doe');
    });

    test('应该在依赖变化时更新计算属性', () => {
      stateManager.set('price', 100);
      stateManager.set('quantity', 2);
      
      stateManager.computed('total', ['price', 'quantity'], (price, quantity) => {
        return price * quantity;
      });
      
      expect(stateManager.get('total')).toBe(200);
      
      stateManager.set('quantity', 3);
      expect(stateManager.get('total')).toBe(300);
    });
  });

  describe('调试功能', () => {
    test('应该提供状态快照', () => {
      stateManager.set('key1', 'value1');
      stateManager.set('key2', { nested: 'value2' });
      
      const snapshot = stateManager.getSnapshot();
      
      expect(snapshot).toEqual({
        key1: 'value1',
        key2: { nested: 'value2' }
      });
      
      // 快照应该是深拷贝
      snapshot.key1 = 'modified';
      expect(stateManager.get('key1')).toBe('value1');
    });

    test('应该提供状态历史', () => {
      stateManager.enableHistory();
      
      stateManager.set('counter', 1);
      stateManager.set('counter', 2);
      stateManager.set('counter', 3);
      
      const history = stateManager.getHistory();
      expect(history.length).toBe(3);
      
      // 撤销
      stateManager.undo();
      expect(stateManager.get('counter')).toBe(2);
      
      // 重做
      stateManager.redo();
      expect(stateManager.get('counter')).toBe(3);
    });
  });
});