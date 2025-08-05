/**
 * Load Balance Page Tests
 * 测试负载均衡配置页面
 */

import { LoadBalance } from '../../../_pages/ai-service/load-balance.js';
import { createMockDocument, fireEvent } from '../../helpers/dom-mocks.js';
import { MockApiClient } from '../../helpers/api-mocks.js';

describe('LoadBalance Page', () => {
  let loadBalance;
  let mockApp;
  let mockDocument;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock document
    mockDocument = createMockDocument();
    global.document = mockDocument;
    
    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    global.localStorage = mockLocalStorage;
    
    // Mock app
    mockApp = {
      api: new MockApiClient(),
      showToast: jest.fn()
    };
    
    // Mock window
    global.window = { adminV3App: mockApp };
    
    loadBalance = new LoadBalance(mockApp);
  });

  afterEach(() => {
    mockDocument._reset();
  });

  describe('initialization', () => {
    it('should initialize with app instance', () => {
      expect(loadBalance.app).toBe(mockApp);
    });

    it('should have default configuration', () => {
      const defaultConfig = loadBalance.getDefaultConfig();
      
      expect(defaultConfig).toMatchObject({
        enabled: true,
        strategy: 'round-robin',
        healthCheckInterval: 30,
        failoverThreshold: 3,
        providers: [],
        stats: {
          todayRequests: 0,
          avgResponseTime: 0,
          successRate: 0,
          activeConnections: 0
        }
      });
    });
  });

  describe('render', () => {
    it('should render with API config', async () => {
      const apiConfig = {
        enabled: false,
        strategy: 'weighted',
        healthCheckInterval: 60,
        failoverThreshold: 5,
        stats: {
          todayRequests: 1234,
          avgResponseTime: 150,
          successRate: 98.5,
          activeConnections: 12
        }
      };
      
      mockApp.api.setMockResponse('GET', '/api/load-balance/config', {
        success: true,
        data: apiConfig
      });
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        'provider-1': { id: 'provider-1', name: 'OpenAI' },
        'provider-2': { id: 'provider-2', name: 'Anthropic' }
      }));
      
      const html = await loadBalance.render();
      
      expect(html).toContain('load-balance-container');
      expect(html).toContain('负载均衡配置');
      expect(html).toContain('1234'); // todayRequests
      expect(html).toContain('150ms'); // avgResponseTime
      expect(html).toContain('98.5%'); // successRate
      expect(html).toContain('selected">加权轮询'); // weighted strategy selected
      expect(html).toContain('value="60"'); // healthCheckInterval
      expect(html).toContain('OpenAI');
      expect(html).toContain('Anthropic');
    });

    it('should use default config on API error', async () => {
      mockApp.api.setMockResponse('GET', '/api/load-balance/config', {
        success: false,
        error: 'Network error'
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const html = await loadBalance.render();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Using default load balance config due to API error:',
        'Network error'
      );
      expect(html).toContain('value="30"'); // default healthCheckInterval
      expect(html).toContain('selected">轮询'); // default strategy
      
      consoleSpy.mockRestore();
    });

    it('should handle empty providers list', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const html = await loadBalance.render();
      
      expect(html).toContain('<tbody>');
      expect(html).toContain('</tbody>');
      expect(html).not.toContain('data-provider-id');
    });

    it('should render provider configuration', async () => {
      const apiConfig = {
        enabled: true,
        strategy: 'round-robin',
        providers: [
          {
            id: 'provider-1',
            enabled: true,
            weight: 3,
            healthy: true,
            avgResponseTime: 120,
            requestCount: 500
          },
          {
            id: 'provider-2',
            enabled: false,
            weight: 1,
            healthy: false,
            avgResponseTime: 0,
            requestCount: 0
          }
        ]
      };
      
      mockApp.api.setMockResponse('GET', '/api/load-balance/config', {
        success: true,
        data: apiConfig
      });
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        'provider-1': { id: 'provider-1', name: 'OpenAI' },
        'provider-2': { id: 'provider-2', name: 'Anthropic' }
      }));
      
      const html = await loadBalance.render();
      
      // Provider 1
      expect(html).toContain('data-provider-id="provider-1"');
      expect(html).toContain('value="3"'); // weight
      expect(html).toContain('✅ 健康');
      expect(html).toContain('120ms');
      expect(html).toContain('500'); // request count
      
      // Provider 2
      expect(html).toContain('data-provider-id="provider-2"');
      expect(html).toContain('❌ 异常');
    });
  });

  describe('bindEvents', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        'provider-1': { id: 'provider-1', name: 'OpenAI' }
      }));
      
      const html = await loadBalance.render();
      mockDocument.body.innerHTML = html;
      loadBalance.bindEvents();
    });

    it('should bind save button click', () => {
      const saveBtn = mockDocument.getElementById('btn-save-balance');
      const saveSpy = jest.spyOn(loadBalance, 'saveConfig');
      
      fireEvent(saveBtn, 'click');
      
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should bind reset button click', () => {
      const resetBtn = mockDocument.getElementById('btn-reset-balance');
      const resetSpy = jest.spyOn(loadBalance, 'resetConfig');
      
      fireEvent(resetBtn, 'click');
      
      expect(resetSpy).toHaveBeenCalled();
    });

    it('should auto-save on enable/disable toggle', () => {
      const enableToggle = mockDocument.getElementById('balance-enabled');
      const saveSpy = jest.spyOn(loadBalance, 'saveConfig');
      
      fireEvent(enableToggle, 'change');
      
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('saveConfig', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        'provider-1': { id: 'provider-1', name: 'OpenAI' },
        'provider-2': { id: 'provider-2', name: 'Anthropic' }
      }));
      
      const html = await loadBalance.render();
      mockDocument.body.innerHTML = html;
    });

    it('should save configuration successfully', async () => {
      mockApp.api.setMockResponse('POST', '/api/load-balance/config', {
        success: true
      });
      
      // Set form values
      mockDocument.getElementById('balance-enabled').checked = true;
      mockDocument.getElementById('balance-strategy').value = 'weighted';
      mockDocument.getElementById('health-check-interval').value = '45';
      mockDocument.getElementById('failover-threshold').value = '4';
      
      await loadBalance.saveConfig();
      
      const savedConfig = mockApp.api.getLastCall('POST', '/api/load-balance/config').data;
      
      expect(savedConfig).toMatchObject({
        enabled: true,
        strategy: 'weighted',
        healthCheckInterval: 45,
        failoverThreshold: 4,
        providers: expect.any(Array)
      });
      
      expect(mockApp.showToast).toHaveBeenCalledWith('success', '负载均衡配置保存成功');
    });

    it('should handle save error', async () => {
      mockApp.api.setMockResponse('POST', '/api/load-balance/config', {
        success: false,
        error: 'Save failed'
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await loadBalance.saveConfig();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save load balance config:',
        expect.any(Error)
      );
      expect(mockApp.showToast).toHaveBeenCalledWith('error', ' 保存失败: Save failed');
      
      consoleSpy.mockRestore();
    });
  });

  describe('resetConfig', () => {
    beforeEach(async () => {
      const html = await loadBalance.render();
      mockDocument.body.innerHTML = html;
    });

    it('should reset configuration on confirm', () => {
      global.confirm = jest.fn().mockReturnValue(true);
      
      // Set non-default values
      mockDocument.getElementById('balance-enabled').checked = false;
      mockDocument.getElementById('balance-strategy').value = 'fastest';
      mockDocument.getElementById('health-check-interval').value = '100';
      
      loadBalance.resetConfig();
      
      expect(global.confirm).toHaveBeenCalledWith('确定要重置负载均衡配置吗？');
      expect(mockDocument.getElementById('balance-enabled').checked).toBe(true);
      expect(mockDocument.getElementById('balance-strategy').value).toBe('round-robin');
      expect(mockDocument.getElementById('health-check-interval').value).toBe('30');
      expect(mockApp.showToast).toHaveBeenCalledWith('info', '已重置为默认配置');
    });

    it('should not reset on cancel', () => {
      global.confirm = jest.fn().mockReturnValue(false);
      
      mockDocument.getElementById('balance-enabled').checked = false;
      
      loadBalance.resetConfig();
      
      expect(mockDocument.getElementById('balance-enabled').checked).toBe(false);
      expect(mockApp.showToast).not.toHaveBeenCalled();
    });
  });

  describe('getProvidersConfig', () => {
    it('should extract provider configurations', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        'provider-1': { id: 'provider-1', name: 'OpenAI' },
        'provider-2': { id: 'provider-2', name: 'Anthropic' }
      }));
      
      const html = await loadBalance.render();
      mockDocument.body.innerHTML = html;
      
      // Set provider configs
      const provider1Row = mockDocument.querySelector('[data-provider-id="provider-1"]');
      provider1Row.querySelector('.provider-enabled').checked = true;
      provider1Row.querySelector('.provider-weight').value = '5';
      
      const provider2Row = mockDocument.querySelector('[data-provider-id="provider-2"]');
      provider2Row.querySelector('.provider-enabled').checked = false;
      provider2Row.querySelector('.provider-weight').value = '2';
      
      const config = loadBalance.getProvidersConfig();
      
      expect(config).toEqual([
        { id: 'provider-1', enabled: true, weight: 5 },
        { id: 'provider-2', enabled: false, weight: 2 }
      ]);
    });

    it('should handle empty providers', () => {
      mockDocument.body.innerHTML = '<div></div>';
      
      const config = loadBalance.getProvidersConfig();
      
      expect(config).toEqual([]);
    });
  });
});