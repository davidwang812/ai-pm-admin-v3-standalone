/**
 * Unified Configuration Module Tests
 * 测试统一配置模块的核心功能
 */

import { UnifiedConfig } from '../../../_pages/ai-service/unified-config.js';

describe('UnifiedConfig Module', () => {
  let unifiedConfig;
  let mockApp;
  let container;

  beforeEach(() => {
    // Setup mock app context
    mockApp = createTestApp();
    unifiedConfig = new UnifiedConfig(mockApp);
    
    // Setup DOM container
    container = document.createElement('div');
    container.id = 'app-content';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('render()', () => {
    it('should render unified configuration HTML correctly', async () => {
      const html = await unifiedConfig.render();
      
      expect(html).toContain('unified-config-container');
      expect(html).toContain('统一配置');
      expect(html).toContain('ai-services-config');
      expect(html).toContain('global-params');
    });

    it('should include all AI service sections', async () => {
      const html = await unifiedConfig.render();
      
      expect(html).toContain('问答AI (questionAI)');
      expect(html).toContain('绘图AI (drawingAI)');
      expect(html).toContain('助手AI (assistantAI)');
      expect(html).toContain('翻译AI (translationAI)');
      expect(html).toContain('评分AI (ratingAI)');
    });

    it('should include global parameters section', async () => {
      const html = await unifiedConfig.render();
      
      expect(html).toContain('全局参数');
      expect(html).toContain('Temperature');
      expect(html).toContain('Top P');
      expect(html).toContain('Max Tokens');
    });

    it('should include save and load buttons', async () => {
      const html = await unifiedConfig.render();
      
      expect(html).toContain('id="save-unified-config"');
      expect(html).toContain('id="load-unified-config"');
      expect(html).toContain('保存配置');
      expect(html).toContain('加载配置');
    });
  });

  describe('bindEvents()', () => {
    beforeEach(async () => {
      container.innerHTML = await unifiedConfig.render();
      unifiedConfig.bindEvents();
    });

    it('should bind save button click event', () => {
      const saveButton = container.querySelector('#save-unified-config');
      const saveConfigSpy = jest.spyOn(unifiedConfig, 'saveConfig');
      
      saveButton.click();
      
      expect(saveConfigSpy).toHaveBeenCalled();
    });

    it('should bind load button click event', () => {
      const loadButton = container.querySelector('#load-unified-config');
      const loadConfigSpy = jest.spyOn(unifiedConfig, 'loadConfig');
      
      loadButton.click();
      
      expect(loadConfigSpy).toHaveBeenCalled();
    });

    it('should bind provider change events for all AI services', () => {
      const providerSelects = container.querySelectorAll('.ai-service-provider');
      expect(providerSelects.length).toBe(5); // 5 AI services
      
      const updateProviderFieldsSpy = jest.spyOn(unifiedConfig, 'updateProviderFields');
      
      providerSelects[0].value = 'openai';
      providerSelects[0].dispatchEvent(new Event('change'));
      
      expect(updateProviderFieldsSpy).toHaveBeenCalledWith('questionAI', 'openai');
    });

    it('should bind enable toggle events', () => {
      const enableToggles = container.querySelectorAll('.ai-service-enabled');
      expect(enableToggles.length).toBe(5); // 5 AI services
      
      const toggleServiceFieldsSpy = jest.spyOn(unifiedConfig, 'toggleServiceFields');
      
      enableToggles[0].checked = false;
      enableToggles[0].dispatchEvent(new Event('change'));
      
      expect(toggleServiceFieldsSpy).toHaveBeenCalledWith('questionAI', false);
    });

    it('should load config on initialization', () => {
      const loadConfigSpy = jest.spyOn(unifiedConfig, 'loadConfig');
      
      unifiedConfig.bindEvents();
      
      expect(loadConfigSpy).toHaveBeenCalled();
    });
  });

  describe('loadConfig()', () => {
    beforeEach(async () => {
      container.innerHTML = await unifiedConfig.render();
    });

    it('should load and populate configuration successfully', async () => {
      const mockConfig = {
        globalParams: {
          temperature: 0.8,
          topP: 0.95,
          maxTokens: 3000
        },
        aiServices: {
          questionAI: {
            enabled: true,
            provider: 'openai',
            prompt: 'You are a helpful assistant',
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 2000
          },
          drawingAI: {
            enabled: false,
            provider: 'google',
            prompt: 'Generate image'
          }
        }
      };
      
      mockApp.api.getUnifiedConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });
      
      await unifiedConfig.loadConfig();
      
      // Check global params
      expect(container.querySelector('#global-temperature').value).toBe('0.8');
      expect(container.querySelector('#global-top-p').value).toBe('0.95');
      expect(container.querySelector('#global-max-tokens').value).toBe('3000');
      
      // Check questionAI config
      expect(container.querySelector('#questionAI-enabled').checked).toBe(true);
      expect(container.querySelector('#questionAI-provider').value).toBe('openai');
      expect(container.querySelector('#questionAI-prompt').value).toBe('You are a helpful assistant');
      expect(container.querySelector('#questionAI-temperature').value).toBe('0.7');
    });

    it('should handle empty configuration', async () => {
      mockApp.api.getUnifiedConfig.mockResolvedValue({
        success: true,
        config: null
      });
      
      await unifiedConfig.loadConfig();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('info', '暂无配置数据');
    });

    it('should handle API errors', async () => {
      mockApp.api.getUnifiedConfig.mockRejectedValue(new Error('Network error'));
      
      await unifiedConfig.loadConfig();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '加载配置失败: Network error');
    });
  });

  describe('saveConfig()', () => {
    beforeEach(async () => {
      container.innerHTML = await unifiedConfig.render();
      
      // Set some test values
      container.querySelector('#global-temperature').value = '0.9';
      container.querySelector('#global-top-p').value = '0.85';
      container.querySelector('#global-max-tokens').value = '4000';
      
      container.querySelector('#questionAI-enabled').checked = true;
      container.querySelector('#questionAI-provider').value = 'anthropic';
      container.querySelector('#questionAI-prompt').value = 'Test prompt';
      container.querySelector('#questionAI-temperature').value = '0.6';
    });

    it('should collect and save configuration data', async () => {
      mockApp.api.saveUnifiedConfig.mockResolvedValue({ success: true });
      
      await unifiedConfig.saveConfig();
      
      expect(mockApp.api.saveUnifiedConfig).toHaveBeenCalledWith({
        globalParams: {
          temperature: 0.9,
          topP: 0.85,
          maxTokens: 4000
        },
        aiServices: expect.objectContaining({
          questionAI: {
            enabled: true,
            provider: 'anthropic',
            prompt: 'Test prompt',
            temperature: 0.6,
            topP: 0.85,
            maxTokens: 4000
          }
        }),
        lastUpdated: expect.any(String)
      });
      
      expect(mockApp.showToast).toHaveBeenCalledWith('success', '配置已保存');
    });

    it('should validate configuration before saving', async () => {
      // Set invalid temperature
      container.querySelector('#global-temperature').value = '3';
      
      await unifiedConfig.saveConfig();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', 
        expect.stringContaining('Temperature必须在0到2之间')
      );
      expect(mockApp.api.saveUnifiedConfig).not.toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      mockApp.api.saveUnifiedConfig.mockRejectedValue(new Error('Save failed'));
      
      await unifiedConfig.saveConfig();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '保存失败: Save failed');
    });
  });

  describe('updateProviderFields()', () => {
    beforeEach(async () => {
      container.innerHTML = await unifiedConfig.render();
    });

    it('should show provider-specific fields', () => {
      unifiedConfig.updateProviderFields('questionAI', 'openai');
      
      const modelField = container.querySelector('.model-field[data-service="questionAI"]');
      expect(modelField.style.display).not.toBe('none');
    });

    it('should hide model field for providers without models', () => {
      unifiedConfig.updateProviderFields('questionAI', 'custom');
      
      const modelField = container.querySelector('.model-field[data-service="questionAI"]');
      expect(modelField.style.display).toBe('none');
    });

    it('should update available models based on provider', () => {
      unifiedConfig.updateProviderFields('questionAI', 'anthropic');
      
      const modelSelect = container.querySelector('#questionAI-model');
      const options = modelSelect.querySelectorAll('option');
      
      expect(options.length).toBeGreaterThan(0);
      expect(Array.from(options).some(opt => opt.value.includes('claude'))).toBe(true);
    });
  });

  describe('toggleServiceFields()', () => {
    beforeEach(async () => {
      container.innerHTML = await unifiedConfig.render();
    });

    it('should disable fields when service is disabled', () => {
      unifiedConfig.toggleServiceFields('questionAI', false);
      
      const configFields = container.querySelector('#questionAI-config');
      const inputs = configFields.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        if (input.id !== 'questionAI-enabled') {
          expect(input.disabled).toBe(true);
        }
      });
      
      expect(configFields.style.opacity).toBe('0.5');
    });

    it('should enable fields when service is enabled', () => {
      unifiedConfig.toggleServiceFields('questionAI', true);
      
      const configFields = container.querySelector('#questionAI-config');
      const inputs = configFields.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        if (input.id !== 'questionAI-enabled') {
          expect(input.disabled).toBe(false);
        }
      });
      
      expect(configFields.style.opacity).toBe('1');
    });
  });

  describe('validateConfig()', () => {
    it('should validate temperature range', () => {
      const config = {
        globalParams: { temperature: 2.5 }
      };
      
      const result = unifiedConfig.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('全局Temperature必须在0到2之间');
    });

    it('should validate topP range', () => {
      const config = {
        globalParams: { topP: 1.5 }
      };
      
      const result = unifiedConfig.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('全局Top P必须在0到1之间');
    });

    it('should validate maxTokens range', () => {
      const config = {
        globalParams: { maxTokens: -100 }
      };
      
      const result = unifiedConfig.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('全局Max Tokens必须大于0');
    });

    it('should validate AI service configurations', () => {
      const config = {
        globalParams: { temperature: 0.7, topP: 0.9, maxTokens: 2000 },
        aiServices: {
          questionAI: {
            enabled: true,
            provider: 'openai',
            temperature: 3 // Invalid
          }
        }
      };
      
      const result = unifiedConfig.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('问答AI Temperature必须在0到2之间');
    });

    it('should pass validation for correct config', () => {
      const config = {
        globalParams: { temperature: 0.7, topP: 0.9, maxTokens: 2000 },
        aiServices: {
          questionAI: {
            enabled: true,
            provider: 'openai',
            temperature: 0.8,
            topP: 0.95,
            maxTokens: 3000
          }
        }
      };
      
      const result = unifiedConfig.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getProviderModels()', () => {
    it('should return correct models for each provider', () => {
      expect(unifiedConfig.getProviderModels('openai')).toEqual([
        'gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'
      ]);
      
      expect(unifiedConfig.getProviderModels('anthropic')).toEqual([
        'claude-3-opus', 'claude-3-sonnet', 'claude-2.1'
      ]);
      
      expect(unifiedConfig.getProviderModels('google')).toEqual([
        'gemini-pro', 'palm-2'
      ]);
      
      expect(unifiedConfig.getProviderModels('unknown')).toEqual([]);
    });
  });

  describe('exportConfig()', () => {
    beforeEach(async () => {
      container.innerHTML = await unifiedConfig.render();
    });

    it('should export current configuration as JSON', async () => {
      const mockConfig = {
        globalParams: { temperature: 0.7 },
        aiServices: { questionAI: { enabled: true } }
      };
      
      // Mock the collectConfig method
      jest.spyOn(unifiedConfig, 'collectConfig').mockReturnValue(mockConfig);
      
      // Mock URL and document methods
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      const mockLink = { 
        href: '', 
        download: '', 
        click: jest.fn(),
        remove: jest.fn()
      };
      document.createElement = jest.fn(() => mockLink);
      document.body.appendChild = jest.fn();
      
      unifiedConfig.exportConfig();
      
      expect(mockLink.download).toBe('unified-config.json');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('importConfig()', () => {
    it('should import configuration from JSON file', async () => {
      const mockConfig = {
        globalParams: { temperature: 0.8 },
        aiServices: { questionAI: { enabled: true } }
      };
      
      const file = new File([JSON.stringify(mockConfig)], 'config.json', {
        type: 'application/json'
      });
      
      const applyConfigSpy = jest.spyOn(unifiedConfig, 'applyConfig');
      
      await unifiedConfig.importConfig(file);
      
      expect(applyConfigSpy).toHaveBeenCalledWith(mockConfig);
      expect(mockApp.showToast).toHaveBeenCalledWith('success', '配置已导入');
    });

    it('should handle invalid JSON files', async () => {
      const file = new File(['invalid json'], 'config.json', {
        type: 'application/json'
      });
      
      await unifiedConfig.importConfig(file);
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', 
        expect.stringContaining('导入失败')
      );
    });
  });
});