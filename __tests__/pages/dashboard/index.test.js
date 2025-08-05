/**
 * 仪表板页面测试
 */

import { jest } from '@jest/globals';
import { mockDOM, mockLocalStorage } from '../../setup/test-utils.js';

describe('Dashboard Module', () => {
  let DashboardModule;
  let dashboard;
  let mockApp;

  beforeEach(async () => {
    // 设置DOM环境
    mockDOM();
    mockLocalStorage();

    // Mock应用对象
    mockApp = {
      api: {
        get: jest.fn(),
        post: jest.fn()
      },
      auth: {
        getCurrentUser: jest.fn().mockReturnValue({
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User'
        })
      },
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      showToast: jest.fn(),
      formatters: {
        currency: jest.fn(v => `¥${v}`),
        number: jest.fn(v => v.toLocaleString()),
        percentage: jest.fn(v => `${(v * 100).toFixed(2)}%`)
      }
    };

    // Mock Chart.js
    global.Chart = jest.fn().mockImplementation(() => ({
      update: jest.fn(),
      destroy: jest.fn(),
      data: { labels: [], datasets: [] },
      options: {}
    }));

    const module = await import('../../../_pages/dashboard/index.js');
    DashboardModule = module.default;
    dashboard = new DashboardModule();
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (dashboard && dashboard.destroy) {
      dashboard.destroy();
    }
  });

  describe('初始化', () => {
    test('应该正确初始化模块', async () => {
      expect(dashboard.name).toBe('dashboard');
      expect(dashboard.charts).toEqual({});
      expect(dashboard.refreshInterval).toBeNull();
    });

    test('应该初始化并加载数据', async () => {
      mockApp.api.get.mockResolvedValueOnce({
        success: true,
        data: {
          totalUsers: 1500,
          totalRevenue: 125000,
          totalRequests: 450000,
          activeServices: 8
        }
      });

      await dashboard.init(mockApp);

      expect(mockApp.api.get).toHaveBeenCalledWith('/admin/dashboard/summary');
      expect(dashboard.app).toBe(mockApp);
    });

    test('应该处理初始化错误', async () => {
      mockApp.api.get.mockRejectedValue(new Error('API Error'));

      await dashboard.init(mockApp);

      expect(mockApp.showToast).toHaveBeenCalledWith('error', expect.stringContaining('加载失败'));
    });
  });

  describe('渲染功能', () => {
    beforeEach(async () => {
      await dashboard.init(mockApp);
    });

    test('应该渲染仪表板布局', () => {
      const html = dashboard.render();

      expect(html).toContain('dashboard-container');
      expect(html).toContain('系统概览');
      expect(html).toContain('统计卡片');
      expect(html).toContain('图表分析');
    });

    test('应该包含所有统计卡片', () => {
      const html = dashboard.render();

      expect(html).toContain('total-users');
      expect(html).toContain('total-revenue');
      expect(html).toContain('total-requests');
      expect(html).toContain('active-services');
    });

    test('应该包含所有图表容器', () => {
      const html = dashboard.render();

      expect(html).toContain('revenue-chart');
      expect(html).toContain('usage-chart');
      expect(html).toContain('service-chart');
      expect(html).toContain('user-growth-chart');
    });
  });

  describe('数据加载', () => {
    beforeEach(async () => {
      await dashboard.init(mockApp);
      document.body.innerHTML = dashboard.render();
    });

    test('应该加载概要数据', async () => {
      const summaryData = {
        totalUsers: 1500,
        totalRevenue: 125000,
        totalRequests: 450000,
        activeServices: 8,
        trends: {
          userGrowth: 0.15,
          revenueGrowth: 0.23,
          requestGrowth: 0.08
        }
      };

      mockApp.api.get.mockResolvedValue({
        success: true,
        data: summaryData
      });

      await dashboard.loadSummaryData();

      expect(document.getElementById('total-users').textContent).toContain('1,500');
      expect(document.getElementById('total-revenue').textContent).toContain('¥125000');
      expect(document.getElementById('total-requests').textContent).toContain('450,000');
      expect(document.getElementById('active-services').textContent).toContain('8');
    });

    test('应该显示趋势指标', async () => {
      const summaryData = {
        totalUsers: 1000,
        trends: {
          userGrowth: 0.15,
          revenueGrowth: -0.05
        }
      };

      mockApp.api.get.mockResolvedValue({
        success: true,
        data: summaryData
      });

      await dashboard.loadSummaryData();

      const userTrend = document.querySelector('#user-trend');
      expect(userTrend.classList.contains('trend-up')).toBe(true);
      expect(userTrend.textContent).toContain('+15.00%');

      const revenueTrend = document.querySelector('#revenue-trend');
      expect(revenueTrend.classList.contains('trend-down')).toBe(true);
      expect(revenueTrend.textContent).toContain('-5.00%');
    });
  });

  describe('图表功能', () => {
    beforeEach(async () => {
      await dashboard.init(mockApp);
      document.body.innerHTML = dashboard.render();
    });

    test('应该创建收入趋势图表', async () => {
      const chartData = {
        labels: ['1月', '2月', '3月'],
        datasets: [{
          label: '收入',
          data: [10000, 15000, 20000]
        }]
      };

      mockApp.api.get.mockResolvedValue({
        success: true,
        data: chartData
      });

      await dashboard.loadRevenueChart();

      expect(Chart).toHaveBeenCalledWith(
        expect.any(Object), // canvas context
        expect.objectContaining({
          type: 'line',
          data: chartData
        })
      );
    });

    test('应该创建使用量图表', async () => {
      const usageData = {
        labels: ['OpenAI', 'Google', 'Anthropic'],
        data: [45000, 35000, 20000]
      };

      mockApp.api.get.mockResolvedValue({
        success: true,
        data: usageData
      });

      await dashboard.loadUsageChart();

      expect(Chart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'doughnut',
          data: expect.objectContaining({
            labels: usageData.labels,
            datasets: expect.arrayContaining([
              expect.objectContaining({
                data: usageData.data
              })
            ])
          })
        })
      );
    });

    test('应该更新现有图表', async () => {
      // 第一次创建图表
      await dashboard.loadRevenueChart();
      const firstChart = dashboard.charts.revenue;

      // 第二次应该更新而不是创建新的
      await dashboard.loadRevenueChart();
      
      expect(firstChart.update).toHaveBeenCalled();
      expect(dashboard.charts.revenue).toBe(firstChart);
    });
  });

  describe('实时更新', () => {
    beforeEach(async () => {
      await dashboard.init(mockApp);
      document.body.innerHTML = dashboard.render();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该设置自动刷新', () => {
      const refreshInterval = 30000; // 30秒
      dashboard.startAutoRefresh(refreshInterval);

      expect(dashboard.refreshInterval).toBeDefined();

      // 模拟时间流逝
      jest.advanceTimersByTime(refreshInterval);

      expect(mockApp.api.get).toHaveBeenCalledWith('/admin/dashboard/summary');
    });

    test('应该停止自动刷新', () => {
      dashboard.startAutoRefresh(30000);
      const intervalId = dashboard.refreshInterval;

      dashboard.stopAutoRefresh();

      expect(dashboard.refreshInterval).toBeNull();
      
      // 确保定时器被清除
      jest.advanceTimersByTime(60000);
      const callCount = mockApp.api.get.mock.calls.length;
      jest.advanceTimersByTime(30000);
      expect(mockApp.api.get).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('事件处理', () => {
    beforeEach(async () => {
      await dashboard.init(mockApp);
      document.body.innerHTML = dashboard.render();
      await dashboard.bindEvents();
    });

    test('应该处理时间范围切换', async () => {
      const rangeSelect = document.getElementById('time-range');
      rangeSelect.value = 'week';
      
      const changeEvent = new Event('change');
      rangeSelect.dispatchEvent(changeEvent);

      expect(mockApp.api.get).toHaveBeenCalledWith(
        expect.stringContaining('range=week')
      );
    });

    test('应该处理刷新按钮点击', async () => {
      const refreshButton = document.getElementById('refresh-button');
      
      refreshButton.click();

      expect(mockApp.showLoading).toHaveBeenCalled();
      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockApp.hideLoading).toHaveBeenCalled();
    });

    test('应该处理导出功能', async () => {
      const exportButton = document.getElementById('export-data');
      
      // Mock创建下载链接
      const createElementSpy = jest.spyOn(document, 'createElement');
      const clickSpy = jest.fn();
      createElementSpy.mockReturnValue({
        click: clickSpy,
        setAttribute: jest.fn(),
        style: {}
      });

      exportButton.click();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('响应式设计', () => {
    test('应该适配移动端布局', () => {
      // 模拟移动端窗口大小
      global.innerWidth = 375;
      
      const html = dashboard.render();
      
      expect(html).toContain('dashboard-mobile');
    });

    test('应该处理窗口大小变化', async () => {
      await dashboard.init(mockApp);
      await dashboard.bindEvents();

      // 改变窗口大小
      global.innerWidth = 768;
      window.dispatchEvent(new Event('resize'));

      // 图表应该重新渲染
      if (dashboard.charts.revenue) {
        expect(dashboard.charts.revenue.update).toHaveBeenCalled();
      }
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await dashboard.init(mockApp);
      document.body.innerHTML = dashboard.render();
    });

    test('应该处理数据加载失败', async () => {
      mockApp.api.get.mockRejectedValue(new Error('Network error'));

      await dashboard.loadSummaryData();

      expect(mockApp.showToast).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('加载失败')
      );
    });

    test('应该处理图表渲染错误', async () => {
      Chart.mockImplementationOnce(() => {
        throw new Error('Chart render error');
      });

      await dashboard.loadRevenueChart();

      expect(mockApp.showToast).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('图表渲染失败')
      );
    });
  });

  describe('生命周期', () => {
    test('应该正确销毁模块', async () => {
      await dashboard.init(mockApp);
      
      // 创建一些图表
      dashboard.charts.revenue = new Chart();
      dashboard.charts.usage = new Chart();
      
      // 启动自动刷新
      dashboard.startAutoRefresh(30000);

      dashboard.destroy();

      // 验证图表被销毁
      expect(dashboard.charts.revenue.destroy).toHaveBeenCalled();
      expect(dashboard.charts.usage.destroy).toHaveBeenCalled();
      
      // 验证定时器被清除
      expect(dashboard.refreshInterval).toBeNull();
      
      // 验证图表对象被清空
      expect(dashboard.charts).toEqual({});
    });
  });
});