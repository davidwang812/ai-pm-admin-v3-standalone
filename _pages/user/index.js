/**
 * User Management Page
 * 用户管理页面
 */

export default async function UserPage() {
  console.log('👥 Initializing User Management page...');
  
  const html = `
    <div class="user-page">
      <div class="page-header">
        <h1>👥 用户管理</h1>
        <p>管理系统用户和权限</p>
      </div>
      
      <div class="content-grid">
        <div class="stats-section">
          <div class="stat-card">
            <h3>活跃用户</h3>
            <div class="stat-number">1,234</div>
            <div class="stat-change positive">+12%</div>
          </div>
          
          <div class="stat-card">
            <h3>新注册</h3>
            <div class="stat-number">89</div>
            <div class="stat-change positive">+5%</div>
          </div>
          
          <div class="stat-card">
            <h3>总用户数</h3>
            <div class="stat-number">5,678</div>
            <div class="stat-change positive">+8%</div>
          </div>
        </div>
        
        <div class="user-table-section">
          <div class="table-header">
            <h2>用户列表</h2>
            <button class="btn-primary" onclick="addUser()">添加用户</button>
          </div>
          
          <div class="user-table">
            <table>
              <thead>
                <tr>
                  <th>用户ID</th>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="user-table-body">
                <tr>
                  <td colspan="7" style="text-align: center; padding: 20px;">
                    正在加载用户数据...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 样式
  const styles = `
    <style>
      .user-page {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .page-header {
        margin-bottom: 30px;
      }
      
      .page-header h1 {
        margin: 0 0 8px 0;
        color: #1f2937;
        font-size: 28px;
        font-weight: 600;
      }
      
      .page-header p {
        margin: 0;
        color: #6b7280;
        font-size: 16px;
      }
      
      .stats-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .stat-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
      }
      
      .stat-card h3 {
        margin: 0 0 12px 0;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .stat-number {
        font-size: 32px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 8px;
      }
      
      .stat-change {
        font-size: 14px;
        font-weight: 500;
      }
      
      .stat-change.positive {
        color: #10b981;
      }
      
      .stat-change.negative {
        color: #ef4444;
      }
      
      .user-table-section {
        background: white;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        overflow: hidden;
      }
      
      .table-header {
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .table-header h2 {
        margin: 0;
        color: #1f2937;
        font-size: 18px;
        font-weight: 600;
      }
      
      .btn-primary {
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .btn-primary:hover {
        background: #5a67d8;
      }
      
      .user-table {
        overflow-x: auto;
      }
      
      .user-table table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .user-table th,
      .user-table td {
        padding: 12px 20px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .user-table th {
        background: #f9fafb;
        color: #374151;
        font-weight: 500;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .user-table td {
        color: #1f2937;
        font-size: 14px;
      }
      
      .user-table tbody tr:hover {
        background: #f9fafb;
      }
      
      .status-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .status-active {
        background: #dcfdf7;
        color: #065f46;
      }
      
      .status-inactive {
        background: #fef3c7;
        color: #92400e;
      }
      
      .action-buttons {
        display: flex;
        gap: 8px;
      }
      
      .btn-small {
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .btn-edit {
        background: #dbeafe;
        color: #1e40af;
      }
      
      .btn-delete {
        background: #fee2e2;
        color: #dc2626;
      }
      
      .btn-small:hover {
        opacity: 0.8;
      }
      
      @media (max-width: 768px) {
        .user-page {
          padding: 15px;
        }
        
        .stats-section {
          grid-template-columns: 1fr;
        }
        
        .table-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
        }
        
        .user-table {
          font-size: 12px;
        }
        
        .user-table th,
        .user-table td {
          padding: 8px 12px;
        }
      }
    </style>
  `;
  
  // 返回完整的HTML
  return styles + html;
}

// 用户管理功能
window.addUser = function() {
  alert('添加用户功能开发中...');
};

window.editUser = function(userId) {
  alert(`编辑用户 ${userId} 功能开发中...`);
};

window.deleteUser = function(userId) {
  if (confirm(`确定要删除用户 ${userId} 吗？`)) {
    alert(`删除用户 ${userId} 功能开发中...`);
  }
};

// 模拟加载用户数据
setTimeout(() => {
  const tableBody = document.getElementById('user-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td>001</td>
        <td>admin</td>
        <td>admin@example.com</td>
        <td>超级管理员</td>
        <td><span class="status-badge status-active">活跃</span></td>
        <td>2024-01-15</td>
        <td>
          <div class="action-buttons">
            <button class="btn-small btn-edit" onclick="editUser('001')">编辑</button>
            <button class="btn-small btn-delete" onclick="deleteUser('001')">删除</button>
          </div>
        </td>
      </tr>
      <tr>
        <td>002</td>
        <td>davidwang812</td>
        <td>davidwang812@gmail.com</td>
        <td>管理员</td>
        <td><span class="status-badge status-active">活跃</span></td>
        <td>2024-01-20</td>
        <td>
          <div class="action-buttons">
            <button class="btn-small btn-edit" onclick="editUser('002')">编辑</button>
            <button class="btn-small btn-delete" onclick="deleteUser('002')">删除</button>
          </div>
        </td>
      </tr>
      <tr>
        <td>003</td>
        <td>testuser</td>
        <td>test@example.com</td>
        <td>普通用户</td>
        <td><span class="status-badge status-inactive">非活跃</span></td>
        <td>2024-02-01</td>
        <td>
          <div class="action-buttons">
            <button class="btn-small btn-edit" onclick="editUser('003')">编辑</button>
            <button class="btn-small btn-delete" onclick="deleteUser('003')">删除</button>
          </div>
        </td>
      </tr>
    `;
  }
}, 1000);

console.log('✅ User Management page initialized');