/**
 * Cache Module  
 * V3分层缓存系统 - Memory/SessionStorage/IndexedDB/Vercel KV
 */

export class LayeredCache {
  constructor() {
    // L1: 内存缓存
    this.memory = new Map();
    this.memoryLimit = 100; // 最大100个条目
    
    // L2: SessionStorage
    this.session = window.sessionStorage;
    
    // L3: IndexedDB
    this.db = null;
    this.dbName = 'AdminV3Cache';
    this.dbVersion = 1;
    this.initIndexedDB();
    
    // 缓存策略配置
    this.strategies = {
      catalog: { 
        layers: ['memory', 'session', 'indexeddb'], 
        ttl: 24 * 60 * 60 * 1000 // 24小时
      },
      config: { 
        layers: ['memory', 'session', 'indexeddb'], 
        ttl: 60 * 60 * 1000 // 1小时
      },
      providers: { 
        layers: ['memory', 'indexeddb'], 
        ttl: 5 * 60 * 1000 // 5分钟
      },
      analytics: { 
        layers: ['memory'], 
        ttl: 60 * 1000 // 1分钟
      },
      user: {
        layers: ['memory', 'session'],
        ttl: 30 * 60 * 1000 // 30分钟
      }
    };
    
    // 缓存统计
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * 初始化IndexedDB
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('IndexedDB initialization failed');
        resolve(); // 继续运行，即使IndexedDB失败
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * 获取缓存
   */
  async get(type, key) {
    const fullKey = this.buildKey(type, key);
    const strategy = this.strategies[type] || { layers: ['memory'], ttl: 60000 };
    
    // 依次从各层查找
    for (const layer of strategy.layers) {
      const value = await this.getFromLayer(layer, fullKey);
      
      if (value && !this.isExpired(value, strategy.ttl)) {
        this.stats.hits++;
        console.log(`✅ Cache hit [${layer}]: ${fullKey}`);
        
        // 提升到更高层缓存
        await this.promote(fullKey, value, strategy.layers, layer);
        
        return value.data;
      }
    }
    
    this.stats.misses++;
    console.log(`❌ Cache miss: ${fullKey}`);
    return null;
  }

  /**
   * 设置缓存
   */
  async set(type, key, data) {
    const fullKey = this.buildKey(type, key);
    const strategy = this.strategies[type] || { layers: ['memory'], ttl: 60000 };
    
    const wrapper = {
      data,
      timestamp: Date.now(),
      type,
      key: fullKey
    };
    
    this.stats.sets++;
    
    // 写入所有配置的层
    for (const layer of strategy.layers) {
      await this.setToLayer(layer, fullKey, wrapper);
    }
    
    console.log(`💾 Cache set [${strategy.layers.join(',')}]: ${fullKey}`);
  }

  /**
   * 删除缓存
   */
  async delete(type, key) {
    const fullKey = this.buildKey(type, key);
    const strategy = this.strategies[type] || { layers: ['memory'] };
    
    this.stats.deletes++;
    
    // 从所有层删除
    for (const layer of strategy.layers) {
      await this.deleteFromLayer(layer, fullKey);
    }
    
    console.log(`🗑️ Cache deleted: ${fullKey}`);
  }

  /**
   * 清空缓存
   */
  async clear(type = null) {
    if (type) {
      // 清空特定类型
      const prefix = `v3:${type}:`;
      
      // Memory
      for (const key of this.memory.keys()) {
        if (key.startsWith(prefix)) {
          this.memory.delete(key);
        }
      }
      
      // SessionStorage
      for (let i = 0; i < this.session.length; i++) {
        const key = this.session.key(i);
        if (key && key.startsWith(prefix)) {
          this.session.removeItem(key);
          i--;
        }
      }
      
      // IndexedDB
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const index = store.index('type');
        const request = index.openCursor(IDBKeyRange.only(type));
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      }
      
    } else {
      // 清空所有
      this.memory.clear();
      this.session.clear();
      
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.clear();
      }
    }
    
