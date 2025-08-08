/**
 * User Management Page
 * 用户管理页面 - V3重构版本
 */

import { UserManager } from './user-manager.js';
import { UserComponents } from './user-components.js';

export class UserPage {
  constructor(app) {
    this.app = app;
    this.userManager = new UserManager(app);
    this.components = new UserComponents(this.userManager);
    this.selectedUsers = new Set();
  }

  async render() {
    console.log('👥 Rendering enhanced User Management page...');
    
    // 获取用户统计数据
    const stats = await this.userManager.getUserStats() || {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      trends: { totalChange: 0, activeChange: 0, newChange: 0 }
    };
    
    const html = `
      <div class="user-page">
        <div class="page-header">
          <div class="header-content">
            <h1>👥 用户管理</h1>
            <p>管理系统用户、权限和配额</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="window.adminV3App.userPage.addUser()">
              ➕ 添加用户
            </button>
            <button class="btn" onclick="window.adminV3App.userPage.exportUsers()">
              📤 导出数据
            </button>
            <button class="btn" onclick="window.adminV3App.userPage.bulkActions()" id="bulk-actions-btn" style="display: none;">
              ⚡ 批量操作
            </button>
          </div>
        </div>
        
        <div class="content-grid">
          <!-- 统计卡片 -->
          <div class="stats-section">
            <div class="stat-card">
              <div class="stat-icon">👥</div>
              <div class="stat-content">
                <h3>总用户数</h3>
                <div class="stat-number">${this.components.formatNumber(stats.totalUsers)}</div>
                <div class="stat-change ${stats.trends.totalChange >= 0 ? 'positive' : 'negative'}">
                  ${stats.trends.totalChange >= 0 ? '+' : ''}${stats.trends.totalChange}%
                </div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">✅</div>
              <div class="stat-content">
                <h3>活跃用户</h3>
                <div class="stat-number">${this.components.formatNumber(stats.activeUsers)}</div>
                <div class="stat-change ${stats.trends.activeChange >= 0 ? 'positive' : 'negative'}">
                  ${stats.trends.activeChange >= 0 ? '+' : ''}${stats.trends.activeChange}%
                </div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">🆕</div>
              <div class="stat-content">
                <h3>本月新增</h3>
                <div class="stat-number">${this.components.formatNumber(stats.newUsers)}</div>
                <div class="stat-change ${stats.trends.newChange >= 0 ? 'positive' : 'negative'}">
                  ${stats.trends.newChange >= 0 ? '+' : ''}${stats.trends.newChange}%
                </div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-content">
                <h3>用户类型分布</h3>
                <div class="type-distribution">
                  ${stats.userTypes ? `
                    <div class="type-item">
                      <span class="type-label">免费</span>
                      <span class="type-count">${stats.userTypes.free}</span>
                    </div>
                    <div class="type-item">
                      <span class="type-label">高级</span>
                      <span class="type-count">${stats.userTypes.premium}</span>
                    </div>
                    <div class="type-item">
                      <span class="type-label">企业</span>
                      <span class="type-count">${stats.userTypes.enterprise}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
          
          <!-- 用户表格区域 -->
          <div class="user-table-section">
            <!-- 过滤器 -->
            ${this.components.renderFilters(this.userManager.currentFilter)}
            
            <!-- 表格容器 -->
            <div class="table-container">
              <div id="user-table-content">
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>正在加载用户数据...</p>
                </div>
              </div>
              
              <!-- 分页 -->
              <div id="pagination-container"></div>
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
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .header-content h1 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 28px;
          font-weight: 600;
        }
        
        .header-content p {
          margin: 0;
          color: #6b7280;
          font-size: 16px;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
        }
        
        /* 统计卡片样式增强 */
        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .stat-card .stat-icon {
          font-size: 32px;
          margin-bottom: 12px;
          opacity: 0.8;
        }
        
        .stat-card .stat-content {
          position: relative;
          z-index: 1;
        }
        
        .type-distribution {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }
        
