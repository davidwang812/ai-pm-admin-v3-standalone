/**
 * Load Balancing Module Tests
 * 测试负载均衡模块的核心功能
 */

import { LoadBalancing } from '../../../_pages/ai-service/load-balancing.js';

describe('LoadBalancing Module', () => {
  let loadBalancing;
  let mockApp;
  let container;

  beforeEach(() => {
    // Setup mock app context
    mockApp = createTestApp();
    loadBalancing = new LoadBalancing(mockApp);
    
    // Setup DOM container
    container = document.createElement('div');
    container.id = 'app-content';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('render()', () => {
    it('should render load balancing HTML correctly', async () => {
      const html = await loadBalancing.render();
      
      expect(html).toContain('load-balancing-container');
      expect(html).toContain('负载均衡');
      expect(html).toContain('strategy-selector');
      expect(html).toContain('service-weights');
      expect(html).toContain('health-check-config');
    });

    it('should include all strategy options', async () => {
      const html = await loadBalancing.render();
      
      expect(html).toContain('value="round-robin"');
      expect(html).toContain('value="weighted"');
      expect(html).toContain('value="least-connections"');
      expect(html).toContain('value="response-time"');
      expect(html).toContain('value="random"');
    });

    it('should include service weight controls', async () => {
      const html = await loadBalancing.render();
      
      expect(html).toContain('权重分配');
      expect(html).toContain('service-weight-list');
      expect(html).toContain('添加服务');
    });

    it('should include health check configuration', async () => {
      const html = await loadBalancing.render();
      
      expect(html).toContain('健康检查配置');
      expect(html).toContain('health-check-interval');
      expect(html).toContain('health-check-timeout');
      expect(html).toContain('health-check-threshold');
    });
  });

  describe('bindEvents()', () => {
    beforeEach(async () => {
      container.innerHTML = await loadBalancing.render();
      loadBalancing.bindEvents();
    });

    it('should bind strategy change event', () => {
      const strategySelect = container.querySelector('#strategy-selector');
      const onStrategyChangeSpy = jest.spyOn(loadBalancing, 'onStrategyChange');
      
      strategySelect.value = 'weighted';
      strategySelect.dispatchEvent(new Event('change'));
      
      expect(onStrategyChangeSpy).toHaveBeenCalledWith('weighted');
    });

    it('should bind save configuration button', () => {
      const saveButton = container.querySelector('#save-load-balancing');
      const saveConfigSpy = jest.spyOn(loadBalancing, 'saveConfig');
      
      saveButton.click();
      
      expect(saveConfigSpy).toHaveBeenCalled();
    });

    it('should bind add service button', () => {
      const addButton = container.querySelector('#add-service-weight');
      const addServiceWeightSpy = jest.spyOn(loadBalancing, 'addServiceWeight');
      
      addButton.click();
      
      expect(addServiceWeightSpy).toHaveBeenCalled();
    });

    it('should load initial configuration', () => {
      const loadConfigSpy = jest.spyOn(loadBalancing, 'loadConfig');
      
      loadBalancing.bindEvents();
      
      expect(loadConfigSpy).toHaveBeenCalled();
    });
  });

  describe('loadConfig()', () => {
    beforeEach(async () => {
      container.innerHTML = await loadBalancing.render();
    });

    it('should load and display configuration', async () => {
      const mockConfig = {
        success: true,
        config: {
          strategy: 'weighted',
          weights: {
            'openai': 50,
            'anthropic': 30,
            'google': 20
          },
          healthCheck: {
            enabled: true,
            interval: 30,
            timeout: 5,
            threshold: 3
          }
        }
      };
      
      mockApp.api.getLoadBalancingConfig.mockResolvedValue(mockConfig);
      
      await loadBalancing.loadConfig();
      
      expect(container.querySelector('#strategy-selector').value).toBe('weighted');
      expect(container.querySelector('#health-check-enabled').checked).toBe(true);
      expect(container.querySelector('#health-check-interval').value).toBe('30');
      expect(container.querySelector('#health-check-timeout').value).toBe('5');
      expect(container.querySelector('#health-check-threshold').value).toBe('3');
    });

    it('should display service weights', async () => {
      const mockConfig = {
        success: true,
        config: {
          strategy: 'weighted',
          weights: {
            'openai': 50,
            'anthropic': 30
          }
        }
      };
      
      mockApp.api.getLoadBalancingConfig.mockResolvedValue(mockConfig);
      
      await loadBalancing.loadConfig();
      
      const weightItems = container.querySelectorAll('.weight-item');
      expect(weightItems.length).toBe(2);
      
      expect(weightItems[0].textContent).toContain('openai');
      expect(weightItems[0].querySelector('input').value).toBe('50');
    });

    it('should handle API errors', async () => {
      mockApp.api.getLoadBalancingConfig.mockRejectedValue(new Error('Network error'));
      
      await loadBalancing.loadConfig();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '加载配置失败: Network error');
    });
  });

  describe('saveConfig()', () => {
    beforeEach(async () => {
      container.innerHTML = await loadBalancing.render();
      
      // Set test values
      container.querySelector('#strategy-selector').value = 'weighted';
      container.querySelector('#health-check-enabled').checked = true;
      container.querySelector('#health-check-interval').value = '60';
      
      // Add some service weights
      loadBalancing.serviceWeights = {
        'openai': 60,
        'anthropic': 40
      };
    });

    it('should collect and save configuration', async () => {
      mockApp.api.saveLoadBalancingConfig.mockResolvedValue({ success: true });
      
      await loadBalancing.saveConfig();
      
      expect(mockApp.api.saveLoadBalancingConfig).toHaveBeenCalledWith({
        strategy: 'weighted',
        weights: {
          'openai': 60,
          'anthropic': 40
        },
        healthCheck: {
          enabled: true,
          interval: 60,
          timeout: 10,
          threshold: 3
        }
      });
      
      expect(mockApp.showToast).toHaveBeenCalledWith('success', '负载均衡配置已保存');
    });

    it('should validate weight sum for weighted strategy', async () => {
      loadBalancing.serviceWeights = {
        'openai': 30,
        'anthropic': 40
      }; // Sum is 70, not 100
      
      await loadBalancing.saveConfig();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '权重总和必须为100%');
      expect(mockApp.api.saveLoadBalancingConfig).not.toHaveBeenCalled();
    });

    it('should validate health check intervals', async () => {
      container.querySelector('#health-check-interval').value = '0';
      
      await loadBalancing.saveConfig();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '健康检查间隔必须大于0');
      expect(mockApp.api.saveLoadBalancingConfig).not.toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      mockApp.api.saveLoadBalancingConfig.mockRejectedValue(new Error('Save failed'));
      
      await loadBalancing.saveConfig();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '保存失败: Save failed');
    });
  });

  describe('onStrategyChange()', () => {
    beforeEach(async () => {
      container.innerHTML = await loadBalancing.render();
    });

    it('should show weights section for weighted strategy', () => {
      loadBalancing.onStrategyChange('weighted');
      
      const weightsSection = container.querySelector('#weights-section');
      expect(weightsSection.style.display).not.toBe('none');
    });

    it('should hide weights section for non-weighted strategies', () => {
      loadBalancing.onStrategyChange('round-robin');
      
      const weightsSection = container.querySelector('#weights-section');
      expect(weightsSection.style.display).toBe('none');
    });

    it('should update strategy description', () => {
      loadBalancing.onStrategyChange('least-connections');
      
      const description = container.querySelector('#strategy-description');
      expect(description.textContent).toContain('选择连接数最少的服务');
    });
  });

  describe('addServiceWeight()', () => {
    beforeEach(async () => {
      container.innerHTML = await loadBalancing.render();
    });

    it('should add new service weight item', () => {
      const initialCount = container.querySelectorAll('.weight-item').length;
      
      loadBalancing.addServiceWeight();
      
      const newCount = container.querySelectorAll('.weight-item').length;
      expect(newCount).toBe(initialCount + 1);
    });

    it('should bind events to new weight item', () => {
      loadBalancing.addServiceWeight();
      
      const newItem = container.querySelector('.weight-item:last-child');
      const removeButton = newItem.querySelector('.remove-weight');
      
      removeButton.click();
      
      // Item should be removed
      expect(container.contains(newItem)).toBe(false);
    });

    it('should update weight value on input', () => {
      loadBalancing.addServiceWeight();
      
      const newItem = container.querySelector('.weight-item:last-child');
      const serviceSelect = newItem.querySelector('.service-select');
      const weightInput = newItem.querySelector('.weight-input');
      
      serviceSelect.value = 'openai';
      weightInput.value = '75';
      weightInput.dispatchEvent(new Event('input'));
      
      expect(loadBalancing.serviceWeights['openai']).toBe(75);
    });
  });

  describe('updateWeightSum()', () => {
    beforeEach(async () => {
      container.innerHTML = await loadBalancing.render();
    });

    it('should calculate and display total weight', () => {
      loadBalancing.serviceWeights = {
        'openai': 50,
        'anthropic': 30,
        'google': 20
      };
      
      loadBalancing.updateWeightSum();
      
      const sumDisplay = container.querySelector('#weight-sum');
      expect(sumDisplay.textContent).toBe('100%');
      expect(sumDisplay.style.color).toBe('#52c41a'); // Green for valid
    });

    it('should show warning for invalid sum', () => {
      loadBalancing.serviceWeights = {
        'openai': 60,
        'anthropic': 30
      };
      
      loadBalancing.updateWeightSum();
      
      const sumDisplay = container.querySelector('#weight-sum');
      expect(sumDisplay.textContent).toBe('90%');
      expect(sumDisplay.style.color).toBe('#ff4d4f'); // Red for invalid
    });
  });

  describe('validateConfig()', () => {
    it('should validate weighted strategy requires 100% total', () => {
      const config = {
        strategy: 'weighted',
        weights: { 'openai': 60, 'anthropic': 30 } // Total 90%
      };
      
      const result = loadBalancing.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('权重总和必须为100%');
    });

    it('should validate health check intervals', () => {
      const config = {
        strategy: 'round-robin',
        healthCheck: { enabled: true, interval: 0 }
      };
      
      const result = loadBalancing.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('健康检查间隔必须大于0');
    });

    it('should validate health check timeout', () => {
      const config = {
        strategy: 'round-robin',
        healthCheck: { enabled: true, interval: 30, timeout: 0 }
      };
      
      const result = loadBalancing.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('健康检查超时必须大于0');
    });

    it('should pass valid configuration', () => {
      const config = {
        strategy: 'weighted',
        weights: { 'openai': 70, 'anthropic': 30 },
        healthCheck: { enabled: true, interval: 30, timeout: 5, threshold: 3 }
      };
      
      const result = loadBalancing.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('getStrategyDescription()', () => {
    it('should return correct descriptions', () => {
      expect(loadBalancing.getStrategyDescription('round-robin'))
        .toBe('轮询分配请求到各个服务');
      
      expect(loadBalancing.getStrategyDescription('weighted'))
        .toBe('根据权重比例分配请求');
      
      expect(loadBalancing.getStrategyDescription('least-connections'))
        .toBe('选择连接数最少的服务');
      
      expect(loadBalancing.getStrategyDescription('response-time'))
        .toBe('选择响应时间最短的服务');
      
      expect(loadBalancing.getStrategyDescription('random'))
        .toBe('随机选择服务');
      
      expect(loadBalancing.getStrategyDescription('unknown'))
        .toBe('未知策略');
    });
  });
});