/**
 * Dashboard Page
 * V3仪表板页面 - 模块化、懒加载优化
 */

import state from '../../_core/state.js';
import cache from '../../_core/cache.js';
import apiClient from '../../_core/api-client.js';

export class DashboardPage {
  constructor(app) {
    this.app = app;
    this.modules = new Map();
    this.initialized = false;
    this.refreshInterval = null;
  }

  /**
   * 渲染页面
   */
  async render() {
    // 返回初始HTML结构
    const html = this.getInitialHTML();
    
    // 注意：初始化将在mounted生命周期中进行
    // 这确保DOM已经渲染完成
    
    return html;
  }
  
  /**
   * 组件挂载后的生命周期
   * 在DOM渲染完成后调用
   */
  async mounted() {
    console.log('📌 Dashboard mounted, initializing...');
    
    // 直接初始化，canvas会在需要时动态创建
    await this.initialize();
  }

  /**
   * 获取初始HTML
   */
  getInitialHTML() {
    return `
      <div class="dashboard-container">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1>仪表板</h1>
          <div class="header-actions">
            <button class="btn-refresh" onclick="adminV3App.refreshDashboard()">
              <span class="icon">🔄</span>
              刷新
            </button>
            <span class="last-updated" id="lastUpdated">更新中...</span>
          </div>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-grid" id="statsGrid">
          ${this.getStatsPlaceholder()}
        </div>

        <!-- 图表区域 -->
        <div class="charts-section">
          <div class="chart-container" id="usageChart">
            <div class="chart-header">
              <h3>使用趋势</h3>
              <select id="chartPeriod" onchange="adminV3App.updateChartPeriod(this.value)">
                <option value="7d">最近7天</option>
                <option value="30d">最近30天</option>
                <option value="90d">最近90天</option>
              </select>
            </div>
            <div class="chart-body" id="usageChartBody">
              <div class="chart-placeholder">图表加载中...</div>
            </div>
          </div>

          <div class="chart-container" id="providerChart">
            <div class="chart-header">
              <h3>服务商分布</h3>
            </div>
            <div class="chart-body" id="providerChartBody">
              <div class="chart-placeholder">图表加载中...</div>
            </div>
          </div>
        </div>

        <!-- 活动列表 -->
        <div class="activities-section">
          <div class="section-header">
            <h3>最近活动</h3>
            <a href="#/activities" class="view-all">查看全部 →</a>
          </div>
          <div class="activities-list" id="activitiesList">
            <div class="activities-placeholder">活动加载中...</div>
          </div>
        </div>
      </div>

      <style>
        .dashboard-container {
          padding: 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0;
          font-size: 28px;
          color: #1f2937;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-refresh:hover {
          background: #5a67d8;
        }

        .last-updated {
          color: #6b7280;
          font-size: 14px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .stat-card.loading {
          opacity: 0.6;
        }

        .stat-label {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .stat-change {
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .stat-change.positive {
          color: #10b981;
        }

        .stat-change.negative {
          color: #ef4444;
        }

        .charts-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .chart-container {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .chart-header h3 {
          margin: 0;
          color: #1f2937;
        }

        .chart-body {
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .activities-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h3 {
          margin: 0;
          color: #1f2937;
        }

        .view-all {
          color: #667eea;
          text-decoration: none;
          font-size: 14px;
        }

        .view-all:hover {
          text-decoration: underline;
        }

        .activities-list {
          min-height: 200px;
        }

        .activity-item {
          display: flex;
          align-items: start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .activity-content {
          flex: 1;
        }

        .activity-title {
          color: #1f2937;
          margin-bottom: 4px;
        }

        .activity-time {
          color: #6b7280;
          font-size: 14px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  /**
   * 获取统计卡片占位符
   */
  getStatsPlaceholder() {
    const stats = [
      { label: '总用户数', value: '-', change: '0%', icon: '👥' },
      { label: 'API调用', value: '-', change: '0%', icon: '🔄' },
      { label: '活跃服务商', value: '-', change: '0%', icon: '🤖' },
      { label: '今日收入', value: '-', change: '0%', icon: '💰' }
    ];

    return stats.map(stat => `
      <div class="stat-card loading">
        <div class="stat-label">${stat.label}</div>
        <div class="stat-value">${stat.value}</div>
        <div class="stat-change">
          <span>${stat.change}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * 初始化页面
   */
  async initialize() {
    console.log('📊 Initializing dashboard...');
    
    try {
      // 并行加载所有数据
      const [statsData, chartsData, activitiesData] = await Promise.all([
        this.loadStats(),
        this.loadCharts(),
        this.loadActivities()
      ]);

      // 渲染各个模块
      this.renderStats(statsData);
      this.renderCharts(chartsData);
      this.renderActivities(activitiesData);

      // 更新最后更新时间
      this.updateLastUpdated();

      // 设置自动刷新
      this.setupAutoRefresh();

      // 延迟加载其他模块
      this.loadDeferredModules();

      this.initialized = true;
      console.log('✅ Dashboard initialized');
      
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      this.showError(error);
    }
  }

  /**
   * 加载统计数据
   */
  async loadStats() {
    // 先尝试从缓存获取
    const cached = await cache.get('dashboard', 'stats');
    if (cached) {
      return cached;
    }

    // 使用模拟数据（V3优化期间）
    console.log('📊 Using mock data for dashboard stats');
    const mockData = {
      users: { total: 1234, change: 12.5 },
      apiCalls: { total: 45678, change: 8.3 },
      providers: { active: 5, change: 0 },
      revenue: { today: 89.50, change: 15.2 }
    };

    // 缓存模拟数据
    await cache.set('dashboard', 'stats', mockData);
    return mockData;
  }

  /**
   * 加载图表数据
   */
  async loadCharts() {
    const cached = await cache.get('dashboard', 'charts');
    if (cached) {
      return cached;
    }

    // 使用模拟数据（V3优化期间）
    console.log('📈 Using mock data for dashboard charts');
    const mockData = {
      usage: [
        { date: '2025-07-28', value: 120 },
        { date: '2025-07-29', value: 135 },
        { date: '2025-07-30', value: 155 },
        { date: '2025-07-31', value: 142 },
        { date: '2025-08-01', value: 168 },
        { date: '2025-08-02', value: 178 },
        { date: '2025-08-03', value: 195 }
      ],
      providers: [
        { name: 'OpenAI', value: 45, color: '#10b981' },
        { name: 'Anthropic', value: 30, color: '#6366f1' },
        { name: 'Google', value: 15, color: '#f59e0b' },
        { name: 'Others', value: 10, color: '#8b5cf6' }
      ]
    };

    await cache.set('dashboard', 'charts', mockData);
    return mockData;
  }

  /**
   * 加载活动数据
   */
  async loadActivities() {
    // 使用模拟数据（V3优化期间）
    console.log('📝 Using mock data for dashboard activities');
    return [
      {
        id: 1,
        type: 'user_login',
        message: 'davidwang812 登录管理后台',
        timestamp: new Date().toISOString(),
        icon: '👤'
      },
      {
        id: 2,
        type: 'api_call',
        message: 'OpenAI API 调用成功 - GPT-4 模型',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        icon: '🤖'
      },
      {
        id: 3,
        type: 'system',
        message: '系统备份完成',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        icon: '💾'
      },
      {
        id: 4,
        type: 'provider',
        message: '新增 Anthropic 服务提供商配置',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        icon: '⚙️'
      },
      {
        id: 5,
        type: 'alert',
        message: 'API 使用量达到 80% 阈值',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        icon: '⚠️'
      }
    ];
  }

  /**
   * 渲染统计卡片
   */
  renderStats(data) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    const stats = [
      {
        label: '总用户数',
        value: this.formatNumber(data.users?.total || 0),
        change: data.users?.change || 0,
        icon: '👥',
        color: '#667eea'
      },
      {
        label: 'API调用',
        value: this.formatNumber(data.apiCalls?.total || 0),
        change: data.apiCalls?.change || 0,
        icon: '🔄',
        color: '#10b981'
      },
      {
        label: '活跃服务商',
        value: data.providers?.active || 0,
        change: data.providers?.change || 0,
        icon: '🤖',
        color: '#f59e0b'
      },
      {
        label: '今日收入',
        value: '¥' + this.formatNumber(data.revenue?.today || 0),
        change: data.revenue?.change || 0,
        icon: '💰',
        color: '#ef4444'
      }
    ];

    statsGrid.innerHTML = stats.map(stat => `
      <div class="stat-card">
        <div class="stat-label">${stat.label}</div>
        <div class="stat-value">${stat.value}</div>
        <div class="stat-change ${stat.change >= 0 ? 'positive' : 'negative'}">
          <span>${stat.change >= 0 ? '↑' : '↓'}</span>
          <span>${Math.abs(stat.change)}%</span>
          <span>较昨日</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * 渲染图表
   */
  async renderCharts(data) {
    // 延迟加载图表库
    if (!window.Chart) {
      await this.loadChartLibrary();
    }

    this.renderUsageChart(data.usage);
    this.renderProviderChart(data.providers);
  }
  
  /**
   * 渲染使用量图表
   */
  renderUsageChart(usageData) {
    // 获取canvas元素 - 使用更精确的查找
    let canvas = document.getElementById('usageChartCanvas');
    
    if (!canvas) {
      // 创建canvas如果不存在
      const chartBody = document.getElementById('usageChartBody');
      if (chartBody) {
        // 移除占位符
        const placeholder = chartBody.querySelector('.chart-placeholder');
        if (placeholder) {
          placeholder.remove();
        }
        
        // 创建新的canvas
        canvas = document.createElement('canvas');
        canvas.id = 'usageChartCanvas';
        canvas.style.width = '100%';
        canvas.style.height = '300px';
        chartBody.appendChild(canvas);
        console.log('Created canvas element for usage chart');
      }
    }
    
    if (!canvas) {
      console.error('Cannot create canvas element: usageChartCanvas');
      return;
    }
    
    const placeholder = document.querySelector('#usageChartBody .chart-placeholder');
    
    // 隐藏占位符，显示canvas
    if (placeholder) placeholder.style.display = 'none';
    canvas.style.display = 'block';
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
        datasets: [{
          label: 'API调用量',
          data: usageData || [12000, 19000, 15000, 25000, 22000, 30000],
          borderColor: '#667eea',
          backgroundColor: '#667eea20',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  
  /**
   * 渲染供应商图表
   */
  renderProviderChart(providerData) {
    // 获取canvas元素 - 使用更精确的查找
    let canvas = document.getElementById('providerChartCanvas');
    
    if (!canvas) {
      // 创建canvas如果不存在
      const chartBody = document.getElementById('providerChartBody');
      if (chartBody) {
        // 移除占位符
        const placeholder = chartBody.querySelector('.chart-placeholder');
        if (placeholder) {
          placeholder.remove();
        }
        
        // 创建新的canvas
        canvas = document.createElement('canvas');
        canvas.id = 'providerChartCanvas';
        canvas.style.width = '100%';
        canvas.style.height = '300px';
        chartBody.appendChild(canvas);
        console.log('Created canvas element for provider chart');
      }
    }
    
    if (!canvas) {
      console.error('Cannot create canvas element: providerChartCanvas');
      return;
    }
    
    const placeholder = document.querySelector('#providerChartBody .chart-placeholder');
    
    // 隐藏占位符，显示canvas
    if (placeholder) placeholder.style.display = 'none';
    canvas.style.display = 'block';
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['OpenAI', 'Claude', 'Gemini', '其他'],
        datasets: [{
          data: providerData || [40, 30, 20, 10],
          backgroundColor: ['#667eea', '#f97316', '#10b981', '#6b7280']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  /**
   * 渲染活动列表
   */
  renderActivities(activities) {
    const list = document.getElementById('activitiesList');
    if (!list) return;
    
    // 移除占位符
    const placeholder = list.querySelector('.activities-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    if (!activities || activities.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #6b7280;">暂无活动</p>';
      return;
    }

    list.innerHTML = activities.slice(0, 5).map(activity => `
      <div class="activity-item">
        <div class="activity-icon" style="background: ${this.getActivityColor(activity.type)}20;">
          ${this.getActivityIcon(activity.type)}
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * 延迟加载模块
   */
  async loadDeferredModules() {
    // 使用requestIdleCallback延迟加载非关键模块
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        // 预加载其他页面
        const routes = ['/ai-service', '/user', '/billing'];
        for (const route of routes) {
          try {
            await import(`../${route.slice(1)}/index.js`);
          } catch (error) {
            // 静默失败
          }
        }
      });
    }
  }

  /**
   * 设置自动刷新
   */
  setupAutoRefresh() {
    // 每30秒刷新一次
    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, 30000);
  }

  /**
   * 刷新数据
   */
  async refresh() {
    console.log('🔄 Refreshing dashboard...');
    
    // 清除缓存
    await cache.delete('dashboard', 'stats');
    await cache.delete('dashboard', 'charts');
    
    // 重新初始化
    await this.initialize();
  }

  /**
   * 更新最后更新时间
   */
  updateLastUpdated() {
    const element = document.getElementById('lastUpdated');
    if (element) {
      element.textContent = `更新于 ${new Date().toLocaleTimeString()}`;
    }
  }

  /**
   * 格式化数字
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
      return '刚刚';
    }
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前';
    }
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前';
    }
    
    return date.toLocaleDateString();
  }

  /**
   * 获取活动图标
   */
  getActivityIcon(type) {
    const icons = {
      user_register: '👤',
      api_call: '🔄',
      payment: '💳',
      error: '⚠️',
      config_change: '⚙️'
    };
    return icons[type] || '📝';
  }

  /**
   * 获取活动颜色
   */
  getActivityColor(type) {
    const colors = {
      user_register: '#667eea',
      api_call: '#10b981',
      payment: '#f59e0b',
      error: '#ef4444',
      config_change: '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  }

  /**
   * 显示错误
   */
  showError(error) {
    const container = document.querySelector('.dashboard-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h2>加载失败</h2>
          <p style="color: #ef4444;">${error.message || '未知错误'}</p>
          <button onclick="location.reload()" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">
            重试
          </button>
        </div>
      `;
    }
  }

  /**
   * 清理
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// 导出默认
export default DashboardPage;