        .type-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }
        
        .type-label {
          color: #6b7280;
          font-size: 14px;
        }
        
        .type-count {
          font-weight: 600;
          color: #1f2937;
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
        
        /* 按钮样式增强 */
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .btn-primary {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        
        .btn-primary:hover {
          background: #5a67d8;
          border-color: #5a67d8;
        }
        
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border-color: #e5e7eb;
        }
        
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        
        .btn-icon {
          width: 32px;
          height: 32px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 16px;
        }
        
        .btn-icon:hover {
          background: #f3f4f6;
        }
        
        /* 表格样式增强 */
        .user-table {
          overflow-x: auto;
        }
        
        .user-table table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .user-table th,
        .user-table td {
          padding: 16px;
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
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .user-table td {
          color: #1f2937;
          font-size: 14px;
        }
        
        .user-table tbody tr {
          transition: background-color 0.2s;
        }
        
        .user-table tbody tr:hover {
          background: #f9fafb;
        }
        
        /* 用户信息单元格样式 */
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e5e7eb;
        }
        
        .user-details {
          flex: 1;
        }
        
        .user-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 2px;
        }
        
        .user-email {
          font-size: 13px;
          color: #6b7280;
        }
        
        .user-phone {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 2px;
        }
        
        /* 状态徽章样式增强 */
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-active {
          background: #dcfdf7;
          color: #065f46;
          border: 1px solid #10b981;
        }
        
        .status-inactive {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }
        
        .status-banned {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #ef4444;
        }
        
        /* 用户类型徽章 */
        .user-type-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .type-free {
          background: #f3f4f6;
          color: #374151;
        }
        
        .type-premium {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .type-enterprise {
          background: #e0e7ff;
          color: #3730a3;
        }
        
        /* 操作按钮样式增强 */
        .action-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        /* 下拉菜单样式 */
        .dropdown {
          position: relative;
        }
        
        .dropdown-menu {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 4px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 180px;
          z-index: 100;
          display: none;
        }
        
        .dropdown.open .dropdown-menu {
          display: block;
        }
        
        .dropdown-menu a {
          display: block;
          padding: 10px 16px;
          color: #374151;
          text-decoration: none;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .dropdown-menu a:hover {
          background: #f9fafb;
        }
        
        .dropdown-menu hr {
          margin: 4px 0;
          border: none;
          border-top: 1px solid #e5e7eb;
        }
        
        .dropdown-menu .text-danger {
          color: #dc2626;
        }
        
        .dropdown-menu .text-success {
          color: #059669;
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
        /* 配额显示样式 */
        .quota-info {
          min-width: 120px;
        }
        
        .quota-bar {
          width: 100%;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        
        .quota-fill {
          height: 100%;
          background: #667eea;
          transition: width 0.3s ease;
        }
        
        .quota-text {
          font-size: 12px;
          color: #6b7280;
        }
        
        /* 过滤器样式 */
        .filter-section {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        
        .filter-group {
          flex: 1;
          min-width: 200px;
        }
        
        .filter-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .filter-group select,
        .filter-group input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .filter-group select:focus,
        .filter-group input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .search-group {
          flex: 2;
        }
        
        .search-input {
          position: relative;
          display: flex;
          gap: 8px;
        }
        
        .search-btn {
          padding: 8px 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .search-btn:hover {
          background: #5a67d8;
        }
        
        /* 分页样式 */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px;
        }
        
        .page-btn {
          padding: 6px 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .page-btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #667eea;
        }
        
        .page-btn.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .page-ellipsis {
          color: #9ca3af;
        }
        
        .page-info {
          margin-left: 16px;
          color: #6b7280;
          font-size: 14px;
        }
        
        /* 空状态样式 */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }
        
        .empty-icon {
          font-size: 64px;
          opacity: 0.3;
          margin-bottom: 16px;
        }
        
        .empty-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .empty-desc {
          font-size: 16px;
          color: #6b7280;
        }
        
        /* 加载状态 */
        .loading-state {
          text-align: center;
          padding: 60px 20px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto 16px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* 弹窗样式 */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .modal-content.large {
          max-width: 800px;
        }
        
        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .modal-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          font-size: 20px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .modal-close:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
        
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        
        /* 表单样式 */
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .form-group small {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: #6b7280;
        }
        
        .form-group .required {
          color: #ef4444;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        
        /* 详情页标签样式 */
        .detail-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .tab-btn {
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tab-btn:hover {
          color: #1f2937;
        }
        
        .tab-btn.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }
        
        .tab-content {
          padding: 20px 0;
        }
        
        /* 用户详情样式 */
        .user-detail-info .info-header {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .large-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e5e7eb;
        }
        
        .info-main h4 {
          margin: 0 0 4px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .info-main p {
          margin: 0 0 12px 0;
          color: #6b7280;
        }
        
        .info-badges {
          display: flex;
          gap: 8px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .info-item label {
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-item span {
          font-size: 14px;
          color: #1f2937;
        }
        
        .info-item.full-width {
          grid-column: 1 / -1;
        }
        
        /* 会话列表样式 */
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .session-item {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .session-item.active {
          background: #f0f9ff;
          border-color: #3b82f6;
        }
        
        .session-info {
          flex: 1;
        }
        
        .session-device {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .session-details {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .session-time {
          font-size: 12px;
          color: #9ca3af;
        }
        
        /* 权限列表样式 */
        .permissions-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .permissions-actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .permissions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .permission-item {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .permission-info {
          flex: 1;
        }
        
        .permission-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .permission-resource {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .permission-time {
          font-size: 12px;
          color: #9ca3af;
        }
        
        /* 使用统计样式 */
        .usage-stats {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .usage-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }
        
        .usage-card {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .usage-card h5 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
        }
        
        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .progress-fill {
          height: 100%;
          background: #667eea;
          transition: width 0.3s ease;
        }
        
        .progress-bar.elastic .progress-fill {
          background: #f59e0b;
        }
        
        .usage-numbers {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .usage-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6b7280;
        }
        
        .usage-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        /* 当前配额显示 */
        .current-quota {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          margin-bottom: 20px;
        }
        
        .current-quota h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .quota-display {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        .quota-item {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }
        
        .quota-item span {
          color: #6b7280;
        }
        
        .quota-item strong {
          color: #1f2937;
          font-weight: 600;
        }
        
        /* 小型空状态 */
        .empty-state.small {
          padding: 40px 20px;
        }
        
        .empty-state.small .empty-icon {
          font-size: 48px;
        }
        
        .empty-state.small .empty-title {
          font-size: 16px;
        }
        
        /* 角色徽章 */
        .role-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .role-user {
          background: #f3f4f6;
          color: #374151;
        }
        
        .role-admin {
          background: #fef3c7;
          color: #92400e;
        }
        
        .role-super_admin {
          background: #e0e7ff;
          color: #3730a3;
        }
        
        /* 最后登录信息 */
        .last-login {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .login-time {
          font-size: 13px;
          color: #374151;
        }
        
        .login-ago {
          font-size: 12px;
          color: #9ca3af;
        }
        
        .text-muted {
          color: #9ca3af;
        }
        
        .banned-reason {
          font-size: 12px;
          color: #ef4444;
          margin-top: 4px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
    
    // 加载用户数据
    await this.loadUsers();
    
    // 绑定事件
    this.bindEvents();
    
    // 设置全局引用以便事件处理
    window.adminV3App.userPage = this;
  }

  /**
   * 加载用户数据
   */
  async loadUsers() {
    const tableContent = document.getElementById('user-table-content');
    if (!tableContent) return;
    
    try {
      // 显示加载状态
      tableContent.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>正在加载用户数据...</p>
        </div>
      `;
      
      // 加载用户数据
      const users = await this.userManager.loadUsers();
      
      // 渲染用户表格
      tableContent.innerHTML = this.components.renderUserTable(users);
      
      // 渲染分页控件
      const paginationContainer = document.getElementById('pagination-container');
      if (paginationContainer) {
        paginationContainer.innerHTML = this.components.renderPagination(this.userManager.pagination);
      }
      
      // 绑定表格事件
      this.bindTableEvents();
      
    } catch (error) {
      console.error('Failed to load users:', error);
      tableContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <div class="empty-title">加载失败</div>
          <div class="empty-desc">${error.message || '请稍后重试'}</div>
        </div>
      `;
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 绑定全选复选框事件
    const selectAll = document.getElementById('select-all-users');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => this.handleSelectAll(e));
    }
  }
  
  /**
   * 绑定表格事件
   */
  bindTableEvents() {
    // 绑定单个用户复选框事件
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => this.handleUserSelect(e));
    });
    
    // 点击空白处关闭下拉菜单
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown.open').forEach(d => {
          d.classList.remove('open');
        });
      }
    });
  }

  /**
   * 添加用户
   */
  async addUser() {
    const modalHtml = this.components.renderUserEditForm();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  /**
   * 编辑用户
   */
  async editUser(userId) {
    const user = await this.userManager.getUserDetail(userId);
    if (user) {
      const modalHtml = this.components.renderUserEditForm(user);
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId) {
    const user = await this.userManager.getUserDetail(userId);
    if (!user) return;
    
    if (confirm(`确定要删除用户 ${user.username} 吗？此操作不可恢复。`)) {
      try {
        await this.userManager.deleteUser(userId);
        await this.loadUsers();
      } catch (error) {
        console.error('Delete user failed:', error);
      }
    }
  }
  
  /**
   * 查看用户详情
   */
  async viewUserDetail(userId) {
    const user = await this.userManager.getUserDetail(userId);
    if (!user) return;
    
    // 获取额外数据
    user.sessions = await this.userManager.getUserSessions(userId);
    user.permissions = await this.userManager.getUserPermissions(userId);
    
    const modalHtml = this.components.renderUserDetailModal(user);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 绑定标签页切换事件
    setTimeout(() => {
      const tabBtns = document.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tab = e.target.dataset.tab;
          
          // 切换按钮状态
          tabBtns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          
          // 切换内容
          document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
          });
          document.getElementById(`tab-${tab}`).style.display = 'block';
        });
      });
    }, 100);
  }
  
  /**
   * 更新用户状态
   */
  async updateUserStatus(userId, status) {
    try {
      await this.userManager.updateUserStatus(userId, status);
      await this.loadUsers();
      
      // 关闭下拉菜单
      document.querySelectorAll('.dropdown.open').forEach(d => {
        d.classList.remove('open');
      });
    } catch (error) {
      console.error('Update user status failed:', error);
    }
  }
  
  /**
   * 封禁用户
   */
  async banUser(userId) {
    const reason = prompt('请输入封禁原因：');
    if (!reason) return;
    
    try {
      await this.userManager.updateUser(userId, {
        status: 'banned',
        banned_reason: reason,
        banned_at: new Date().toISOString()
      });
      await this.loadUsers();
    } catch (error) {
      console.error('Ban user failed:', error);
    }
  }
  
  /**
   * 解除封禁
   */
  async unbanUser(userId) {
    try {
      await this.userManager.updateUser(userId, {
        status: 'active',
        banned_reason: null,
        banned_at: null
      });
      await this.loadUsers();
    } catch (error) {
      console.error('Unban user failed:', error);
    }
  }
  
  /**
   * 重置密码
   */
  async resetPassword(userId) {
    if (confirm('确定要重置该用户的密码吗？系统将发送重置邮件到用户邮箱。')) {
      try {
        await this.userManager.resetUserPassword(userId);
      } catch (error) {
        console.error('Reset password failed:', error);
      }
    }
  }
  
  /**
   * 调整配额
   */
  async adjustQuota(userId) {
    const user = await this.userManager.getUserDetail(userId);
    if (!user) return;
    
    const modalHtml = this.components.renderQuotaAdjustForm(user);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  /**
   * 保存配额调整
   */
  async saveQuotaAdjustment(event, userId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    try {
      await this.userManager.adjustUserQuota(userId, {
        monthly_limit: parseInt(formData.get('monthly_limit')),
        elastic_limit: parseInt(formData.get('elastic_limit')),
        reason: formData.get('reason')
      });
      
      // 关闭弹窗
      form.closest('.modal-overlay').remove();
      await this.loadUsers();
      
    } catch (error) {
      console.error('Adjust quota failed:', error);
    }
  }
  
  /**
   * 导出用户数据
   */
  async exportUsers() {
    const format = confirm('导出为CSV格式？\n\n确定：CSV格式\n取消：JSON格式') ? 'csv' : 'json';
    await this.userManager.exportUsers(format);
  }
  
  /**
   * 批量操作
   */
  async bulkActions() {
    if (this.selectedUsers.size === 0) {
      this.app.showToast('warning', '请先选择用户');
      return;
    }
    
    // TODO: 实现批量操作菜单
    this.app.showToast('info', `已选择 ${this.selectedUsers.size} 个用户`);
  }
  
  /**
   * 保存用户
   */
  async saveUser(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());
    
    try {
      if (userData.user_id) {
        // 更新用户
        await this.userManager.updateUser(userData.user_id, userData);
      } else {
        // 创建用户
        await this.userManager.createUser(userData);
      }
      
      // 关闭弹窗并刷新列表
      form.closest('.modal-overlay').remove();
      await this.loadUsers();
      
    } catch (error) {
      console.error('Save user failed:', error);
    }
  }
  
  /**
   * 处理全选
   */
  handleSelectAll(event) {
    const isChecked = event.target.checked;
    const checkboxes = document.querySelectorAll('.user-checkbox');
    
    checkboxes.forEach(cb => {
      cb.checked = isChecked;
      const userId = cb.value;
      if (isChecked) {
        this.selectedUsers.add(userId);
      } else {
        this.selectedUsers.delete(userId);
      }
    });
    
    this.updateBulkActionsButton();
  }
  
  /**
   * 处理单个用户选择
   */
  handleUserSelect(event) {
    const userId = event.target.value;
    if (event.target.checked) {
      this.selectedUsers.add(userId);
    } else {
      this.selectedUsers.delete(userId);
    }
    
    // 更新全选复选框状态
    const selectAll = document.getElementById('select-all-users');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    if (selectAll) {
      selectAll.checked = allChecked;
      selectAll.indeterminate = this.selectedUsers.size > 0 && !allChecked;
    }
    
    this.updateBulkActionsButton();
  }
  
  /**
   * 更新批量操作按钮状态
   */
  updateBulkActionsButton() {
    const bulkBtn = document.getElementById('bulk-actions-btn');
    if (bulkBtn) {
      bulkBtn.style.display = this.selectedUsers.size > 0 ? 'flex' : 'none';
      bulkBtn.textContent = `⚡ 批量操作 (${this.selectedUsers.size})`;
    }
  }
  
  /**
   * 应用过滤器
   */
  applyFilters() {
    const status = document.getElementById('filter-status').value;
    const userType = document.getElementById('filter-type').value;
    
    this.userManager.filterUsers({ status, userType });
    this.loadUsers();
  }
  
  /**
   * 搜索用户
   */
  searchUsers() {
    const query = document.getElementById('search-users').value;
    this.userManager.searchUsers(query);
    this.loadUsers();
  }
  
  /**
   * 处理搜索输入
   */
  handleSearch(event) {
    if (event.key === 'Enter') {
      this.searchUsers();
    }
  }
  
  /**
   * 重置过滤器
   */
  resetFilters() {
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('search-users').value = '';
    
    this.userManager.filterUsers({ status: 'all', userType: 'all', searchQuery: '' });
    this.loadUsers();
  }
  
  /**
   * 切换页面
   */
  changePage(page) {
    this.userManager.changePage(page);
    this.loadUsers();
  }
  
  /**
   * 其他用户操作方法（占位）
   */
  async viewSessions(userId) {
    await this.viewUserDetail(userId);
    // 自动切换到会话标签
    setTimeout(() => {
      document.querySelector('[data-tab="sessions"]').click();
    }, 200);
  }
  
  async viewPermissions(userId) {
    await this.viewUserDetail(userId);
    // 自动切换到权限标签
    setTimeout(() => {
      document.querySelector('[data-tab="permissions"]').click();
    }, 200);
  }
  
  async viewDetailedUsage(userId) {
    this.app.showToast('info', '使用记录功能开发中...');
  }
  
  async terminateSession(sessionId) {
    if (confirm('确定要结束此会话吗？')) {
      this.app.showToast('success', '会话已结束');
      // TODO: 实际调用API结束会话
    }
  }
  
  async addPermission() {
    this.app.showToast('info', '权限添加功能开发中...');
  }
  
  async removePermission(permissionId) {
    if (confirm('确定要移除此权限吗？')) {
      this.app.showToast('success', '权限已移除');
      // TODO: 实际调用API移除权限
    }
  }

  /**
   * 清理组件
   */
  destroy() {
    console.log('🧹 Destroying User page...');
    // 清理事件监听器等资源
    this.selectedUsers.clear();
    delete window.adminV3App.userPage;
  }
}

// 导出默认
export default UserPage;