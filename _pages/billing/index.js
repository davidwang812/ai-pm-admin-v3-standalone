/**
 * Billing Management Page
 * 计费管理页面
 */

export default async function BillingPage() {
  console.log('💰 Initializing Billing page...');
  
  const html = `
    <div class="billing-page">
      <div class="page-header">
        <h1>💰 计费管理</h1>
        <p>管理用户计费和订阅</p>
      </div>
      
      <div class="content-grid">
        <div class="stats-section">
          <div class="stat-card">
            <h3>本月收入</h3>
            <div class="stat-number">¥88,888</div>
            <div class="stat-change positive">+15%</div>
          </div>
          
          <div class="stat-card">
            <h3>活跃订阅</h3>
            <div class="stat-number">456</div>
            <div class="stat-change positive">+8%</div>
          </div>
          
          <div class="stat-card">
            <h3>平均客单价</h3>
            <div class="stat-number">¥195</div>
            <div class="stat-change positive">+3%</div>
          </div>
        </div>
        
        <div class="billing-table-section">
          <div class="table-header">
            <h2>最近订单</h2>
            <button class="btn-primary">导出报表</button>
          </div>
          
          <div class="billing-table">
            <table>
              <thead>
                <tr>
                  <th>订单ID</th>
                  <th>用户</th>
                  <th>套餐</th>
                  <th>金额</th>
                  <th>状态</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>#ORD-001</td>
                  <td>张三</td>
                  <td>专业版</td>
                  <td>¥299</td>
                  <td><span class="badge success">已支付</span></td>
                  <td>2025-01-28 10:30</td>
                </tr>
                <tr>
                  <td>#ORD-002</td>
                  <td>李四</td>
                  <td>基础版</td>
                  <td>¥99</td>
                  <td><span class="badge success">已支付</span></td>
                  <td>2025-01-28 09:15</td>
                </tr>
                <tr>
                  <td>#ORD-003</td>
                  <td>王五</td>
                  <td>企业版</td>
                  <td>¥999</td>
                  <td><span class="badge pending">待支付</span></td>
                  <td>2025-01-28 08:45</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
  
  console.log('✅ Billing page initialized');
  return html;
}