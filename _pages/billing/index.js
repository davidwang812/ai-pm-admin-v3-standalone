/**
 * Billing Management Page
 * 计费管理页面 - V3重构版本
 */

import { BillingManager } from './billing-manager.js';
import { BillingComponents } from './billing-components.js';

export class BillingPage {
  constructor(app) {
    this.app = app;
    this.billingManager = new BillingManager(app);
    this.components = new BillingComponents(this.billingManager);
    this.currentView = 'overview'; // overview, orders, plans, recharges
  }

  async render() {
    console.log('💰 Rendering enhanced Billing Management page...');
    
    const html = `
      <div class="billing-page">
        <div class="page-header">
          <div class="header-content">
            <h1>💰 计费管理</h1>
            <p>管理订阅计划、订单和收入分析</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="window.adminV3App.billingPage.createOrder()">
              ➕ 创建订单
            </button>
            <button class="btn" onclick="window.adminV3App.billingPage.exportData()">
              📤 导出数据
            </button>
          </div>
        </div>
        
        <!-- 视图切换标签 -->
        <div class="view-tabs">
          <button class="tab-btn active" data-view="overview" onclick="window.adminV3App.billingPage.switchView('overview')">
            📊 概览
          </button>
          <button class="tab-btn" data-view="orders" onclick="window.adminV3App.billingPage.switchView('orders')">
            📋 订单管理
          </button>
          <button class="tab-btn" data-view="plans" onclick="window.adminV3App.billingPage.switchView('plans')">
            📦 订阅计划
          </button>
          <button class="tab-btn" data-view="recharges" onclick="window.adminV3App.billingPage.switchView('recharges')">
            💳 充值记录
          </button>
        </div>
        
        <!-- 内容区域 -->
        <div class="content-area">
          <div id="billing-content">
            <div class="loading-state">
              <div class="spinner"></div>
              <p>正在加载数据...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 样式
    const styles = `
      <style>
        .billing-page {
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
        
        /* 视图标签样式 */
        .view-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: -1px;
        }
        
        .tab-btn {
          padding: 12px 20px;
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
        
        /* 收入统计卡片 */
        .revenue-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .stat-card.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .stat-card.primary h3,
        .stat-card.primary .stat-sub {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .stat-icon {
          font-size: 32px;
          margin-bottom: 12px;
          opacity: 0.8;
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
        
        .stat-card.primary .stat-number {
          color: white;
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
        
        .stat-sub {
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        }
        
        /* 支付方式分布 */
        .payment-methods {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }
        
        .method-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }
        
        .method-name {
          color: #6b7280;
          font-size: 13px;
        }
        
        .method-percent {
          font-weight: 600;
          color: #1f2937;
          font-size: 13px;
        }
        
        /* 订阅计划网格 */
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 30px;
        }
        
        .plan-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          padding: 24px;
          position: relative;
          transition: all 0.3s ease;
        }
        
        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        
        .plan-card.featured {
          border-color: #667eea;
          transform: scale(1.05);
        }
        
        .featured-badge {
          position: absolute;
          top: -12px;
          right: 20px;
          background: #667eea;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .plan-header h3 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .plan-price {
          margin-bottom: 8px;
        }
        
        .price-amount {
          font-size: 36px;
          font-weight: 700;
          color: #1f2937;
        }
        
        .price-unit {
          font-size: 16px;
          color: #6b7280;
          font-weight: 400;
        }
        
        .price-free {
          font-size: 28px;
          font-weight: 600;
          color: #10b981;
        }
        
        .yearly-price {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }
        
        .yearly-price strong {
          color: #1f2937;
        }
        
        .discount-badge {
          display: inline-block;
          background: #fef3c7;
          color: #92400e;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          margin-left: 8px;
        }
        
        .plan-quotas {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .quota-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .quota-item:last-child {
          margin-bottom: 0;
        }
        
        .quota-label {
          color: #6b7280;
          font-size: 14px;
        }
        
        .quota-value {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }
        
        .plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
        }
        
        .plan-features li {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          font-size: 14px;
          color: #374151;
        }
        
        .feature-icon {
          color: #10b981;
          font-weight: 600;
        }
        
        .plan-actions {
          display: flex;
          gap: 8px;
        }
        
        .btn-featured {
          background: #667eea;
          color: white;
        }
        
        .btn-featured:hover {
          background: #5a67d8;
        }
        
        .btn-link {
          background: transparent;
          color: #667eea;
          border: none;
          padding: 8px 12px;
          font-size: 14px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .btn-link:hover {
          opacity: 0.8;
        }
        
        /* 订单表格样式 */
        .orders-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        
        .orders-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .orders-table th,
        .orders-table td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .orders-table th {
          background: #f9fafb;
          color: #374151;
          font-weight: 500;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .orders-table tbody tr {
          transition: background-color 0.2s;
        }
        
        .orders-table tbody tr:hover {
          background: #f9fafb;
        }
        
        .order-number a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }
        
        .order-number a:hover {
          text-decoration: underline;
        }
        
        .user-info-compact {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .user-name {
          font-weight: 500;
          color: #1f2937;
        }
        
        .order-amount {
          font-weight: 600;
          color: #1f2937;
        }
        
        .order-time {
          font-size: 13px;
          color: #6b7280;
        }
        
        /* 订单状态徽章 */
        .order-status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        
        .status-paid {
          background: #dcfdf7;
          color: #065f46;
        }
        
        .status-failed {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .status-cancelled {
          background: #f3f4f6;
          color: #374151;
        }
        
        .status-refunded {
          background: #e0e7ff;
          color: #3730a3;
        }
        
        /* 订单类型徽章 */
        .order-type-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .type-upgrade {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .type-renewal {
          background: #e0e7ff;
          color: #3730a3;
        }
        
        .type-addon {
          background: #fef3c7;
          color: #92400e;
        }
        
        /* 收入图表 */
        .revenue-chart {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          margin-bottom: 30px;
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .chart-header h4 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .chart-legend {
          display: flex;
          gap: 16px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6b7280;
        }
        
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
        
        .chart-container {
          height: 200px;
          position: relative;
        }
        
        .chart-bars {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 100%;
          gap: 8px;
        }
        
        .chart-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          cursor: pointer;
        }
        
        .bar-fill {
          width: 100%;
          background: #667eea;
          border-radius: 4px 4px 0 0;
          transition: all 0.3s ease;
          min-height: 4px;
        }
        
        .chart-bar:hover .bar-fill {
          background: #5a67d8;
        }
        
        .bar-label {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
        }
        
        /* 充值记录表格 */
        .recharges-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .recharges-table th,
        .recharges-table td {
          padding: 14px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .recharges-table th {
          background: #f9fafb;
          color: #374151;
          font-weight: 500;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .amount {
          font-weight: 600;
          color: #1f2937;
        }
        
        .tokens {
          font-weight: 500;
          color: #374151;
        }
        
        .bonus-tokens {
          color: #10b981;
          font-size: 12px;
          font-weight: 600;
          margin-left: 4px;
        }
        
        .payment-method {
          display: inline-block;
          padding: 4px 8px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .recharge-status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-completed {
          background: #dcfdf7;
          color: #065f46;
        }
        
        /* 表单样式 */
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        /* 章节头部样式 */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .section-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .section-stats {
          display: flex;
          gap: 24px;
          font-size: 14px;
          color: #6b7280;
        }
        
        .section-stats strong {
          color: #1f2937;
          font-weight: 600;
        }
        
        /* 通用样式 */
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
        
        .btn-danger {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }
        
        .btn-danger:hover {
          background: #dc2626;
          border-color: #dc2626;
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
        
        .filter-actions {
          display: flex;
          gap: 8px;
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
        
        /* 信息网格 */
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
        
        .text-primary {
          color: #667eea;
        }
        
        /* 详情弹窗样式 */
        .detail-sections {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .detail-section {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
        }
        
        .detail-section h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .gateway-response {
          background: #f3f4f6;
          padding: 12px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          color: #374151;
          white-space: pre-wrap;
          margin: 0;
        }
        
        .operation-logs {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .log-item {
          display: flex;
          gap: 16px;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .log-item:last-child {
          border-bottom: none;
        }
        
        .log-time {
          color: #6b7280;
          font-size: 13px;
          min-width: 140px;
        }
        
        .log-action {
          color: #1f2937;
          font-size: 14px;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        
        /* 支付状态徽章 */
        .payment-status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .payment-status-badge.status-success {
          background: #dcfdf7;
          color: #065f46;
        }
        
        .payment-status-badge.status-failed {
          background: #fee2e2;
          color: #991b1b;
        }
        
        @media (max-width: 768px) {
          .billing-page {
            padding: 15px;
          }
          
          .revenue-stats {
            grid-template-columns: 1fr;
          }
          
          .plans-grid {
            grid-template-columns: 1fr;
          }
          
          .plan-card.featured {
            transform: none;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
    
    console.log('✅ Billing Management page rendered');
    return styles + html;
  }

  /**
   * 组件挂载后的生命周期
   */
  async mounted() {
    console.log('📌 BillingPage mounted, loading data...');
    
    // 设置全局引用
    window.adminV3App.billingPage = this;
    
    // 加载默认视图
    await this.switchView('overview');
  }

  /**
   * 切换视图
   */
  async switchView(view) {
    console.log(`🔄 Switching to ${view} view...`);
    
    // 更新标签状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    this.currentView = view;
    const contentDiv = document.getElementById('billing-content');
    
    try {
      // 显示加载状态
      contentDiv.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>正在加载数据...</p>
        </div>
      `;
      
      switch (view) {
        case 'overview':
          await this.renderOverview();
          break;
        case 'orders':
          await this.renderOrders();
          break;
        case 'plans':
          await this.renderPlans();
          break;
        case 'recharges':
          await this.renderRecharges();
          break;
      }
    } catch (error) {
      console.error(`Failed to render ${view}:`, error);
      contentDiv.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <div class="empty-title">加载失败</div>
          <div class="empty-desc">${error.message || '请稍后重试'}</div>
        </div>
      `;
    }
  }

  /**
   * 渲染概览视图
   */
  async renderOverview() {
    const stats = await this.billingManager.getRevenueStats();
    const recentOrders = await this.billingManager.loadOrders();
    
    const html = `
      <div class="overview-content">
        ${this.components.renderRevenueStats(stats)}
        ${this.components.renderRevenueChart(stats.revenueByDay)}
        
        <div class="orders-section">
          <div class="section-header">
            <h3>最近订单</h3>
            <button class="btn btn-link" onclick="window.adminV3App.billingPage.switchView('orders')">
              查看全部 →
            </button>
          </div>
          ${this.components.renderOrdersTable(recentOrders.slice(0, 5))}
        </div>
      </div>
    `;
    
    document.getElementById('billing-content').innerHTML = html;
  }

  /**
   * 渲染订单视图
   */
  async renderOrders() {
    const orders = await this.billingManager.loadOrders();
    
    const html = `
      <div class="orders-content">
        ${this.components.renderFilters(this.billingManager.currentFilter)}
        
        <div class="orders-section">
          ${this.components.renderOrdersTable(orders)}
          <div id="pagination-container">
            ${this.components.renderPagination(this.billingManager.pagination)}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('billing-content').innerHTML = html;
  }

  /**
   * 渲染订阅计划视图
   */
  async renderPlans() {
    const plans = await this.billingManager.loadSubscriptionPlans();
    
    const html = `
      <div class="plans-content">
        <div class="section-header">
          <h3>订阅计划管理</h3>
          <button class="btn btn-primary" onclick="window.adminV3App.billingPage.createPlan()">
            ➕ 创建计划
          </button>
        </div>
        
        ${this.components.renderSubscriptionPlans(plans)}
      </div>
    `;
    
    document.getElementById('billing-content').innerHTML = html;
  }

  /**
   * 渲染充值记录视图
   */
  async renderRecharges() {
    const recharges = await this.billingManager.loadRecharges();
    
    const html = `
      <div class="recharges-content">
        <div class="section-header">
          <h3>充值记录</h3>
          <div class="section-stats">
            <span>总充值金额: <strong>¥${recharges.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}</strong></span>
            <span>总Tokens: <strong>${this.components.formatNumber(recharges.reduce((sum, r) => sum + r.tokens, 0))}</strong></span>
          </div>
        </div>
        
        <div class="orders-section">
          ${this.components.renderRechargesTable(recharges)}
        </div>
      </div>
    `;
    
    document.getElementById('billing-content').innerHTML = html;
  }

  /**
   * 创建订单
   */
  async createOrder() {
    // TODO: 实现创建订单功能
    this.app.showToast('info', '创建订单功能开发中...');
  }

  /**
   * 查看订单详情
   */
  async viewOrderDetail(orderId) {
    const order = this.billingManager.orders.find(o => o.order_id === parseInt(orderId));
    if (!order) return;
    
    // 查找对应的支付记录
    const payment = this.billingManager.payments.find(p => p.order_id === order.order_id);
    
    const modalHtml = this.components.renderOrderDetailModal(order, payment);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  /**
   * 标记为已支付
   */
  async markAsPaid(orderId) {
    try {
      await this.billingManager.updateOrderStatus(orderId, 'paid');
      
      // 关闭弹窗和下拉菜单
      const modal = document.getElementById('order-detail-modal');
      if (modal) modal.remove();
      
      document.querySelectorAll('.dropdown.open').forEach(d => {
        d.classList.remove('open');
      });
      
      // 刷新当前视图
      await this.switchView(this.currentView);
    } catch (error) {
      console.error('Mark as paid failed:', error);
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId) {
    if (!confirm('确定要取消此订单吗？')) return;
    
    try {
      await this.billingManager.updateOrderStatus(orderId, 'cancelled');
      await this.switchView(this.currentView);
    } catch (error) {
      console.error('Cancel order failed:', error);
    }
  }

  /**
   * 处理退款
   */
  async processRefund(orderId) {
    const reason = prompt('请输入退款原因：');
    if (!reason) return;
    
    try {
      await this.billingManager.processRefund(orderId, reason);
      
      // 关闭弹窗
      const modal = document.getElementById('order-detail-modal');
      if (modal) modal.remove();
      
      await this.switchView(this.currentView);
    } catch (error) {
      console.error('Process refund failed:', error);
    }
  }

  /**
   * 查看支付详情
   */
  async viewPaymentDetail(orderId) {
    await this.viewOrderDetail(orderId);
  }

  /**
   * 下载发票
   */
  async downloadInvoice(orderId) {
    this.app.showToast('info', '发票下载功能开发中...');
  }

  /**
   * 选择计划
   */
  async selectPlan(planId) {
    this.app.showToast('info', `选择计划 ${planId} 功能开发中...`);
  }

  /**
   * 编辑计划
   */
  async editPlan(planId) {
    const plan = this.billingManager.plans.find(p => p.plan_id === parseInt(planId));
    if (plan) {
      const modalHtml = this.components.renderPlanEditForm(plan);
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
  }

  /**
   * 创建计划
   */
  async createPlan() {
    const modalHtml = this.components.renderPlanEditForm();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  /**
   * 保存计划
   */
  async savePlan(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const planData = {
      plan_name: formData.get('plan_name'),
      plan_type: formData.get('plan_type'),
      monthly_price: parseFloat(formData.get('monthly_price')),
      yearly_price: parseFloat(formData.get('yearly_price')),
      token_quota: parseInt(formData.get('token_quota')),
      elastic_quota: parseInt(formData.get('elastic_quota')),
      features: formData.get('features').split('\n').filter(f => f.trim()),
      status: formData.get('status')
    };
    
    try {
      const planId = formData.get('plan_id');
      if (planId) {
        // 更新计划
        await this.billingManager.updateSubscriptionPlan(planId, planData);
      } else {
        // 创建计划（需要在BillingManager中实现）
        this.app.showToast('info', '创建计划功能待实现');
      }
      
      // 关闭弹窗并刷新
      form.closest('.modal-overlay').remove();
      await this.switchView('plans');
      
    } catch (error) {
      console.error('Save plan failed:', error);
    }
  }

  /**
   * 应用过滤器
   */
  applyFilters() {
    const status = document.getElementById('filter-status').value;
    const dateRange = document.getElementById('filter-date-range').value;
    
    this.billingManager.filterOrders({ status, dateRange });
    this.renderOrders();
  }

  /**
   * 搜索订单
   */
  searchOrders() {
    const query = document.getElementById('search-orders').value;
    this.billingManager.searchOrders(query);
    this.renderOrders();
  }

  /**
   * 处理搜索输入
   */
  handleSearch(event) {
    if (event.key === 'Enter') {
      this.searchOrders();
    }
  }

  /**
   * 重置过滤器
   */
  resetFilters() {
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-date-range').value = 'last_30_days';
    document.getElementById('search-orders').value = '';
    
    this.billingManager.filterOrders({ status: 'all', dateRange: 'last_30_days', searchQuery: '' });
    this.renderOrders();
  }

  /**
   * 导出数据
   */
  async exportData() {
    const format = confirm('导出为CSV格式？\n\n确定：CSV格式\n取消：JSON格式') ? 'csv' : 'json';
    
    if (this.currentView === 'orders') {
      await this.billingManager.exportBillingData(format, this.billingManager.currentFilter.dateRange);
    } else {
      this.app.showToast('info', '请先切换到订单视图');
    }
  }

  /**
   * 切换页面
   */
  changePage(page) {
    this.billingManager.changePage(page);
    this.renderOrders();
  }

  /**
   * 清理组件
   */
  destroy() {
    console.log('🧹 Destroying Billing page...');
    delete window.adminV3App.billingPage;
  }
}

// 导出默认
export default BillingPage;