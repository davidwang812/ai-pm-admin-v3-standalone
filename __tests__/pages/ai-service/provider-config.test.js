/**
 * Provider Configuration Module Tests
 * 测试服务商配置模块的核心功能
 */

import { ProviderConfig } from '../../../_pages/ai-service/provider-config.js';

describe('ProviderConfig Module', () => {
  let providerConfig;
  let mockApp;
  let container;

  beforeEach(() => {
    // Setup mock app context
    mockApp = createTestApp();
    providerConfig = new ProviderConfig(mockApp);
    
    // Setup DOM container
    container = document.createElement('div');
    container.id = 'app-content';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('render()', () => {
    it('should render provider configuration HTML correctly', async () => {
      const html = await providerConfig.render();
      
      expect(html).toContain('provider-config-container');
      expect(html).toContain('服务商配置');
      expect(html).toContain('provider-nav');
      expect(html).toContain('provider-forms');
    });

    it('should include all provider tabs', async () => {
      const html = await providerConfig.render();
      
      expect(html).toContain('data-provider="openai"');
      expect(html).toContain('data-provider="anthropic"');
      expect(html).toContain('data-provider="google"');
      expect(html).toContain('data-provider="moonshot"');
      expect(html).toContain('data-provider="aliyun"');
      expect(html).toContain('data-provider="baidu"');
    });

    it('should render OpenAI as active tab by default', async () => {
      const html = await providerConfig.render();
      
      expect(html).toContain('data-provider="openai" class="nav-item active"');
      expect(html).toContain('id="form-openai" class="provider-form active"');
    });
  });

  describe('bindEvents()', () => {
    beforeEach(async () => {
      container.innerHTML = await providerConfig.render();
      providerConfig.bindEvents();
    });

    it('should bind click events to navigation tabs', () => {
      const navItems = container.querySelectorAll('.nav-item');
      const switchTabSpy = jest.spyOn(providerConfig, 'switchTab');
      
      navItems[1].click(); // Click Anthropic tab
      
      expect(switchTabSpy).toHaveBeenCalledWith('anthropic');
    });

    it('should bind save events to all provider forms', () => {
      const saveForms = container.querySelectorAll('[id^="save-"]');
      expect(saveForms.length).toBe(6); // 6 providers
      
      // Each should have click event listener
      saveForms.forEach(button => {
        const clickEvent = button.onclick || button._eventListeners?.click;
        expect(clickEvent).toBeTruthy();
      });
    });

    it('should bind test connection events', () => {
      const testButtons = container.querySelectorAll('[id^="test-"]');
      expect(testButtons.length).toBe(6); // 6 providers
      
      testButtons.forEach(button => {
        const clickEvent = button.onclick || button._eventListeners?.click;
        expect(clickEvent).toBeTruthy();
      });
    });

    it('should load provider data on initialization', () => {
      const loadProviderDataSpy = jest.spyOn(providerConfig, 'loadProviderData');
      
      providerConfig.bindEvents();
      
      expect(loadProviderDataSpy).toHaveBeenCalled();
    });
  });

  describe('switchTab()', () => {
    beforeEach(async () => {
      container.innerHTML = await providerConfig.render();
      providerConfig.bindEvents();
    });

    it('should switch active tab correctly', () => {
      providerConfig.switchTab('anthropic');
      
      const openaiTab = container.querySelector('[data-provider="openai"]');
      const anthropicTab = container.querySelector('[data-provider="anthropic"]');
      const openaiForm = container.getElementById('form-openai');
      const anthropicForm = container.getElementById('form-anthropic');
      
      expect(openaiTab.classList.contains('active')).toBe(false);
      expect(anthropicTab.classList.contains('active')).toBe(true);
      expect(openaiForm.classList.contains('active')).toBe(false);
      expect(anthropicForm.classList.contains('active')).toBe(true);
    });

    it('should not error when switching to non-existent provider', () => {
      expect(() => {
        providerConfig.switchTab('invalid-provider');
      }).not.toThrow();
    });
  });

  describe('loadProviderData()', () => {
    beforeEach(async () => {
      container.innerHTML = await providerConfig.render();
    });

    it('should load and populate provider data successfully', async () => {
      const mockProviders = {
        openai: {
          apiKey: 'sk-test123',
          endpoint: 'https://api.openai.com/v1',
          enabled: true,
          models: ['gpt-4', 'gpt-3.5-turbo'],
          config: {
            temperature: 0.7,
            maxTokens: 2000
          }
        },
        anthropic: {
          apiKey: 'sk-ant-test456',
          endpoint: 'https://api.anthropic.com',
          enabled: false
        }
      };
      
      mockApp.api.getProviders.mockResolvedValue({
        success: true,
        providers: mockProviders
      });
      
      await providerConfig.loadProviderData();
      
      // Check OpenAI fields
      expect(container.querySelector('#openai-key').value).toBe('sk-test123');
      expect(container.querySelector('#openai-endpoint').value).toBe('https://api.openai.com/v1');
      expect(container.querySelector('#openai-enabled').checked).toBe(true);
      
      // Check Anthropic fields
      expect(container.querySelector('#anthropic-key').value).toBe('sk-ant-test456');
      expect(container.querySelector('#anthropic-enabled').checked).toBe(false);
    });

    it('should show masked API keys', async () => {
      const mockProviders = {
        openai: {
          apiKey: 'sk-test123456789',
          masked: true
        }
      };
      
      mockApp.api.getProviders.mockResolvedValue({
        success: true,
        providers: mockProviders
      });
      
      await providerConfig.loadProviderData();
      
      const apiKeyInput = container.querySelector('#openai-key');
      expect(apiKeyInput.value).toContain('***');
      expect(apiKeyInput.dataset.masked).toBe('true');
    });

    it('should handle API errors gracefully', async () => {
      mockApp.api.getProviders.mockRejectedValue(new Error('Network error'));
      
      await providerConfig.loadProviderData();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '加载服务商配置失败: Network error');
    });
  });

  describe('saveProvider()', () => {
    beforeEach(async () => {
      container.innerHTML = await providerConfig.render();
    });

    it('should validate required fields before saving', async () => {
      // Leave API key empty
      container.querySelector('#openai-key').value = '';
      container.querySelector('#openai-endpoint').value = 'https://api.openai.com/v1';
      
      await providerConfig.saveProvider('openai');
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', 'API密钥不能为空');
      expect(mockApp.api.saveProvider).not.toHaveBeenCalled();
    });

    it('should save provider configuration successfully', async () => {
      // Fill in form data
      container.querySelector('#openai-key').value = 'sk-test123';
      container.querySelector('#openai-endpoint').value = 'https://api.openai.com/v1';
      container.querySelector('#openai-enabled').checked = true;
      container.querySelector('#openai-temperature').value = '0.8';
      container.querySelector('#openai-max-tokens').value = '3000';
      
      mockApp.api.saveProvider.mockResolvedValue({ success: true });
      
      await providerConfig.saveProvider('openai');
      
      expect(mockApp.api.saveProvider).toHaveBeenCalledWith({
        provider: 'openai',
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com/v1',
        enabled: true,
        config: {
          temperature: 0.8,
          maxTokens: 3000
        }
      });
      
      expect(mockApp.showToast).toHaveBeenCalledWith('success', 'OpenAI配置已保存');
    });

    it('should not send masked API keys', async () => {
      const apiKeyInput = container.querySelector('#openai-key');
      apiKeyInput.value = '***masked***';
      apiKeyInput.dataset.masked = 'true';
      
      container.querySelector('#openai-endpoint').value = 'https://api.openai.com/v1';
      
      mockApp.api.saveProvider.mockResolvedValue({ success: true });
      
      await providerConfig.saveProvider('openai');
      
      // Should not include apiKey in request when masked
      expect(mockApp.api.saveProvider).toHaveBeenCalledWith(
        expect.not.objectContaining({ apiKey: '***masked***' })
      );
    });

    it('should handle save errors', async () => {
      container.querySelector('#openai-key').value = 'sk-test123';
      container.querySelector('#openai-endpoint').value = 'https://api.openai.com/v1';
      
      mockApp.api.saveProvider.mockRejectedValue(new Error('Save failed'));
      
      await providerConfig.saveProvider('openai');
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '保存失败: Save failed');
    });
  });

  describe('testConnection()', () => {
    beforeEach(async () => {
      container.innerHTML = await providerConfig.render();
    });

    it('should show loading state during test', async () => {
      const testButton = container.querySelector('#test-openai');
      
      mockApp.api.testProvider.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      const promise = providerConfig.testConnection('openai');
      
      expect(testButton.disabled).toBe(true);
      expect(testButton.textContent).toBe('测试中...');
      
      await promise;
      
      expect(testButton.disabled).toBe(false);
      expect(testButton.textContent).toBe('测试连接');
    });

    it('should show success message on successful test', async () => {
      mockApp.api.testProvider.mockResolvedValue({ 
        success: true,
        message: 'Connection successful',
        latency: 150
      });
      
      await providerConfig.testConnection('openai');
      
      expect(mockApp.showToast).toHaveBeenCalledWith('success', 
        expect.stringContaining('连接成功')
      );
    });

    it('should show error message on failed test', async () => {
      mockApp.api.testProvider.mockResolvedValue({ 
        success: false,
        error: 'Invalid API key'
      });
      
      await providerConfig.testConnection('openai');
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '连接失败: Invalid API key');
    });

    it('should handle test exceptions', async () => {
      mockApp.api.testProvider.mockRejectedValue(new Error('Network timeout'));
      
      await providerConfig.testConnection('openai');
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '测试失败: Network timeout');
    });
  });

  describe('validateProviderData()', () => {
    it('should validate required API key', () => {
      const data = {
        provider: 'openai',
        apiKey: '',
        endpoint: 'https://api.openai.com/v1'
      };
      
      const result = providerConfig.validateProviderData(data);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API密钥不能为空');
    });

    it('should validate endpoint URL format', () => {
      const data = {
        provider: 'openai',
        apiKey: 'sk-test123',
        endpoint: 'not-a-url'
      };
      
      const result = providerConfig.validateProviderData(data);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('请输入有效的API端点URL');
    });

    it('should validate temperature range', () => {
      const data = {
        provider: 'openai',
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com/v1',
        config: {
          temperature: 2.5 // Out of range
        }
      };
      
      const result = providerConfig.validateProviderData(data);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Temperature必须在0到2之间');
    });

    it('should validate max tokens range', () => {
      const data = {
        provider: 'openai',
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com/v1',
        config: {
          maxTokens: -100 // Negative value
        }
      };
      
      const result = providerConfig.validateProviderData(data);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Max Tokens必须大于0');
    });

    it('should pass validation for correct data', () => {
      const data = {
        provider: 'openai',
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com/v1',
        enabled: true,
        config: {
          temperature: 0.7,
          maxTokens: 2000
        }
      };
      
      const result = providerConfig.validateProviderData(data);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('getProviderDisplayName()', () => {
    it('should return correct display names', () => {
      expect(providerConfig.getProviderDisplayName('openai')).toBe('OpenAI');
      expect(providerConfig.getProviderDisplayName('anthropic')).toBe('Anthropic');
      expect(providerConfig.getProviderDisplayName('google')).toBe('Google');
      expect(providerConfig.getProviderDisplayName('moonshot')).toBe('Moonshot');
      expect(providerConfig.getProviderDisplayName('aliyun')).toBe('阿里云');
      expect(providerConfig.getProviderDisplayName('baidu')).toBe('百度');
    });

    it('should return original name for unknown providers', () => {
      expect(providerConfig.getProviderDisplayName('unknown')).toBe('Unknown');
    });
  });

  describe('updateModelsList()', () => {
    beforeEach(async () => {
      container.innerHTML = await providerConfig.render();
    });

    it('should update models dropdown with available models', () => {
      const models = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'];
      providerConfig.updateModelsList('openai', models);
      
      const modelSelect = container.querySelector('#openai-models');
      const options = modelSelect.querySelectorAll('option');
      
      expect(options.length).toBe(models.length);
      expect(options[0].value).toBe('gpt-4');
      expect(options[1].value).toBe('gpt-3.5-turbo');
      expect(options[2].value).toBe('gpt-4-turbo');
    });

    it('should show placeholder when no models available', () => {
      providerConfig.updateModelsList('openai', []);
      
      const modelSelect = container.querySelector('#openai-models');
      const options = modelSelect.querySelectorAll('option');
      
      expect(options.length).toBe(1);
      expect(options[0].textContent).toBe('暂无可用模型');
    });
  });
});