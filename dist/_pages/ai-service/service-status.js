/**
 * Service Status Page
 * 服务状态监控页面
 */

export class ServiceStatus {
  constructor(app) {
    this.app = app;
    this.services = [];
    this.refreshInterval = null;
    this.autoRefresh = false;
  }

  async render() {
    return `
      <div class="service-status-container">
        <div class="page-header">
          <h2>服务状态监控</h2>
          <p class="description">实时监控AI服务的运行状态</p>
        </div>
        
        <div class="status-overview">
          <div class="status-summary">
            <div class="status-item healthy">
              <span class="status-icon">✅</span>
              <span class="status-count" id="healthy-count">8</span>
              <span class="status-label">正常</span>
            </div>
            <div class="status-item warning">
              <span class="status-icon">⚠️</span>
              <span class="status-count" id="warning-count">2</span>
              <span class="status-label">警告</span>
            </div>
            <div class="status-item error">
              <span class="status-icon">❌</span>
              <span class="status-count" id="error-count">0</span>
              <span class="status-label">错误</span>
            </div>
          </div>
          <div class="controls">
            <button id="refresh-status" class="btn btn-primary">刷新状态</button>
            <button id="toggle-auto-refresh" class="btn btn-secondary">自动刷新</button>
          </div>
        </div>
        
        <div class="services-grid">
          <!-- Service status cards will be rendered here -->
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Bind refresh button
    const refreshButton = document.getElementById('refresh-status');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.loadServiceStatus();
      });
    }

    // Bind auto-refresh toggle
    const autoRefreshButton = document.getElementById('toggle-auto-refresh');
    if (autoRefreshButton) {
      autoRefreshButton.addEventListener('click', () => {
        this.toggleAutoRefresh();
      });
    }

    // Load initial status
    this.loadServiceStatus();
  }

  async loadServiceStatus() {
    try {
      // Show loading state
      const refreshButton = document.getElementById('refresh-status');
      if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = '加载中...';
      }

      if (this.app?.api?.getServiceStatus) {
        const response = await this.app.api.getServiceStatus();
        if (response.success && response.data) {
          this.updateStatusSummary(response.data);
        }
      }
    } catch (error) {
      console.error('Failed to load service status:', error);
      if (this.app?.showToast) {
        this.app.showToast('error', `加载服务状态失败: ${error.message}`);
      }
    } finally {
      // Restore button state
      const refreshButton = document.getElementById('refresh-status');
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = '刷新状态';
      }
    }
  }

  updateStatusSummary(data) {
    const healthyCount = document.getElementById('healthy-count');
    const warningCount = document.getElementById('warning-count');
    const errorCount = document.getElementById('error-count');

    if (healthyCount) healthyCount.textContent = data.healthy || 0;
    if (warningCount) warningCount.textContent = data.warning || 0;
    if (errorCount) errorCount.textContent = data.error || 0;
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    
    if (this.autoRefresh) {
      this.refreshInterval = setInterval(() => {
        this.loadServiceStatus();
      }, 30000); // 30 seconds
    } else {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    }

    const button = document.getElementById('toggle-auto-refresh');
    if (button) {
      button.textContent = this.autoRefresh ? '停止自动刷新' : '自动刷新';
    }
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

export default ServiceStatus;