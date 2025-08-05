/**
 * Cost Analysis Module Tests
 * 测试成本分析和预算管理模块
 */

import { CostAnalyzer } from '../../../_app/modules/cost-analysis.js';

describe('CostAnalyzer', () => {
  let analyzer;
  let originalDate;
  let mockDate;

  beforeEach(() => {
    analyzer = new CostAnalyzer();
    
    // Mock Date for consistent testing
    mockDate = new Date('2025-01-15T10:00:00Z');
    originalDate = Date;
    global.Date = jest.fn((...args) => {
      return args.length ? new originalDate(...args) : new originalDate(mockDate);
    });
    global.Date.now = () => mockDate.getTime();
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  describe('initialization', () => {
    it('should initialize with empty data', () => {
      expect(analyzer.costs).toEqual([]);
      expect(analyzer.budgets.size).toBe(0);
      expect(analyzer.alerts).toEqual([]);
    });
  });

  describe('recordCost', () => {
    it('should record cost with all fields', () => {
      const result = analyzer.recordCost('OpenAI', 'GPT-4', 1.5);
      
      expect(result).toEqual({
        id: mockDate.getTime(),
        provider: 'OpenAI',
        service: 'GPT-4',
        amount: 1.5,
        currency: 'USD',
        timestamp: mockDate,
        date: '2025-01-15'
      });
      
      expect(analyzer.costs).toHaveLength(1);
      expect(analyzer.costs[0]).toEqual(result);
    });

    it('should record cost with custom currency', () => {
      const result = analyzer.recordCost('Anthropic', 'Claude', 2.0, 'EUR');
      
      expect(result.currency).toBe('EUR');
    });

    it('should check budget alerts when recording cost', () => {
      const checkSpy = jest.spyOn(analyzer, 'checkBudgetAlerts');
      
      analyzer.recordCost('OpenAI', 'GPT-4', 1.5);
      
      expect(checkSpy).toHaveBeenCalledWith('OpenAI', 'GPT-4');
    });
  });

  describe('setBudget', () => {
    it('should set budget with default period', () => {
      analyzer.setBudget('total', 1000);
      
      expect(analyzer.budgets.get('total')).toEqual({
        limit: 1000,
        period: 'monthly',
        spent: 0
      });
    });

    it('should set budget with custom period', () => {
      analyzer.setBudget('OpenAI', 500, 'weekly');
      
      expect(analyzer.budgets.get('OpenAI')).toEqual({
        limit: 500,
        period: 'weekly',
        spent: 0
      });
    });
  });

  describe('getCostStats', () => {
    beforeEach(() => {
      // Add costs across different dates
      analyzer.costs = [
        { provider: 'OpenAI', service: 'GPT-4', amount: 10, timestamp: new Date('2025-01-10'), date: '2025-01-10' },
        { provider: 'OpenAI', service: 'GPT-3.5', amount: 5, timestamp: new Date('2025-01-12'), date: '2025-01-12' },
        { provider: 'Anthropic', service: 'Claude', amount: 8, timestamp: new Date('2025-01-14'), date: '2025-01-14' },
        { provider: 'OpenAI', service: 'GPT-4', amount: 12, timestamp: new Date('2024-12-10'), date: '2024-12-10' }
      ];
    });

    it('should calculate monthly stats', () => {
      const stats = analyzer.getCostStats('monthly');
      
      expect(stats.total).toBe(23); // 10 + 5 + 8 (excluding December)
      expect(stats.byProvider).toEqual({
        OpenAI: 15,
        Anthropic: 8
      });
      expect(stats.byService).toEqual({
        'GPT-4': 10,
        'GPT-3.5': 5,
        'Claude': 8
      });
      expect(stats.count).toBe(3);
      expect(stats.period).toBe('monthly');
    });

    it('should calculate weekly stats', () => {
      const stats = analyzer.getCostStats('weekly');
      
      // Only costs from last 7 days (Jan 8-15)
      expect(stats.total).toBe(23); // All January costs
      expect(stats.count).toBe(3);
    });

    it('should calculate daily stats', () => {
      const stats = analyzer.getCostStats('daily');
      
      // Only costs from today (Jan 15)
      expect(stats.total).toBe(0);
      expect(stats.count).toBe(0);
    });

    it('should handle empty costs', () => {
      analyzer.costs = [];
      const stats = analyzer.getCostStats();
      
      expect(stats.total).toBe(0);
      expect(stats.byProvider).toEqual({});
      expect(stats.byService).toEqual({});
      expect(stats.count).toBe(0);
    });
  });

  describe('getCostTrend', () => {
    beforeEach(() => {
      analyzer.costs = [
        { date: '2025-01-13', amount: 10 },
        { date: '2025-01-13', amount: 5 },
        { date: '2025-01-14', amount: 8 },
        { date: '2025-01-15', amount: 12 }
      ];
    });

    it('should calculate daily trends', () => {
      const trends = analyzer.getCostTrend(3);
      
      expect(trends).toHaveLength(3);
      expect(trends).toEqual([
        { date: '2025-01-13', amount: 15, count: 2 },
        { date: '2025-01-14', amount: 8, count: 1 },
        { date: '2025-01-15', amount: 12, count: 1 }
      ]);
    });

    it('should include days with no costs', () => {
      const trends = analyzer.getCostTrend(5);
      
      expect(trends).toHaveLength(5);
      expect(trends[0]).toEqual({ date: '2025-01-11', amount: 0, count: 0 });
      expect(trends[1]).toEqual({ date: '2025-01-12', amount: 0, count: 0 });
    });

    it('should handle default 30 days', () => {
      const trends = analyzer.getCostTrend();
      
      expect(trends).toHaveLength(30);
    });
  });

  describe('checkBudgetAlerts', () => {
    beforeEach(() => {
      analyzer.setBudget('total', 100);
      analyzer.setBudget('OpenAI', 50);
      
      // Add costs to reach different budget levels
      analyzer.costs = [
        { provider: 'OpenAI', service: 'GPT-4', amount: 40, timestamp: mockDate, date: '2025-01-15' }
      ];
    });

    it('should create medium alert at 75% usage', () => {
      analyzer.costs[0].amount = 38; // 76% of OpenAI budget
      analyzer.checkBudgetAlerts('OpenAI', 'GPT-4');
      
      expect(analyzer.alerts).toHaveLength(1);
      expect(analyzer.alerts[0]).toMatchObject({
        type: 'budget',
        level: 'medium',
        key: 'total',
        message: expect.stringContaining('38.0%')
      });
    });

    it('should create high alert at 90% usage', () => {
      analyzer.costs[0].amount = 46; // 92% of OpenAI budget
      analyzer.checkBudgetAlerts('OpenAI', 'GPT-4');
      
      const providerAlert = analyzer.alerts.find(a => a.key === 'OpenAI');
      expect(providerAlert).toMatchObject({
        type: 'budget',
        level: 'high',
        key: 'OpenAI',
        message: expect.stringContaining('92.0%')
      });
    });

    it('should not duplicate alerts within 1 hour', () => {
      analyzer.costs[0].amount = 46;
      
      analyzer.checkBudgetAlerts('OpenAI', 'GPT-4');
      analyzer.checkBudgetAlerts('OpenAI', 'GPT-4');
      
      const openAIAlerts = analyzer.alerts.filter(a => a.key === 'OpenAI');
      expect(openAIAlerts).toHaveLength(1);
    });
  });

  describe('getBudgetStatus', () => {
    beforeEach(() => {
      analyzer.setBudget('total', 100);
      analyzer.setBudget('OpenAI', 50);
      analyzer.setBudget('Anthropic', 30);
      
      analyzer.costs = [
        { provider: 'OpenAI', service: 'GPT-4', amount: 40, timestamp: mockDate, date: '2025-01-15' },
        { provider: 'Anthropic', service: 'Claude', amount: 20, timestamp: mockDate, date: '2025-01-15' }
      ];
    });

    it('should calculate budget status for all budgets', () => {
      const status = analyzer.getBudgetStatus();
      
      expect(status.total).toEqual({
        limit: 100,
        spent: 60,
        remaining: 40,
        usage: 0.6,
        status: 'normal'
      });
      
      expect(status.OpenAI).toEqual({
        limit: 50,
        spent: 40,
        remaining: 10,
        usage: 0.8,
        status: 'warning'
      });
      
      expect(status.Anthropic).toEqual({
        limit: 30,
        spent: 20,
        remaining: 10,
        usage: 0.67,
        status: 'normal'
      });
    });

    it('should handle critical status', () => {
      analyzer.costs.push({ 
        provider: 'OpenAI', 
        service: 'GPT-4', 
        amount: 10, 
        timestamp: mockDate, 
        date: '2025-01-15' 
      });
      
      const status = analyzer.getBudgetStatus();
      
      expect(status.OpenAI.usage).toBe(1);
      expect(status.OpenAI.status).toBe('critical');
    });

    it('should handle overspending', () => {
      analyzer.costs[0].amount = 60; // Exceed OpenAI budget
      
      const status = analyzer.getBudgetStatus();
      
      expect(status.OpenAI.spent).toBe(60);
      expect(status.OpenAI.remaining).toBe(0);
      expect(status.OpenAI.usage).toBe(1.2);
      expect(status.OpenAI.status).toBe('critical');
    });
  });

  describe('exportData', () => {
    beforeEach(() => {
      analyzer.setBudget('total', 100);
      analyzer.recordCost('OpenAI', 'GPT-4', 10);
      analyzer.alerts.push({ type: 'budget', level: 'medium' });
    });

    it('should export data as JSON', () => {
      const exported = analyzer.exportData('json');
      const data = JSON.parse(exported);
      
      expect(data).toHaveProperty('costs');
      expect(data).toHaveProperty('budgets');
      expect(data).toHaveProperty('alerts');
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('exportDate');
      
      expect(data.costs).toHaveLength(1);
      expect(data.budgets.total).toEqual({ limit: 100, period: 'monthly', spent: 0 });
    });

    it('should export data as CSV', () => {
      const csv = analyzer.exportData('csv');
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('Date,Provider,Service,Amount,Currency');
      expect(lines[1]).toContain('OpenAI,GPT-4,10,USD');
    });

    it('should handle empty data export', () => {
      analyzer = new CostAnalyzer();
      
      const exported = analyzer.exportData();
      const data = JSON.parse(exported);
      
      expect(data.costs).toEqual([]);
      expect(data.budgets).toEqual({});
      expect(data.alerts).toEqual([]);
    });
  });

  describe('getStartDate', () => {
    it('should calculate start dates for different periods', () => {
      const now = new Date('2025-01-15T15:30:00Z');
      
      const daily = analyzer.getStartDate(now, 'daily');
      expect(daily.toISOString()).toBe('2025-01-15T00:00:00.000Z');
      
      const weekly = analyzer.getStartDate(now, 'weekly');
      expect(weekly.toISOString()).toBe('2025-01-08T15:30:00.000Z');
      
      const monthly = analyzer.getStartDate(now, 'monthly');
      expect(monthly.toISOString()).toBe('2024-12-15T15:30:00.000Z');
      
      const yearly = analyzer.getStartDate(now, 'yearly');
      expect(yearly.toISOString()).toBe('2024-01-15T15:30:00.000Z');
    });

    it('should default to monthly period', () => {
      const now = new Date('2025-01-15T15:30:00Z');
      const defaultPeriod = analyzer.getStartDate(now, 'invalid');
      const monthly = analyzer.getStartDate(now, 'monthly');
      
      expect(defaultPeriod.toISOString()).toBe(monthly.toISOString());
    });
  });

  describe('hasAlert', () => {
    it('should find recent alerts', () => {
      analyzer.alerts.push({
        key: 'OpenAI',
        level: 'high',
        timestamp: new Date()
      });
      
      expect(analyzer.hasAlert('OpenAI', 'high')).toBe(true);
      expect(analyzer.hasAlert('OpenAI', 'medium')).toBe(false);
      expect(analyzer.hasAlert('Anthropic', 'high')).toBe(false);
    });

    it('should ignore old alerts', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 2); // 2 hours ago
      
      analyzer.alerts.push({
        key: 'OpenAI',
        level: 'high',
        timestamp: oldDate
      });
      
      expect(analyzer.hasAlert('OpenAI', 'high')).toBe(false);
    });
  });
});