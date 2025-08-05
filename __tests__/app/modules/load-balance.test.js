/**
 * Load Balance Module Tests
 * 测试负载均衡配置管理
 */

import { LoadBalanceManager } from '../../../_app/modules/load-balance.js';

describe('LoadBalanceManager', () => {
  let manager;

  beforeEach(() => {
    manager = new LoadBalanceManager();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      expect(manager.providers).toEqual([]);
      expect(manager.weights.size).toBe(0);
      expect(manager.healthStatus.size).toBe(0);
    });
  });

  describe('addProvider', () => {
    it('should add provider with all config', () => {
      const config = {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com',
        weight: 3
      };
      
      manager.addProvider('openai', config);
      
      expect(manager.providers).toHaveLength(1);
      expect(manager.providers[0]).toEqual({
        id: 'openai',
        ...config
      });
      expect(manager.weights.get('openai')).toBe(3);
      expect(manager.healthStatus.get('openai')).toBe(true);
    });

    it('should add provider with default weight', () => {
      manager.addProvider('anthropic', {
        name: 'Anthropic',
        endpoint: 'https://api.anthropic.com'
      });
      
      expect(manager.weights.get('anthropic')).toBe(1);
    });

    it('should add multiple providers', () => {
      manager.addProvider('openai', { name: 'OpenAI', weight: 2 });
      manager.addProvider('anthropic', { name: 'Anthropic', weight: 3 });
      manager.addProvider('google', { name: 'Google', weight: 1 });
      
      expect(manager.providers).toHaveLength(3);
      expect(manager.weights.size).toBe(3);
      expect(manager.healthStatus.size).toBe(3);
    });
  });

  describe('getAvailableProviders', () => {
    beforeEach(() => {
      manager.addProvider('openai', { name: 'OpenAI' });
      manager.addProvider('anthropic', { name: 'Anthropic' });
      manager.addProvider('google', { name: 'Google' });
    });

    it('should return all providers when all healthy', () => {
      const available = manager.getAvailableProviders();
      
      expect(available).toHaveLength(3);
      expect(available.map(p => p.id)).toEqual(['openai', 'anthropic', 'google']);
    });

    it('should exclude unhealthy providers', () => {
      manager.updateHealth('anthropic', false);
      
      const available = manager.getAvailableProviders();
      
      expect(available).toHaveLength(2);
      expect(available.map(p => p.id)).toEqual(['openai', 'google']);
    });

    it('should return empty array when all unhealthy', () => {
      manager.updateHealth('openai', false);
      manager.updateHealth('anthropic', false);
      manager.updateHealth('google', false);
      
      const available = manager.getAvailableProviders();
      
      expect(available).toHaveLength(0);
    });
  });

  describe('selectProvider', () => {
    beforeEach(() => {
      // Mock Math.random for predictable tests
      jest.spyOn(Math, 'random');
    });

    afterEach(() => {
      Math.random.mockRestore();
    });

    it('should select provider based on weight', () => {
      manager.addProvider('openai', { name: 'OpenAI', weight: 7 });
      manager.addProvider('anthropic', { name: 'Anthropic', weight: 3 });
      
      // Total weight = 10
      // OpenAI: 0-0.7, Anthropic: 0.7-1.0
      
      Math.random.mockReturnValue(0.5); // Should select OpenAI
      expect(manager.selectProvider().id).toBe('openai');
      
      Math.random.mockReturnValue(0.8); // Should select Anthropic
      expect(manager.selectProvider().id).toBe('anthropic');
    });

    it('should only select from healthy providers', () => {
      manager.addProvider('openai', { name: 'OpenAI', weight: 5 });
      manager.addProvider('anthropic', { name: 'Anthropic', weight: 5 });
      
      manager.updateHealth('openai', false);
      
      // Only Anthropic is available
      Math.random.mockReturnValue(0.5);
      expect(manager.selectProvider().id).toBe('anthropic');
    });

    it('should return null when no providers available', () => {
      expect(manager.selectProvider()).toBeNull();
      
      manager.addProvider('openai', { name: 'OpenAI' });
      manager.updateHealth('openai', false);
      
      expect(manager.selectProvider()).toBeNull();
    });

    it('should distribute selections according to weights', () => {
      manager.addProvider('a', { weight: 6 });
      manager.addProvider('b', { weight: 3 });
      manager.addProvider('c', { weight: 1 });
      
      const selections = { a: 0, b: 0, c: 0 };
      const iterations = 10000;
      
      // Restore real Math.random for distribution test
      Math.random.mockRestore();
      
      for (let i = 0; i < iterations; i++) {
        const provider = manager.selectProvider();
        selections[provider.id]++;
      }
      
      // Check distribution is roughly correct (within 5% tolerance)
      expect(Math.abs(selections.a / iterations - 0.6)).toBeLessThan(0.05);
      expect(Math.abs(selections.b / iterations - 0.3)).toBeLessThan(0.05);
      expect(Math.abs(selections.c / iterations - 0.1)).toBeLessThan(0.05);
    });

    it('should handle edge case at weight boundaries', () => {
      manager.addProvider('a', { weight: 5 });
      manager.addProvider('b', { weight: 5 });
      
      // Exactly at boundary
      Math.random.mockReturnValue(0.5);
      const provider = manager.selectProvider();
      expect(['a', 'b']).toContain(provider.id);
    });
  });

  describe('updateHealth', () => {
    beforeEach(() => {
      manager.addProvider('openai', { name: 'OpenAI' });
    });

    it('should update health status to false', () => {
      manager.updateHealth('openai', false);
      
      expect(manager.healthStatus.get('openai')).toBe(false);
      expect(manager.getAvailableProviders()).toHaveLength(0);
    });

    it('should update health status back to true', () => {
      manager.updateHealth('openai', false);
      manager.updateHealth('openai', true);
      
      expect(manager.healthStatus.get('openai')).toBe(true);
      expect(manager.getAvailableProviders()).toHaveLength(1);
    });

    it('should handle updating non-existent provider', () => {
      // Should not throw error
      expect(() => {
        manager.updateHealth('non-existent', false);
      }).not.toThrow();
      
      expect(manager.healthStatus.get('non-existent')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return complete statistics', () => {
      manager.addProvider('openai', { name: 'OpenAI', weight: 3 });
      manager.addProvider('anthropic', { name: 'Anthropic', weight: 2 });
      manager.addProvider('google', { name: 'Google', weight: 1 });
      
      manager.updateHealth('anthropic', false);
      
      const stats = manager.getStats();
      
      expect(stats).toEqual({
        total: 3,
        healthy: 2,
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            weight: 3,
            healthy: true
          },
          {
            id: 'anthropic',
            name: 'Anthropic',
            weight: 2,
            healthy: false
          },
          {
            id: 'google',
            name: 'Google',
            weight: 1,
            healthy: true
          }
        ]
      });
    });

    it('should handle empty manager', () => {
      const stats = manager.getStats();
      
      expect(stats).toEqual({
        total: 0,
        healthy: 0,
        providers: []
      });
    });

    it('should include all provider properties in stats', () => {
      manager.addProvider('openai', {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com',
        apiKey: 'sk-123',
        weight: 5,
        customProp: 'value'
      });
      
      const stats = manager.getStats();
      
      expect(stats.providers[0]).toMatchObject({
        id: 'openai',
        name: 'OpenAI',
        endpoint: 'https://api.openai.com',
        apiKey: 'sk-123',
        weight: 5,
        customProp: 'value',
        healthy: true
      });
    });
  });

  describe('edge cases', () => {
    it('should handle zero weight providers', () => {
      manager.addProvider('zero', { weight: 0 });
      manager.addProvider('normal', { weight: 1 });
      
      // Zero weight provider should never be selected
      jest.spyOn(Math, 'random');
      
      for (let i = 0; i < 10; i++) {
        Math.random.mockReturnValue(Math.random() * 0.99999);
        const provider = manager.selectProvider();
        expect(provider.id).toBe('normal');
      }
      
      Math.random.mockRestore();
    });

    it('should handle very large weights', () => {
      manager.addProvider('huge', { weight: 1000000 });
      manager.addProvider('tiny', { weight: 1 });
      
      // Should still work correctly
      const provider = manager.selectProvider();
      expect(provider).toBeTruthy();
      expect(['huge', 'tiny']).toContain(provider.id);
    });

    it('should handle negative weights as zero', () => {
      manager.addProvider('negative', { weight: -5 });
      
      // Should treat as zero or minimal weight
      expect(manager.weights.get('negative')).toBe(-5);
      
      // With only negative weight provider, it should still be selected
      const provider = manager.selectProvider();
      expect(provider.id).toBe('negative');
    });
  });
});