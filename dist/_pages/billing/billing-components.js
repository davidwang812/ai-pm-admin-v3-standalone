/**
 * Billing Management UI Components
 * 计费管理界面组件库
 */

export class BillingComponents {
    constructor(billingManager) {
        this.billingManager = billingManager;
    }

    /**
     * 渲染订阅计划卡片
     */
    renderSubscriptionPlans(plans) {
        if (!plans || plans.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <div class="empty-title">暂无订阅计划</div>
                    <div class="empty-desc">没有找到可用的订阅计划</div>
                </div>
            `;
        }

        return `
            <div class="plans-grid">
                ${plans.map(plan => this.renderPlanCard(plan)).join('')}
            </div>
        `;
    }

    /**
     * 渲染单个计划卡片
     */
    renderPlanCard(plan) {
        const yearlyDiscount = this.billingManager.calculateDiscount(plan.monthly_price, plan.yearly_price);
        const isPro = plan.plan_type === 'pro';
        
        return `
            <div class="plan-card ${isPro ? 'featured' : ''}" data-plan-id="${plan.plan_id}">
                ${isPro ? '<div class="featured-badge">🌟 最受欢迎</div>' : ''}
                <div class="plan-header">
                    <h3>${plan.plan_name}</h3>
                    <div class="plan-price">
                        ${plan.monthly_price > 0 ? `
                            <span class="price-amount">¥${plan.monthly_price}</span>
                            <span class="price-unit">/月</span>
                        ` : '<span class="price-free">免费</span>'}
                    </div>
                    ${yearlyDiscount > 0 ? `
                        <div class="yearly-price">
                            年付仅 <strong>¥${Math.floor(plan.yearly_price / 12)}/月</strong>
                            <span class="discount-badge">省${yearlyDiscount}%</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="plan-quotas">
                    <div class="quota-item">
                        <span class="quota-label">月度配额</span>
                        <span class="quota-value">${this.formatNumber(plan.token_quota)} Tokens</span>
                    </div>
                    ${plan.elastic_quota > 0 ? `
                        <div class="quota-item">
                            <span class="quota-label">弹性配额</span>
                            <span class="quota-value">${this.formatNumber(plan.elastic_quota)} Tokens</span>
                        </div>
                    ` : ''}
                </div>
                
                <ul class="plan-features">
                    ${plan.features.map(feature => `
                        <li><span class="feature-icon">✓</span> ${feature}</li>
                    `).join('')}
                </ul>
                
                <div class="plan-actions">
                    <button class="btn btn-primary ${isPro ? 'btn-featured' : ''}" 
                            onclick="window.adminV3App.billingPage.selectPlan('${plan.plan_id}')">
                        选择此计划
                    </button>
                    <button class="btn btn-link" 
                            onclick="window.adminV3App.billingPage.editPlan('${plan.plan_id}')">
                        编辑
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 渲染订单表格
     */
    renderOrdersTable(orders) {
        if (!orders || orders.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div class="empty-title">暂无订单数据</div>
                    <div class="empty-desc">没有找到符合条件的订单</div>
                </div>
            `;
        }

        return `
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>订单号</th>
                        <th>用户</th>
                        <th>类型</th>
                        <th>金额</th>
                        <th>状态</th>
                        <th>创建时间</th>
                        <th>支付时间</th>
                        <th style="width: 120px;">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => this.renderOrderRow(order)).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * 渲染订单行
     */
    renderOrderRow(order) {
        return `
            <tr data-order-id="${order.order_id}">
                <td>
                    <div class="order-number">
                        <a href="#" onclick="window.adminV3App.billingPage.viewOrderDetail('${order.order_id}'); return false;">
                            ${order.order_number}
                        </a>
                    </div>
                </td>
                <td>
                    <div class="user-info-compact">
                        <span class="user-name">${order.metadata.user_name || '-'}</span>
                    </div>
                </td>
                <td>
                    <span class="order-type-badge type-${order.order_type}">
                        ${this.billingManager.getOrderTypeDisplay(order.order_type)}
                    </span>
                </td>
                <td>
                    <div class="order-amount">
                        ¥${order.amount.toFixed(2)}
                    </div>
                </td>
                <td>
                    <span class="order-status-badge status-${order.status}">
                        ${this.billingManager.getOrderStatusDisplay(order.status)}
                    </span>
                </td>
                <td>
                    <div class="order-time">
                        ${this.formatDate(order.created_at)}
                    </div>
                </td>
                <td>
                    <div class="order-time">
                        ${order.paid_at ? this.formatDate(order.paid_at) : '-'}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="window.adminV3App.billingPage.viewOrderDetail('${order.order_id}')" title="查看详情">
                            👁️
                        </button>
                        <div class="dropdown">
                            <button class="btn-icon" onclick="this.parentElement.classList.toggle('open')">
                                ⋮
                            </button>
                            <div class="dropdown-menu">
                                ${this.renderOrderActions(order)}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * 渲染订单操作菜单
     */
    renderOrderActions(order) {
        const actions = [];
        
        if (order.status === 'pending') {
            actions.push(`
                <a href="#" onclick="window.adminV3App.billingPage.markAsPaid('${order.order_id}'); return false;">
                    ✅ 标记为已支付
                </a>
                <a href="#" onclick="window.adminV3App.billingPage.cancelOrder('${order.order_id}'); return false;">
                    ❌ 取消订单
                </a>
            `);
        } else if (order.status === 'paid') {
            actions.push(`
                <a href="#" onclick="window.adminV3App.billingPage.processRefund('${order.order_id}'); return false;" class="text-danger">
                    💰 申请退款
                </a>
            `);
        }
        
        actions.push(`
            <a href="#" onclick="window.adminV3App.billingPage.viewPaymentDetail('${order.order_id}'); return false;">
                💳 查看支付详情
            </a>
            <a href="#" onclick="window.adminV3App.billingPage.downloadInvoice('${order.order_id}'); return false;">
                📄 下载发票
            </a>
        `);
        
        return actions.join('');
    }

    /**
     * 渲染订单详情弹窗
     */
    renderOrderDetailModal(order, payment = null) {
        return `
            <div class="modal-overlay" id="order-detail-modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>订单详情 - ${order.order_number}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-sections">
                            <!-- 订单信息 -->
                            <div class="detail-section">
                                <h4>订单信息</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>订单号</label>
                                        <span>${order.order_number}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>订单类型</label>
                                        <span>${this.billingManager.getOrderTypeDisplay(order.order_type)}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>订单金额</label>
                                        <span class="text-primary">¥${order.amount.toFixed(2)}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>订单状态</label>
                                        <span class="order-status-badge status-${order.status}">
                                            ${this.billingManager.getOrderStatusDisplay(order.status)}
                                        </span>
                                    </div>
                                    <div class="info-item">
                                        <label>创建时间</label>
                                        <span>${this.formatDate(order.created_at)}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>支付时间</label>
                                        <span>${order.paid_at ? this.formatDate(order.paid_at) : '未支付'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 用户信息 -->
                            <div class="detail-section">
                                <h4>用户信息</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>用户ID</label>
                                        <span>${order.user_id}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>用户名</label>
                                        <span>${order.metadata.user_name || '-'}</span>
                                    </div>
                                    ${order.metadata.plan_name ? `
                                        <div class="info-item">
                                            <label>订阅计划</label>
                                            <span>${order.metadata.plan_name}</span>
                                        </div>
                                    ` : ''}
                                    ${order.metadata.billing_cycle ? `
                                        <div class="info-item">
                                            <label>计费周期</label>
                                            <span>${order.metadata.billing_cycle === 'monthly' ? '月付' : '年付'}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- 支付信息 -->
                            ${payment ? `
                                <div class="detail-section">
                                    <h4>支付信息</h4>
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <label>支付方式</label>
                                            <span>${this.billingManager.getPaymentMethodDisplay(payment.payment_method)}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>交易号</label>
                                            <span>${payment.transaction_id}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>支付状态</label>
                                            <span class="payment-status-badge status-${payment.status}">
                                                ${payment.status === 'success' ? '成功' : '失败'}
                                            </span>
                                        </div>
                                        <div class="info-item">
                                            <label>处理时间</label>
                                            <span>${payment.processed_at ? this.formatDate(payment.processed_at) : '-'}</span>
                                        </div>
                                        ${payment.gateway_response ? `
                                            <div class="info-item full-width">
                                                <label>支付网关响应</label>
                                                <pre class="gateway-response">${payment.gateway_response}</pre>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- 操作记录 -->
                            <div class="detail-section">
                                <h4>操作记录</h4>
                                <div class="operation-logs">
                                    <div class="log-item">
                                        <span class="log-time">${this.formatDate(order.created_at)}</span>
                                        <span class="log-action">订单创建</span>
                                    </div>
                                    ${order.paid_at ? `
                                        <div class="log-item">
                                            <span class="log-time">${this.formatDate(order.paid_at)}</span>
                                            <span class="log-action">支付成功</span>
                                        </div>
                                    ` : ''}
                                    ${order.metadata.refund_at ? `
                                        <div class="log-item">
                                            <span class="log-time">${this.formatDate(order.metadata.refund_at)}</span>
                                            <span class="log-action">申请退款: ${order.metadata.refund_reason}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            ${this.renderOrderModalActions(order)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染订单弹窗操作按钮
     */
    renderOrderModalActions(order) {
        const actions = [];
        
        if (order.status === 'pending') {
            actions.push(`
                <button class="btn btn-primary" onclick="window.adminV3App.billingPage.markAsPaid('${order.order_id}')">
                    标记为已支付
                </button>
            `);
        } else if (order.status === 'paid') {
            actions.push(`
                <button class="btn btn-danger" onclick="window.adminV3App.billingPage.processRefund('${order.order_id}')">
                    申请退款
                </button>
            `);
        }
        
        actions.push(`
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                关闭
            </button>
        `);
        
        return actions.join('');
    }

    /**
     * 渲染收入统计卡片
     */
    renderRevenueStats(stats) {
        if (!stats) {
            return '<div class="loading-state">正在加载统计数据...</div>';
        }
        
        return `
            <div class="revenue-stats">
                <div class="stat-card primary">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <h3>总收入</h3>
                        <div class="stat-number">¥${this.formatNumber(stats.totalRevenue)}</div>
                        <div class="stat-change ${stats.revenueGrowth >= 0 ? 'positive' : 'negative'}">
                            ${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth}%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-content">
                        <h3>订单总数</h3>
                        <div class="stat-number">${stats.totalOrders}</div>
                        <div class="stat-sub">
                            成功率: ${((stats.paidOrders / stats.totalOrders) * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">💳</div>
                    <div class="stat-content">
                        <h3>平均订单价值</h3>
                        <div class="stat-number">¥${stats.averageOrderValue.toFixed(2)}</div>
                        <div class="stat-change ${stats.orderGrowth >= 0 ? 'positive' : 'negative'}">
                            ${stats.orderGrowth >= 0 ? '+' : ''}${stats.orderGrowth}%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <h3>支付方式分布</h3>
                        <div class="payment-methods">
                            ${Object.entries(stats.paymentMethods).map(([method, data]) => `
                                <div class="method-item">
                                    <span class="method-name">${this.billingManager.getPaymentMethodDisplay(method)}</span>
                                    <span class="method-percent">${((data.count / stats.totalOrders) * 100).toFixed(0)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染收入图表
     */
    renderRevenueChart(dailyData) {
        if (!dailyData || dailyData.length === 0) {
            return '<div class="empty-state small">暂无图表数据</div>';
        }
        
        // 简化的图表渲染（实际项目中可以使用Chart.js等）
        const maxRevenue = Math.max(...dailyData.map(d => d.revenue));
        
        return `
            <div class="revenue-chart">
                <div class="chart-header">
                    <h4>收入趋势</h4>
                    <div class="chart-legend">
                        <span class="legend-item">
                            <span class="legend-color" style="background: #667eea"></span>
                            收入金额
                        </span>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-bars">
                        ${dailyData.slice(-14).map(day => `
                            <div class="chart-bar" title="${day.date}: ¥${day.revenue}">
                                <div class="bar-fill" style="height: ${(day.revenue / maxRevenue * 100)}%"></div>
                                <div class="bar-label">${new Date(day.date).getDate()}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染充值记录表格
     */
    renderRechargesTable(recharges) {
        if (!recharges || recharges.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">💰</div>
                    <div class="empty-title">暂无充值记录</div>
                    <div class="empty-desc">没有找到符合条件的充值记录</div>
                </div>
            `;
        }

        return `
            <table class="recharges-table">
                <thead>
                    <tr>
                        <th>充值ID</th>
                        <th>用户</th>
                        <th>充值金额</th>
                        <th>获得Tokens</th>
                        <th>支付方式</th>
                        <th>状态</th>
                        <th>充值时间</th>
                        <th>备注</th>
                    </tr>
                </thead>
                <tbody>
                    ${recharges.map(recharge => this.renderRechargeRow(recharge)).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * 渲染充值记录行
     */
    renderRechargeRow(recharge) {
        const hasBonus = recharge.metadata && recharge.metadata.bonus_tokens > 0;
        
        return `
            <tr data-recharge-id="${recharge.recharge_id}">
                <td>#${recharge.recharge_id}</td>
                <td>
                    <div class="user-info-compact">
                        <span class="user-name">${recharge.metadata.user_name || '-'}</span>
                    </div>
                </td>
                <td>
                    <div class="amount">¥${recharge.amount.toFixed(2)}</div>
                </td>
                <td>
                    <div class="tokens">
                        ${this.formatNumber(recharge.tokens)}
                        ${hasBonus ? `
                            <span class="bonus-tokens">+${this.formatNumber(recharge.metadata.bonus_tokens)}</span>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <span class="payment-method">
                        ${this.billingManager.getPaymentMethodDisplay(recharge.payment_method)}
                    </span>
                </td>
                <td>
                    <span class="recharge-status-badge status-${recharge.status}">
                        ${recharge.status === 'completed' ? '已完成' : '处理中'}
                    </span>
                </td>
                <td>
                    <div class="recharge-time">
                        ${this.formatDate(recharge.created_at)}
                    </div>
                </td>
                <td>
                    ${recharge.metadata.promotion || '-'}
                </td>
            </tr>
        `;
    }

    /**
     * 渲染计划编辑表单
     */
    renderPlanEditForm(plan = {}) {
        const isNew = !plan.plan_id;
        
        return `
            <div class="modal-overlay" id="plan-edit-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${isNew ? '创建订阅计划' : '编辑订阅计划'}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <form id="plan-edit-form" onsubmit="window.adminV3App.billingPage.savePlan(event); return false;">
                            ${!isNew ? `<input type="hidden" name="plan_id" value="${plan.plan_id}">` : ''}
                            
                            <div class="form-group">
                                <label>计划名称 <span class="required">*</span></label>
                                <input type="text" name="plan_name" value="${plan.plan_name || ''}" 
                                       required placeholder="如：专业版">
                            </div>
                            
                            <div class="form-group">
                                <label>计划类型 <span class="required">*</span></label>
                                <select name="plan_type" required>
                                    <option value="free" ${plan.plan_type === 'free' ? 'selected' : ''}>
                                        免费版
                                    </option>
                                    <option value="basic" ${plan.plan_type === 'basic' ? 'selected' : ''}>
                                        基础版
                                    </option>
                                    <option value="pro" ${plan.plan_type === 'pro' ? 'selected' : ''}>
                                        专业版
                                    </option>
                                    <option value="enterprise" ${plan.plan_type === 'enterprise' ? 'selected' : ''}>
                                        企业版
                                    </option>
                                </select>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>月费价格 (元)</label>
                                    <input type="number" name="monthly_price" 
                                           value="${plan.monthly_price || 0}" 
                                           min="0" step="1" required>
                                </div>
                                
                                <div class="form-group">
                                    <label>年费价格 (元)</label>
                                    <input type="number" name="yearly_price" 
                                           value="${plan.yearly_price || 0}" 
                                           min="0" step="1" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>月度Token配额</label>
                                    <input type="number" name="token_quota" 
                                           value="${plan.token_quota || 0}" 
                                           min="0" step="1000" required>
                                </div>
                                
                                <div class="form-group">
                                    <label>弹性Token配额</label>
                                    <input type="number" name="elastic_quota" 
                                           value="${plan.elastic_quota || 0}" 
                                           min="0" step="1000" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>功能列表 (每行一个)</label>
                                <textarea name="features" rows="6" 
                                          placeholder="所有免费版功能&#10;每月50000 Tokens&#10;优先技术支持"
                                >${plan.features ? plan.features.join('\n') : ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>状态</label>
                                <select name="status">
                                    <option value="active" ${plan.status === 'active' ? 'selected' : ''}>
                                        激活
                                    </option>
                                    <option value="inactive" ${plan.status === 'inactive' ? 'selected' : ''}>
                                        停用
                                    </option>
                                </select>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" 
                                        onclick="this.closest('.modal-overlay').remove()">
                                    取消
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    ${isNew ? '创建计划' : '保存更改'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染过滤器
     */
    renderFilters(currentFilter) {
        return `
            <div class="filter-section">
                <div class="filter-group">
                    <label>订单状态</label>
                    <select id="filter-status" onchange="window.adminV3App.billingPage.applyFilters()">
                        <option value="all" ${currentFilter.status === 'all' ? 'selected' : ''}>全部</option>
                        <option value="pending" ${currentFilter.status === 'pending' ? 'selected' : ''}>待支付</option>
                        <option value="paid" ${currentFilter.status === 'paid' ? 'selected' : ''}>已支付</option>
                        <option value="failed" ${currentFilter.status === 'failed' ? 'selected' : ''}>支付失败</option>
                        <option value="cancelled" ${currentFilter.status === 'cancelled' ? 'selected' : ''}>已取消</option>
                        <option value="refunded" ${currentFilter.status === 'refunded' ? 'selected' : ''}>已退款</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>时间范围</label>
                    <select id="filter-date-range" onchange="window.adminV3App.billingPage.applyFilters()">
                        <option value="today" ${currentFilter.dateRange === 'today' ? 'selected' : ''}>今天</option>
                        <option value="last_7_days" ${currentFilter.dateRange === 'last_7_days' ? 'selected' : ''}>最近7天</option>
                        <option value="last_30_days" ${currentFilter.dateRange === 'last_30_days' ? 'selected' : ''}>最近30天</option>
                        <option value="last_90_days" ${currentFilter.dateRange === 'last_90_days' ? 'selected' : ''}>最近90天</option>
                        <option value="custom" ${currentFilter.dateRange === 'custom' ? 'selected' : ''}>自定义</option>
                    </select>
                </div>
                
                <div class="filter-group search-group">
                    <label>搜索订单</label>
                    <div class="search-input">
                        <input type="text" id="search-orders" 
                               placeholder="输入订单号或用户名..." 
                               value="${currentFilter.searchQuery || ''}"
                               onkeyup="window.adminV3App.billingPage.handleSearch(event)">
                        <button class="search-btn" onclick="window.adminV3App.billingPage.searchOrders()">
                            🔍
                        </button>
                    </div>
                </div>
                
                <div class="filter-actions">
                    <button class="btn btn-secondary" onclick="window.adminV3App.billingPage.resetFilters()">
                        重置筛选
                    </button>
                    <button class="btn btn-primary" onclick="window.adminV3App.billingPage.exportData()">
                        📤 导出数据
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 渲染分页控件
     */
    renderPagination(pagination) {
        const { page, pageSize, total } = pagination;
        const totalPages = Math.ceil(total / pageSize);
        
        if (totalPages === 0) return '';
        
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        return `
            <div class="pagination">
                <button class="page-btn" onclick="window.adminV3App.billingPage.changePage(1)" 
                        ${page === 1 ? 'disabled' : ''}>
                    首页
                </button>
                <button class="page-btn" onclick="window.adminV3App.billingPage.changePage(${page - 1})" 
                        ${page === 1 ? 'disabled' : ''}>
                    上一页
                </button>
                
                ${start > 1 ? '<span class="page-ellipsis">...</span>' : ''}
                
                ${Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => `
                    <button class="page-btn ${p === page ? 'active' : ''}" 
                            onclick="window.adminV3App.billingPage.changePage(${p})">
                        ${p}
                    </button>
                `).join('')}
                
                ${end < totalPages ? '<span class="page-ellipsis">...</span>' : ''}
                
                <button class="page-btn" onclick="window.adminV3App.billingPage.changePage(${page + 1})" 
                        ${page === totalPages ? 'disabled' : ''}>
                    下一页
                </button>
                <button class="page-btn" onclick="window.adminV3App.billingPage.changePage(${totalPages})" 
                        ${page === totalPages ? 'disabled' : ''}>
                    末页
                </button>
                
                <span class="page-info">
                    第 ${page} 页，共 ${totalPages} 页，${total} 条记录
                </span>
            </div>
        `;
    }

    // 工具方法
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }
}

export default BillingComponents;