// Cost Analysis Module
export class CostAnalysis {
  constructor(app) {
    this.app = app;
  }

  async render() {
    return `
      <div class="cost-analysis-container">
        <div class="cost-header">
          <h3>成本分析</h3>
          <div class="date-range-selector">
            <select id="cost-date-range" class="form-control">
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month" selected>本月</option>
              <option value="year">本年</option>
            </select>
          </div>
        </div>

        <div class="cost-summary">
          <div class="summary-card">
            <div class="summary-title">总成本</div>
            <div class="summary-value">¥0.00</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">总请求数</div>
            <div class="summary-value">0</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">平均单价</div>
            <div class="summary-value">¥0.00</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">最高消费服务</div>
            <div class="summary-value">-</div>
          </div>
        </div>

        <div class="cost-charts">
          <div class="chart-container">
            <h4>成本趋势</h4>
            <canvas id="cost-trend-chart"></canvas>
          </div>
          <div class="chart-container">
            <h4>服务商成本分布</h4>
            <canvas id="provider-cost-chart"></canvas>
          </div>
        </div>

        <div class="cost-details">
          <h4>详细成本记录</h4>
          <table class="config-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>服务商</th>
                <th>模型</th>
                <th>输入Token</th>
                <th>输出Token</th>
                <th>成本</th>
              </tr>
            </thead>
            <tbody id="cost-details-tbody">
              <tr>
                <td colspan="6" style="text-align: center; color: #999;">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Date range selector
    const dateRangeSelector = document.getElementById('cost-date-range');
    if (dateRangeSelector) {
      dateRangeSelector.addEventListener('change', () => {
        this.loadCostData(dateRangeSelector.value);
      });
    }

    // Initialize charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
      this.initCharts();
    }
  }

  initCharts() {
    // Cost trend chart
    const trendCtx = document.getElementById('cost-trend-chart');
    if (trendCtx) {
      new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
          datasets: [{
            label: '成本趋势',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#1890ff',
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '¥' + value.toFixed(2);
                }
              }
            }
          }
        }
      });
    }

    // Provider cost distribution chart
    const providerCtx = document.getElementById('provider-cost-chart');
    if (providerCtx) {
      new Chart(providerCtx, {
        type: 'doughnut',
        data: {
          labels: ['OpenAI', 'Anthropic', 'Google', 'Others'],
          datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: [
              '#1890ff',
              '#52c41a',
              '#faad14',
              '#f5222d'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
  }

  async loadCostData(dateRange) {
    try {
      const data = await this.app.api.getCostAnalysis(dateRange);
      this.updateCostDisplay(data);
    } catch (error) {
      console.error('Failed to load cost data:', error);
    }
  }

  updateCostDisplay(data) {
    // Update summary cards
    const summaryCards = document.querySelectorAll('.summary-value');
    if (summaryCards[0]) summaryCards[0].textContent = `¥${(data.totalCost || 0).toFixed(2)}`;
    if (summaryCards[1]) summaryCards[1].textContent = data.totalRequests || 0;
    if (summaryCards[2]) summaryCards[2].textContent = `¥${(data.avgCost || 0).toFixed(4)}`;
    if (summaryCards[3]) summaryCards[3].textContent = data.topService || '-';

    // Update details table
    const tbody = document.getElementById('cost-details-tbody');
    if (tbody && data.details && data.details.length > 0) {
      tbody.innerHTML = data.details.map(record => `
        <tr>
          <td>${new Date(record.timestamp).toLocaleString()}</td>
          <td>${record.provider}</td>
          <td>${record.model}</td>
          <td>${record.inputTokens}</td>
          <td>${record.outputTokens}</td>
          <td>¥${record.cost.toFixed(4)}</td>
        </tr>
      `).join('');
    }
  }
}