/**
 * Service Status Module Tests
 * 测试服务状态模块的核心功能
 */

import { ServiceStatus } from '../../../_pages/ai-service/service-status.js';

describe('ServiceStatus Module', () => {
  let serviceStatus;
  let mockApp;
  let container;

  beforeEach(() => {
    // Setup mock app context
    mockApp = createTestApp();
    serviceStatus = new ServiceStatus(mockApp);
    
    // Setup DOM container
    container = document.createElement('div');
    container.id = 'app-content';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    // Clear any intervals
    if (serviceStatus.refreshInterval) {
      clearInterval(serviceStatus.refreshInterval);
    }
  });

  describe('render()', () => {
    it('should render service status HTML correctly', async () => {
      const html = await serviceStatus.render();
      
      expect(html).toContain('service-status-container');
      expect(html).toContain('服务状态');
      expect(html).toContain('status-controls');
      expect(html).toContain('status-grid');
      expect(html).toContain('status-details');
    });

    it('should include control buttons', async () => {
      const html = await serviceStatus.render();
      
      expect(html).toContain('refresh-status');
      expect(html).toContain('toggle-auto-refresh');
      expect(html).toContain('export-status');
    });

    it('should include status summary section', async () => {
      const html = await serviceStatus.render();
      
      expect(html).toContain('status-summary');
      expect(html).toContain('总服务数');
      expect(html).toContain('在线服务');
      expect(html).toContain('故障服务');
      expect(html).toContain('平均响应时间');
    });
  });

  describe('bindEvents()', () => {
    beforeEach(async () => {
      container.innerHTML = await serviceStatus.render();
      serviceStatus.bindEvents();
    });

    it('should bind refresh button', () => {
      const refreshButton = container.querySelector('#refresh-status');
      const loadServiceStatusSpy = jest.spyOn(serviceStatus, 'loadServiceStatus');
      
      refreshButton.click();
      
      expect(loadServiceStatusSpy).toHaveBeenCalled();
    });

    it('should bind auto-refresh toggle', () => {
      const toggleButton = container.querySelector('#toggle-auto-refresh');
      const toggleAutoRefreshSpy = jest.spyOn(serviceStatus, 'toggleAutoRefresh');
      
      toggleButton.click();
      
      expect(toggleAutoRefreshSpy).toHaveBeenCalled();
    });

    it('should bind export button', () => {
      const exportButton = container.querySelector('#export-status');
      const exportStatusReportSpy = jest.spyOn(serviceStatus, 'exportStatusReport');
      
      exportButton.click();
      
      expect(exportStatusReportSpy).toHaveBeenCalled();
    });

    it('should load initial status', () => {
      const loadServiceStatusSpy = jest.spyOn(serviceStatus, 'loadServiceStatus');
      
      serviceStatus.bindEvents();
      
      expect(loadServiceStatusSpy).toHaveBeenCalled();
    });
  });

  describe('loadServiceStatus()', () => {
    beforeEach(async () => {
      container.innerHTML = await serviceStatus.render();
    });

    it('should load and display service status', async () => {
      const mockStatus = {
        success: true,
        services: {
          openai: {
            status: 'online',
            responseTime: 120,
            successRate: 99.5,
            lastCheck: '2025-01-28T10:00:00Z',
            endpoints: {
              chat: { status: 'healthy', latency: 100 },
              completion: { status: 'healthy', latency: 150 }
            }
          },
          anthropic: {
            status: 'offline',
            responseTime: 0,
            successRate: 0,
            lastCheck: '2025-01-28T10:00:00Z',
            error: 'Connection timeout'
          }
        },
        summary: {
          total: 2,
          online: 1,
          offline: 1,
          avgResponseTime: 120
        }
      };
      
      mockApp.api.getServiceStatus.mockResolvedValue(mockStatus);
      
      await serviceStatus.loadServiceStatus();
      
      // Check summary update
      const summaryCards = container.querySelectorAll('.summary-card .value');
      expect(summaryCards[0].textContent).toBe('2'); // Total
      expect(summaryCards[1].textContent).toBe('1'); // Online
      expect(summaryCards[2].textContent).toBe('1'); // Offline
      expect(summaryCards[3].textContent).toBe('120ms'); // Avg response
      
      // Check service cards
      const serviceCards = container.querySelectorAll('.service-card');
      expect(serviceCards.length).toBe(2);
    });

    it('should show loading state', async () => {
      mockApp.api.getServiceStatus.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      const promise = serviceStatus.loadServiceStatus();
      
      const refreshButton = container.querySelector('#refresh-status');
      expect(refreshButton.disabled).toBe(true);
      expect(refreshButton.textContent).toBe('刷新中...');
      
      await promise;
      
      expect(refreshButton.disabled).toBe(false);
      expect(refreshButton.textContent).toBe('刷新');
    });

    it('should handle API errors', async () => {
      mockApp.api.getServiceStatus.mockRejectedValue(new Error('Network error'));
      
      await serviceStatus.loadServiceStatus();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '加载服务状态失败: Network error');
    });
  });

  describe('displayServiceCards()', () => {
    beforeEach(async () => {
      container.innerHTML = await serviceStatus.render();
    });

    it('should create service cards with correct status', () => {
      const services = {
        openai: {
          status: 'online',
          responseTime: 100,
          successRate: 99.9,
          lastCheck: new Date().toISOString()
        },
        anthropic: {
          status: 'degraded',
          responseTime: 500,
          successRate: 85,
          lastCheck: new Date().toISOString()
        },
        google: {
          status: 'offline',
          responseTime: 0,
          successRate: 0,
          error: 'Service unavailable'
        }
      };
      
      serviceStatus.displayServiceCards(services);
      
      const cards = container.querySelectorAll('.service-card');
      expect(cards.length).toBe(3);
      
      // Check online service
      expect(cards[0].classList.contains('status-online')).toBe(true);
      expect(cards[0].textContent).toContain('OpenAI');
      expect(cards[0].textContent).toContain('99.9%');
      
      // Check degraded service
      expect(cards[1].classList.contains('status-degraded')).toBe(true);
      expect(cards[1].textContent).toContain('Anthropic');
      
      // Check offline service
      expect(cards[2].classList.contains('status-offline')).toBe(true);
      expect(cards[2].textContent).toContain('Google');
      expect(cards[2].textContent).toContain('Service unavailable');
    });

    it('should handle click events on service cards', () => {
      const services = {
        openai: { status: 'online', endpoints: {} }
      };
      
      const showServiceDetailsSpy = jest.spyOn(serviceStatus, 'showServiceDetails');
      
      serviceStatus.displayServiceCards(services);
      
      const card = container.querySelector('.service-card');
      card.click();
      
      expect(showServiceDetailsSpy).toHaveBeenCalledWith('openai', services.openai);
    });
  });

  describe('showServiceDetails()', () => {
    beforeEach(async () => {
      container.innerHTML = await serviceStatus.render();
    });

    it('should display detailed service information', () => {
      const serviceData = {
        status: 'online',
        responseTime: 150,
        successRate: 98.5,
        lastCheck: '2025-01-28T10:00:00Z',
        endpoints: {
          'chat/completions': { 
            status: 'healthy', 
            latency: 120, 
            lastSuccess: '2025-01-28T09:59:00Z' 
          },
          'embeddings': { 
            status: 'degraded', 
            latency: 300, 
            lastSuccess: '2025-01-28T09:55:00Z',
            error: 'High latency detected'
          }
        },
        metrics: {
          requestsPerMinute: 1500,
          errorRate: 1.5,
          p95Latency: 200,
          p99Latency: 350
        }
      };
      
      serviceStatus.showServiceDetails('openai', serviceData);
      
      const details = container.querySelector('#status-details');
      
      // Check service name
      expect(details.querySelector('h3').textContent).toBe('OpenAI 详细信息');
      
      // Check endpoints
      const endpointRows = details.querySelectorAll('.endpoint-row');
      expect(endpointRows.length).toBe(2);
      expect(endpointRows[0].textContent).toContain('chat/completions');
      expect(endpointRows[0].textContent).toContain('healthy');
      expect(endpointRows[1].textContent).toContain('degraded');
      
      // Check metrics
      expect(details.textContent).toContain('1500 RPM');
      expect(details.textContent).toContain('1.5%');
    });

    it('should show message when no endpoints available', () => {
      const serviceData = {
        status: 'online',
        endpoints: {}
      };
      
      serviceStatus.showServiceDetails('openai', serviceData);
      
      const details = container.querySelector('#status-details');
      expect(details.textContent).toContain('暂无端点信息');
    });
  });

  describe('toggleAutoRefresh()', () => {
    beforeEach(async () => {
      container.innerHTML = await serviceStatus.render();
    });

    it('should start auto-refresh when enabled', () => {
      jest.useFakeTimers();
      const loadServiceStatusSpy = jest.spyOn(serviceStatus, 'loadServiceStatus');
      
      serviceStatus.toggleAutoRefresh();
      
      expect(serviceStatus.autoRefreshEnabled).toBe(true);
      expect(serviceStatus.refreshInterval).toBeTruthy();
      
      // Fast forward 30 seconds
      jest.advanceTimersByTime(30000);
      
      expect(loadServiceStatusSpy).toHaveBeenCalledTimes(1);
      
      jest.useRealTimers();
    });

    it('should stop auto-refresh when disabled', () => {
      serviceStatus.autoRefreshEnabled = true;
      serviceStatus.refreshInterval = setInterval(() => {}, 30000);
      
      serviceStatus.toggleAutoRefresh();
      
      expect(serviceStatus.autoRefreshEnabled).toBe(false);
      expect(serviceStatus.refreshInterval).toBeNull();
    });

    it('should update button text', () => {
      const button = container.querySelector('#toggle-auto-refresh');
      
      serviceStatus.toggleAutoRefresh();
      expect(button.textContent).toBe('停止自动刷新');
      
      serviceStatus.toggleAutoRefresh();
      expect(button.textContent).toBe('自动刷新');
    });
  });

  describe('exportStatusReport()', () => {
    beforeEach(async () => {
      container.innerHTML = await serviceStatus.render();
      
      serviceStatus.currentStatus = {
        services: {
          openai: { status: 'online' },
          anthropic: { status: 'offline' }
        },
        summary: { total: 2, online: 1, offline: 1 }
      };
    });

    it('should export status report as JSON', () => {
      // Mock URL and document methods
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      const mockLink = { 
        href: '', 
        download: '', 
        click: jest.fn(),
        remove: jest.fn()
      };
      document.createElement = jest.fn((tag) => {
        if (tag === 'a') return mockLink;
        return document.createElement(tag);
      });
      
      serviceStatus.exportStatusReport();
      
      expect(mockLink.download).toMatch(/service-status-\d{4}-\d{2}-\d{2}\.json/);
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('getStatusColor()', () => {
    it('should return correct colors for status', () => {
      expect(serviceStatus.getStatusColor('online')).toBe('#52c41a');
      expect(serviceStatus.getStatusColor('degraded')).toBe('#faad14');
      expect(serviceStatus.getStatusColor('offline')).toBe('#ff4d4f');
      expect(serviceStatus.getStatusColor('unknown')).toBe('#8c8c8c');
    });
  });

  describe('getStatusIcon()', () => {
    it('should return correct icons for status', () => {
      expect(serviceStatus.getStatusIcon('online')).toBe('✓');
      expect(serviceStatus.getStatusIcon('degraded')).toBe('!');
      expect(serviceStatus.getStatusIcon('offline')).toBe('✗');
      expect(serviceStatus.getStatusIcon('unknown')).toBe('?');
    });
  });

  describe('formatUptime()', () => {
    it('should format uptime percentage correctly', () => {
      expect(serviceStatus.formatUptime(99.99)).toBe('99.99%');
      expect(serviceStatus.formatUptime(95.5)).toBe('95.50%');
      expect(serviceStatus.formatUptime(0)).toBe('0.00%');
      expect(serviceStatus.formatUptime(null)).toBe('N/A');
    });
  });

  describe('getProviderDisplayName()', () => {
    it('should return correct display names', () => {
      expect(serviceStatus.getProviderDisplayName('openai')).toBe('OpenAI');
      expect(serviceStatus.getProviderDisplayName('anthropic')).toBe('Anthropic');
      expect(serviceStatus.getProviderDisplayName('google')).toBe('Google');
      expect(serviceStatus.getProviderDisplayName('unknown')).toBe('Unknown');
    });
  });
});