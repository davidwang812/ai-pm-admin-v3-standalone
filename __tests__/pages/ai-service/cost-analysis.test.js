/**
 * Cost Analysis Module Tests
 * 测试成本分析模块的核心功能
 */

import { CostAnalysis } from '../../../_pages/ai-service/cost-analysis.js';

describe('CostAnalysis Module', () => {
  let costAnalysis;
  let mockApp;
  let container;

  beforeEach(() => {
    // Setup mock app context
    mockApp = createTestApp();
    costAnalysis = new CostAnalysis(mockApp);
    
    // Setup DOM container
    container = document.createElement('div');
    container.id = 'app-content';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('render()', () => {
    it('should render cost analysis HTML correctly', async () => {
      const html = await costAnalysis.render();
      
      expect(html).toContain('cost-analysis-container');
      expect(html).toContain('成本分析');
      expect(html).toContain('cost-date-range');
      expect(html).toContain('cost-summary');
      expect(html).toContain('cost-charts');
      expect(html).toContain('cost-details');
    });

    it('should include all summary cards', async () => {
      const html = await costAnalysis.render();
      
      expect(html).toContain('总成本');
      expect(html).toContain('总请求数');
      expect(html).toContain('平均单价');
      expect(html).toContain('最高消费服务');
    });

    it('should include date range selector with correct options', async () => {
      const html = await costAnalysis.render();
      
      expect(html).toContain('value="today"');
      expect(html).toContain('value="week"');
      expect(html).toContain('value="month" selected');
      expect(html).toContain('value="year"');
    });
  });

  describe('bindEvents()', () => {
    beforeEach(async () => {
      container.innerHTML = await costAnalysis.render();
      costAnalysis.bindEvents();
    });

    it('should bind change event to date range selector', () => {
      const selector = document.getElementById('cost-date-range');
      const loadCostDataSpy = jest.spyOn(costAnalysis, 'loadCostData');
      
      selector.value = 'week';
      selector.dispatchEvent(new Event('change'));
      
      expect(loadCostDataSpy).toHaveBeenCalledWith('week');
    });

    it('should initialize charts when Chart.js is available', () => {
      global.Chart = jest.fn();
      const initChartsSpy = jest.spyOn(costAnalysis, 'initCharts');
      
      costAnalysis.bindEvents();
      
      expect(initChartsSpy).toHaveBeenCalled();
    });

    it('should load initial data on bindEvents', () => {
      const loadCostDataSpy = jest.spyOn(costAnalysis, 'loadCostData');
      
      costAnalysis.bindEvents();
      
      expect(loadCostDataSpy).toHaveBeenCalledWith('month');
    });
  });

  describe('loadCostData()', () => {
    it('should call API and update display on success', async () => {
      const mockData = {
        success: true,
        totalCost: 150.50,
        totalRequests: 1500,
        avgCost: 0.1003,
        topService: 'openai - gpt-4',
        trends: [{ period: '2025-01-01', cost: 10 }],
        providers: [{ provider: 'openai', cost: 100 }],
        details: [],
        metadata: { isSimulated: false }
      };
      
      mockApp.api.getCostAnalysis.mockResolvedValue(mockData);
      const updateCostDisplaySpy = jest.spyOn(costAnalysis, 'updateCostDisplay');
      const updateChartsSpy = jest.spyOn(costAnalysis, 'updateCharts');
      
      await costAnalysis.loadCostData('month');
      
      expect(mockApp.api.getCostAnalysis).toHaveBeenCalledWith('month');
      expect(updateCostDisplaySpy).toHaveBeenCalledWith(mockData);
      expect(updateChartsSpy).toHaveBeenCalledWith(mockData);
    });

    it('should show error toast on API failure', async () => {
      mockApp.api.getCostAnalysis.mockRejectedValue(new Error('Network error'));
      
      await costAnalysis.loadCostData('month');
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '获取成本数据失败: Network error');
    });
  });

  describe('updateCostDisplay()', () => {
    beforeEach(async () => {
      container.innerHTML = await costAnalysis.render();
    });

    it('should update summary cards with formatted values', () => {
      const data = {
        totalCost: 1234.56,
        totalRequests: 10000,
        avgCost: 0.1234,
        topService: 'anthropic - claude-3',
        details: []
      };
      
      costAnalysis.updateCostDisplay(data);
      
      const summaryValues = document.querySelectorAll('.summary-value');
      expect(summaryValues[0].textContent).toBe('¥1234.56');
      expect(summaryValues[1].textContent).toBe('10,000');
      expect(summaryValues[2].textContent).toBe('¥0.1234');
      expect(summaryValues[3].textContent).toBe('anthropic - claude-3');
    });

    it('should update details table with records', () => {
      const data = {
        details: [
          {
            timestamp: '2025-01-01T10:00:00Z',
            provider: 'openai',
            model: 'gpt-4',
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.045
          }
        ]
      };
      
      costAnalysis.updateCostDisplay(data);
      
      const tbody = document.getElementById('cost-details-tbody');
      expect(tbody.innerHTML).toContain('openai');
      expect(tbody.innerHTML).toContain('gpt-4');
      expect(tbody.innerHTML).toContain('1,000');
      expect(tbody.innerHTML).toContain('500');
      expect(tbody.innerHTML).toContain('¥0.0450');
    });

    it('should show empty state when no details', () => {
      const data = { details: [] };
      
      costAnalysis.updateCostDisplay(data);
      
      const tbody = document.getElementById('cost-details-tbody');
      expect(tbody.innerHTML).toContain('暂无数据');
    });

    it('should show data source indicator for simulated data', () => {
      const data = {
        metadata: { isSimulated: true },
        details: []
      };
      
      costAnalysis.updateCostDisplay(data);
      
      // Since showDataSourceIndicator is called, we can check if it was invoked
      const showIndicatorSpy = jest.spyOn(costAnalysis, 'showDataSourceIndicator');
      costAnalysis.updateCostDisplay(data);
      
      expect(showIndicatorSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('updateCharts()', () => {
    let mockTrendChart;
    let mockProviderChart;

    beforeEach(() => {
      mockTrendChart = {
        data: { labels: [], datasets: [{ data: [] }] },
        update: jest.fn()
      };
      mockProviderChart = {
        data: { labels: [], datasets: [{ data: [] }] },
        update: jest.fn()
      };
      
      Chart.getChart = jest.fn((id) => {
        if (id === 'cost-trend-chart') return mockTrendChart;
        if (id === 'provider-cost-chart') return mockProviderChart;
        return null;
      });
    });

    it('should update trend chart with new data', () => {
      const data = {
        trends: [
          { period: '2025-01-01', cost: 10 },
          { period: '2025-01-02', cost: 20 },
          { period: '2025-01-03', cost: 15 }
        ]
      };
      
      costAnalysis.updateCharts(data);
      
      expect(mockTrendChart.data.labels).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
      expect(mockTrendChart.data.datasets[0].data).toEqual([10, 20, 15]);
      expect(mockTrendChart.update).toHaveBeenCalled();
    });

    it('should update provider chart with new data', () => {
      const data = {
        providers: [
          { provider: 'openai', cost: 100 },
          { provider: 'anthropic', cost: 80 },
          { provider: 'google', cost: 50 }
        ]
      };
      
      costAnalysis.updateCharts(data);
      
      expect(mockProviderChart.data.labels).toEqual(['openai', 'anthropic', 'google']);
      expect(mockProviderChart.data.datasets[0].data).toEqual([100, 80, 50]);
      expect(mockProviderChart.update).toHaveBeenCalled();
    });
  });

  describe('showDataSourceIndicator()', () => {
    beforeEach(async () => {
      container.innerHTML = await costAnalysis.render();
    });

    it('should add indicator for simulated data', () => {
      costAnalysis.showDataSourceIndicator(true);
      
      const indicator = document.querySelector('.data-source-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator.textContent).toBe('模拟数据');
      expect(indicator.style.background).toBe('#fff3cd');
    });

    it('should add indicator for real data', () => {
      costAnalysis.showDataSourceIndicator(false);
      
      const indicator = document.querySelector('.data-source-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator.textContent).toBe('真实数据');
      expect(indicator.style.background).toBe('#d4edda');
    });

    it('should update existing indicator', () => {
      costAnalysis.showDataSourceIndicator(true);
      costAnalysis.showDataSourceIndicator(false);
      
      const indicators = document.querySelectorAll('.data-source-indicator');
      expect(indicators.length).toBe(1);
      expect(indicators[0].textContent).toBe('真实数据');
    });
  });

  describe('initCharts()', () => {
    beforeEach(async () => {
      container.innerHTML = await costAnalysis.render();
    });

    it('should initialize trend chart with correct configuration', () => {
      costAnalysis.initCharts();
      
      expect(Chart).toHaveBeenCalledWith(
        document.getElementById('cost-trend-chart'),
        expect.objectContaining({
          type: 'line',
          data: expect.objectContaining({
            datasets: expect.arrayContaining([
              expect.objectContaining({
                label: '成本趋势',
                borderColor: '#1890ff'
              })
            ])
          })
        })
      );
    });

    it('should initialize provider chart with correct configuration', () => {
      costAnalysis.initCharts();
      
      expect(Chart).toHaveBeenCalledWith(
        document.getElementById('provider-cost-chart'),
        expect.objectContaining({
          type: 'doughnut',
          data: expect.objectContaining({
            labels: ['OpenAI', 'Anthropic', 'Google', 'Others']
          })
        })
      );
    });
  });
});