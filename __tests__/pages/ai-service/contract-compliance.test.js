/**
 * Contract Compliance Module Tests
 * 测试契约合规模块的核心功能
 */

import { ContractCompliance } from '../../../_pages/ai-service/contract-compliance.js';

describe('ContractCompliance Module', () => {
  let contractCompliance;
  let mockApp;
  let container;

  beforeEach(() => {
    // Setup mock app context
    mockApp = createTestApp();
    contractCompliance = new ContractCompliance(mockApp);
    
    // Setup DOM container
    container = document.createElement('div');
    container.id = 'app-content';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('render()', () => {
    it('should render contract compliance HTML correctly', async () => {
      const html = await contractCompliance.render();
      
      expect(html).toContain('contract-compliance-container');
      expect(html).toContain('契约合规');
      expect(html).toContain('compliance-summary');
      expect(html).toContain('contract-details');
      expect(html).toContain('validation-actions');
    });

    it('should include all compliance sections', async () => {
      const html = await contractCompliance.render();
      
      expect(html).toContain('数据库契约');
      expect(html).toContain('API契约');
      expect(html).toContain('配置契约');
      expect(html).toContain('安全契约');
    });

    it('should include action buttons', async () => {
      const html = await contractCompliance.render();
      
      expect(html).toContain('run-validation');
      expect(html).toContain('auto-fix');
      expect(html).toContain('export-report');
    });
  });

  describe('bindEvents()', () => {
    beforeEach(async () => {
      container.innerHTML = await contractCompliance.render();
      contractCompliance.bindEvents();
    });

    it('should bind run validation button', () => {
      const runButton = container.querySelector('#run-validation');
      const runValidationSpy = jest.spyOn(contractCompliance, 'runValidation');
      
      runButton.click();
      
      expect(runValidationSpy).toHaveBeenCalled();
    });

    it('should bind auto fix button', () => {
      const autoFixButton = container.querySelector('#auto-fix');
      const autoFixIssuesSpy = jest.spyOn(contractCompliance, 'autoFixIssues');
      
      autoFixButton.click();
      
      expect(autoFixIssuesSpy).toHaveBeenCalled();
    });

    it('should bind export report button', () => {
      const exportButton = container.querySelector('#export-report');
      const exportReportSpy = jest.spyOn(contractCompliance, 'exportReport');
      
      exportButton.click();
      
      expect(exportReportSpy).toHaveBeenCalled();
    });

    it('should load initial compliance status', () => {
      const loadComplianceStatusSpy = jest.spyOn(contractCompliance, 'loadComplianceStatus');
      
      contractCompliance.bindEvents();
      
      expect(loadComplianceStatusSpy).toHaveBeenCalled();
    });
  });

  describe('loadComplianceStatus()', () => {
    beforeEach(async () => {
      container.innerHTML = await contractCompliance.render();
    });

    it('should load and display compliance status', async () => {
      const mockStatus = {
        success: true,
        summary: {
          totalChecks: 100,
          passed: 85,
          failed: 10,
          warnings: 5,
          complianceRate: 85
        },
        sections: {
          database: { passed: 20, failed: 2, warnings: 1 },
          api: { passed: 25, failed: 3, warnings: 2 },
          config: { passed: 20, failed: 3, warnings: 1 },
          security: { passed: 20, failed: 2, warnings: 1 }
        },
        issues: []
      };
      
      mockApp.api.getContractStatus.mockResolvedValue(mockStatus);
      
      await contractCompliance.loadComplianceStatus();
      
      expect(mockApp.api.getContractStatus).toHaveBeenCalled();
      
      // Check summary display
      const summaryCards = container.querySelectorAll('.summary-card .value');
      expect(summaryCards[0].textContent).toBe('85%'); // Compliance rate
      expect(summaryCards[1].textContent).toBe('85/100'); // Passed checks
      expect(summaryCards[2].textContent).toBe('10'); // Failed checks
      expect(summaryCards[3].textContent).toBe('5'); // Warnings
    });

    it('should display section details', async () => {
      const mockStatus = {
        success: true,
        sections: {
          database: { passed: 20, failed: 2, warnings: 1, details: [] },
          api: { passed: 25, failed: 3, warnings: 2, details: [] }
        }
      };
      
      mockApp.api.getContractStatus.mockResolvedValue(mockStatus);
      
      await contractCompliance.loadComplianceStatus();
      
      // Check section cards
      const sectionCards = container.querySelectorAll('.section-card');
      expect(sectionCards.length).toBeGreaterThan(0);
      
      const dbCard = Array.from(sectionCards).find(card => 
        card.textContent.includes('数据库契约')
      );
      expect(dbCard).toBeTruthy();
      expect(dbCard.textContent).toContain('20'); // Passed
      expect(dbCard.textContent).toContain('2');  // Failed
    });

    it('should handle API errors', async () => {
      mockApp.api.getContractStatus.mockRejectedValue(new Error('Network error'));
      
      await contractCompliance.loadComplianceStatus();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '加载合规状态失败: Network error');
    });
  });

  describe('runValidation()', () => {
    beforeEach(async () => {
      container.innerHTML = await contractCompliance.render();
    });

    it('should run validation and update display', async () => {
      const mockResult = {
        success: true,
        summary: {
          totalChecks: 100,
          passed: 90,
          failed: 5,
          warnings: 5
        },
        newIssues: 3,
        fixedIssues: 2
      };
      
      mockApp.api.runContractValidation.mockResolvedValue(mockResult);
      
      await contractCompliance.runValidation();
      
      expect(mockApp.api.runContractValidation).toHaveBeenCalled();
      expect(mockApp.showToast).toHaveBeenCalledWith('success', 
        expect.stringContaining('验证完成')
      );
    });

    it('should show loading state during validation', async () => {
      const button = container.querySelector('#run-validation');
      
      mockApp.api.runContractValidation.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      const promise = contractCompliance.runValidation();
      
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe('验证中...');
      
      await promise;
      
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('运行验证');
    });

    it('should handle validation errors', async () => {
      mockApp.api.runContractValidation.mockRejectedValue(new Error('Validation failed'));
      
      await contractCompliance.runValidation();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('error', '验证失败: Validation failed');
    });
  });

  describe('autoFixIssues()', () => {
    beforeEach(async () => {
      container.innerHTML = await contractCompliance.render();
      
      // Mock some issues
      contractCompliance.currentIssues = [
        { id: 1, type: 'database', severity: 'error', autoFixable: true },
        { id: 2, type: 'config', severity: 'warning', autoFixable: true },
        { id: 3, type: 'api', severity: 'error', autoFixable: false }
      ];
    });

    it('should fix auto-fixable issues', async () => {
      mockApp.api.post.mockResolvedValue({
        success: true,
        fixedCount: 2,
        failedCount: 0,
        results: [
          { issueId: 1, fixed: true },
          { issueId: 2, fixed: true }
        ]
      });
      
      await contractCompliance.autoFixIssues();
      
      expect(mockApp.api.post).toHaveBeenCalledWith('/admin/contract/auto-fix', {
        issues: [1, 2] // Only auto-fixable issue IDs
      });
      
      expect(mockApp.showToast).toHaveBeenCalledWith('success', '成功修复 2 个问题');
    });

    it('should handle partial fix results', async () => {
      mockApp.api.post.mockResolvedValue({
        success: true,
        fixedCount: 1,
        failedCount: 1,
        results: [
          { issueId: 1, fixed: true },
          { issueId: 2, fixed: false, error: 'Permission denied' }
        ]
      });
      
      await contractCompliance.autoFixIssues();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('warning', 
        '成功修复 1 个问题，1 个问题修复失败'
      );
    });

    it('should handle no fixable issues', async () => {
      contractCompliance.currentIssues = [
        { id: 1, autoFixable: false },
        { id: 2, autoFixable: false }
      ];
      
      await contractCompliance.autoFixIssues();
      
      expect(mockApp.showToast).toHaveBeenCalledWith('info', '没有可自动修复的问题');
      expect(mockApp.api.post).not.toHaveBeenCalled();
    });
  });

  describe('exportReport()', () => {
    beforeEach(async () => {
      container.innerHTML = await contractCompliance.render();
      
      contractCompliance.currentStatus = {
        summary: { complianceRate: 85 },
        sections: { database: {}, api: {} },
        issues: [{ id: 1, description: 'Test issue' }]
      };
    });

    it('should export compliance report as JSON', () => {
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
      
      contractCompliance.exportReport();
      
      expect(mockLink.download).toMatch(/compliance-report-\d{4}-\d{2}-\d{2}\.json/);
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should include all report data', () => {
      let blobData;
      global.Blob = jest.fn((data) => {
        blobData = JSON.parse(data[0]);
        return { size: data[0].length };
      });
      
      contractCompliance.exportReport();
      
      expect(blobData).toHaveProperty('exportDate');
      expect(blobData).toHaveProperty('summary');
      expect(blobData).toHaveProperty('sections');
      expect(blobData).toHaveProperty('issues');
      expect(blobData.summary.complianceRate).toBe(85);
    });
  });

  describe('displayIssueDetails()', () => {
    beforeEach(async () => {
      container.innerHTML = await contractCompliance.render();
    });

    it('should display issue list correctly', () => {
      const issues = [
        {
          id: 1,
          type: 'database',
          severity: 'error',
          description: 'Missing required column',
          table: 'users',
          autoFixable: true
        },
        {
          id: 2,
          type: 'api',
          severity: 'warning',
          description: 'Deprecated endpoint',
          endpoint: '/api/v1/old',
          autoFixable: false
        }
      ];
      
      contractCompliance.displayIssueDetails(issues);
      
      const issueItems = container.querySelectorAll('.issue-item');
      expect(issueItems.length).toBe(2);
      
      expect(issueItems[0].textContent).toContain('Missing required column');
      expect(issueItems[0].querySelector('.issue-severity').textContent).toBe('error');
      expect(issueItems[0].querySelector('.auto-fix-badge')).toBeTruthy();
      
      expect(issueItems[1].textContent).toContain('Deprecated endpoint');
      expect(issueItems[1].querySelector('.issue-severity').textContent).toBe('warning');
      expect(issueItems[1].querySelector('.auto-fix-badge')).toBeFalsy();
    });

    it('should show empty state when no issues', () => {
      contractCompliance.displayIssueDetails([]);
      
      const issuesList = container.querySelector('.issues-list');
      expect(issuesList.textContent).toContain('没有发现合规问题');
    });
  });

  describe('getSeverityColor()', () => {
    it('should return correct colors for severity levels', () => {
      expect(contractCompliance.getSeverityColor('error')).toBe('#ff4d4f');
      expect(contractCompliance.getSeverityColor('warning')).toBe('#faad14');
      expect(contractCompliance.getSeverityColor('info')).toBe('#1890ff');
      expect(contractCompliance.getSeverityColor('unknown')).toBe('#8c8c8c');
    });
  });

  describe('formatComplianceRate()', () => {
    it('should format compliance rate with color', () => {
      expect(contractCompliance.formatComplianceRate(95)).toContain('color: #52c41a'); // Green
      expect(contractCompliance.formatComplianceRate(85)).toContain('color: #faad14'); // Yellow
      expect(contractCompliance.formatComplianceRate(65)).toContain('color: #ff4d4f'); // Red
    });
  });
});