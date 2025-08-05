/**
 * Billing Page Tests
 * 测试计费管理页面
 */

import BillingPage from '../../../_pages/billing/index.js';

describe('BillingPage', () => {
  beforeEach(() => {
    // Mock console.log to capture output
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('page rendering', () => {
    it('should render billing page HTML', async () => {
      const html = await BillingPage();
      
      expect(html).toContain('billing-page');
      expect(html).toContain('💰 计费管理');
      expect(html).toContain('管理用户计费和订阅');
    });

    it('should log initialization messages', async () => {
      await BillingPage();
      
      expect(console.log).toHaveBeenCalledWith('💰 Initializing Billing page...');
      expect(console.log).toHaveBeenCalledWith('✅ Billing page initialized');
    });

    it('should render statistics section', async () => {
      const html = await BillingPage();
      
      expect(html).toContain('stats-section');
      expect(html).toContain('本月收入');
      expect(html).toContain('¥88,888');
      expect(html).toContain('活跃订阅');
      expect(html).toContain('456');
      expect(html).toContain('平均客单价');
      expect(html).toContain('¥195');
    });

    it('should render positive changes for all stats', async () => {
      const html = await BillingPage();
      
      expect(html).toContain('stat-change positive">+15%');
      expect(html).toContain('stat-change positive">+8%');
      expect(html).toContain('stat-change positive">+3%');
    });

    it('should render billing table', async () => {
      const html = await BillingPage();
      
      expect(html).toContain('billing-table-section');
      expect(html).toContain('最近订单');
      expect(html).toContain('导出报表');
      expect(html).toContain('billing-table');
    });

    it('should render table headers', async () => {
      const html = await BillingPage();
      
      expect(html).toContain('<th>订单ID</th>');
      expect(html).toContain('<th>用户</th>');
      expect(html).toContain('<th>套餐</th>');
      expect(html).toContain('<th>金额</th>');
      expect(html).toContain('<th>状态</th>');
      expect(html).toContain('<th>时间</th>');
    });

    it('should render sample order data', async () => {
      const html = await BillingPage();
      
      // Order 1
      expect(html).toContain('#ORD-001');
      expect(html).toContain('张三');
      expect(html).toContain('专业版');
      expect(html).toContain('¥299');
      expect(html).toContain('badge success">已支付');
      expect(html).toContain('2025-01-28 10:30');
      
      // Order 2
      expect(html).toContain('#ORD-002');
      expect(html).toContain('李四');
      expect(html).toContain('基础版');
      expect(html).toContain('¥99');
      
      // Order 3
      expect(html).toContain('#ORD-003');
      expect(html).toContain('王五');
      expect(html).toContain('企业版');
      expect(html).toContain('¥999');
      expect(html).toContain('badge pending">待支付');
    });

    it('should render export button', async () => {
      const html = await BillingPage();
      
      expect(html).toContain('btn-primary">导出报表');
    });

    it('should contain proper CSS classes', async () => {
      const html = await BillingPage();
      
      expect(html).toContain('class="billing-page"');
      expect(html).toContain('class="page-header"');
      expect(html).toContain('class="content-grid"');
      expect(html).toContain('class="stat-card"');
      expect(html).toContain('class="stat-number"');
      expect(html).toContain('class="table-header"');
    });
  });

  describe('function type', () => {
    it('should be an async function', () => {
      expect(BillingPage).toBeInstanceOf(Function);
      expect(BillingPage.constructor.name).toBe('AsyncFunction');
    });

    it('should return a promise', () => {
      const result = BillingPage();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('data structure', () => {
    it('should contain structured content sections', async () => {
      const html = await BillingPage();
      
      // Check for proper nesting
      expect(html).toMatch(/<div class="billing-page">[\s\S]*<\/div>/);
      expect(html).toMatch(/<div class="page-header">[\s\S]*<\/div>/);
      expect(html).toMatch(/<div class="content-grid">[\s\S]*<\/div>/);
    });

    it('should have proper table structure', async () => {
      const html = await BillingPage();
      
      expect(html).toMatch(/<table>[\s\S]*<\/table>/);
      expect(html).toMatch(/<thead>[\s\S]*<\/thead>/);
      expect(html).toMatch(/<tbody>[\s\S]*<\/tbody>/);
    });
  });
});