    console.log('🧹 Cache cleared' + (type ? `: ${type}` : ' (all)'));
  }

  /**
   * 从指定层获取
   */
  async getFromLayer(layer, key) {
    switch (layer) {
      case 'memory':
        return this.memory.get(key);
        
      case 'session':
        try {
          const data = this.session.getItem(key);
          return data ? JSON.parse(data) : null;
        } catch (e) {
          return null;
        }
        
      case 'indexeddb':
        if (!this.db) return null;
        return await this.getFromIndexedDB(key);
        
      default:
        return null;
    }
  }

  /**
   * 写入指定层
   */
  async setToLayer(layer, key, value) {
    switch (layer) {
      case 'memory':
        // 检查内存限制
        if (this.memory.size >= this.memoryLimit) {
          // 删除最旧的条目
          const firstKey = this.memory.keys().next().value;
          this.memory.delete(firstKey);
        }
        this.memory.set(key, value);
        break;
        
      case 'session':
        try {
          this.session.setItem(key, JSON.stringify(value));
        } catch (e) {
          // SessionStorage满了，清理旧数据
          console.warn('SessionStorage full, clearing old entries');
          this.clearOldSessionEntries();
          try {
            this.session.setItem(key, JSON.stringify(value));
          } catch (e2) {
            console.error('Failed to write to SessionStorage');
          }
        }
        break;
        
      case 'indexeddb':
        if (this.db) {
          await this.setToIndexedDB(key, value);
        }
        break;
    }
  }

  /**
   * 从指定层删除
   */
  async deleteFromLayer(layer, key) {
    switch (layer) {
      case 'memory':
        this.memory.delete(key);
        break;
        
      case 'session':
        this.session.removeItem(key);
        break;
        
      case 'indexeddb':
        if (this.db) {
          await this.deleteFromIndexedDB(key);
        }
        break;
    }
  }

  /**
   * IndexedDB读取
   */
  async getFromIndexedDB(key) {
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * IndexedDB写入
   */
  async setToIndexedDB(key, value) {
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const request = store.put(value);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * IndexedDB删除
   */
  async deleteFromIndexedDB(key) {
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const request = store.delete(key);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * 提升缓存到更高层
   */
  async promote(key, value, layers, currentLayer) {
    const currentIndex = layers.indexOf(currentLayer);
    if (currentIndex <= 0) return;
    
    // 提升到所有更高层
    for (let i = 0; i < currentIndex; i++) {
      await this.setToLayer(layers[i], key, value);
    }
  }

  /**
   * 构建缓存键
   */
  buildKey(type, key) {
    return `v3:${type}:${key}`;
  }

  /**
   * 检查是否过期
   */
  isExpired(wrapper, ttl) {
    if (!wrapper.timestamp) return true;
    return Date.now() > wrapper.timestamp + ttl;
  }

  /**
   * 清理旧的Session条目
   */
  clearOldSessionEntries() {
    const entries = [];
    
    // 收集所有条目
    for (let i = 0; i < this.session.length; i++) {
      const key = this.session.key(i);
      if (key && key.startsWith('v3:')) {
        try {
          const value = JSON.parse(this.session.getItem(key));
          entries.push({ key, timestamp: value.timestamp || 0 });
        } catch (e) {
          // 删除无效条目
          this.session.removeItem(key);
          i--;
        }
      }
    }
    
    // 按时间戳排序
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // 删除最旧的50%
    const deleteCount = Math.floor(entries.length / 2);
    for (let i = 0; i < deleteCount; i++) {
      this.session.removeItem(entries[i].key);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      memorySize: this.memory.size,
      sessionSize: this.session.length
    };
  }

  /**
   * 预热缓存
   */
  async warmup(items) {
    console.log('🔥 Cache warmup starting...');
    
    for (const item of items) {
      await this.set(item.type, item.key, item.data);
    }
    
    console.log(`✅ Cache warmup completed: ${items.length} items`);
  }

  /**
   * 导出缓存数据
   */
  async export() {
    const data = {
      memory: Array.from(this.memory.entries()),
      session: {},
      indexeddb: []
    };
    
    // SessionStorage
    for (let i = 0; i < this.session.length; i++) {
      const key = this.session.key(i);
      if (key && key.startsWith('v3:')) {
        data.session[key] = this.session.getItem(key);
      }
    }
    
    // IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();
      
      await new Promise((resolve) => {
        request.onsuccess = () => {
          data.indexeddb = request.result;
          resolve();
        };
      });
    }
    
    return data;
  }

  /**
   * 导入缓存数据
   */
  async import(data) {
    // Memory
    if (data.memory) {
      data.memory.forEach(([key, value]) => {
        this.memory.set(key, value);
      });
    }
    
    // SessionStorage
    if (data.session) {
      Object.entries(data.session).forEach(([key, value]) => {
        this.session.setItem(key, value);
      });
    }
    
    // IndexedDB
    if (data.indexeddb && this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      data.indexeddb.forEach(item => {
        store.put(item);
      });
    }
    
    console.log('✅ Cache data imported');
  }
}

// 创建单例实例
const cache = new LayeredCache();

export default cache;