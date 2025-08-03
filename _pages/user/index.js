/**
 * User Management Page
 * 用户管理页面 - V3重构版本
 */

export class UserPage {
  constructor(app) {
    this.app = app;
    this.users = [];
  }

  async render() {
    console.log('👥 Rendering User Management page...');
    
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
              <button class="btn-primary" id="btn-add-user">添加用户</button>
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
    
    console.log('✅ User Management page rendered');
    return styles + html;
  }

  /**
   * 组件挂载后的生命周期
   */
  async mounted() {
    console.log('📌 UserPage mounted, loading data...');
    
    // 延迟加载用户数据，模拟API调用
    setTimeout(() => {
      this.loadUserData();
    }, 500);
    
    // 绑定事件
    this.bindEvents();
  }

  /**
   * 加载用户数据
   */
  loadUserData() {
    const tableBody = document.getElementById('user-table-body');
    if (!tableBody) return;
    
    // 模拟用户数据
    this.users = [
      {
        id: '001',
        username: 'admin',
        email: 'admin@example.com',
        role: '超级管理员',
        status: 'active',
        registeredAt: '2024-01-15'
      },
      {
        id: '002',
        username: 'davidwang812',
        email: 'davidwang812@gmail.com',
        role: '管理员',
        status: 'active',
        registeredAt: '2024-01-20'
      },
      {
        id: '003',
        username: 'testuser',
        email: 'test@example.com',
        role: '普通用户',
        status: 'inactive',
        registeredAt: '2024-02-01'
      }
    ];
    
    // 渲染用户表格
    tableBody.innerHTML = this.users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>
          <span class="status-badge status-${user.status === 'active' ? 'active' : 'inactive'}">
            ${user.status === 'active' ? '活跃' : '非活跃'}
          </span>
        </td>
        <td>${user.registeredAt}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-small btn-edit" data-user-id="${user.id}">编辑</button>
            <button class="btn-small btn-delete" data-user-id="${user.id}">删除</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 添加用户按钮
    const addBtn = document.getElementById('btn-add-user');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addUser());
    }
    
    // 使用事件委托处理编辑和删除按钮
    const tableBody = document.getElementById('user-table-body');
    if (tableBody) {
      tableBody.addEventListener('click', (e) => {
        const target = e.target;
        const userId = target.dataset.userId;
        
        if (target.classList.contains('btn-edit')) {
          this.editUser(userId);
        } else if (target.classList.contains('btn-delete')) {
          this.deleteUser(userId);
        }
      });
    }
  }

  /**
   * 添加用户
   */
  addUser() {
    alert('添加用户功能开发中...');
  }

  /**
   * 编辑用户
   */
  editUser(userId) {
    alert(`编辑用户 ${userId} 功能开发中...`);
  }

  /**
   * 删除用户
   */
  deleteUser(userId) {
    if (confirm(`确定要删除用户 ${userId} 吗？`)) {
      alert(`删除用户 ${userId} 功能开发中...`);
    }
  }

  /**
   * 清理组件
   */
  destroy() {
    console.log('🧹 Destroying User page...');
    // 清理事件监听器等资源
    this.users = [];
  }
}

// 导出默认
export default UserPage;