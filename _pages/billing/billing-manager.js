/**
 * Billing Manager Module
 * 计费管理核心模块 - 符合数据库契约
 */

export class BillingManager {
    constructor(app) {
        this.app = app;
        this.subscriptions = [];
        this.orders = [];
        this.payments = [];
        this.plans = [];
        this.recharges = [];
        this.currentFilter = {
            status: 'all',
            dateRange: 'last_30_days',
            searchQuery: ''
        };
        this.pagination = {
            page: 1,
            pageSize: 10,
            total: 0
        };
    }

    /**
     * 加载订阅计划
     */
    async loadSubscriptionPlans() {
        try {
            console.log('📥 Loading subscription plans...');
            
            // 尝试从API加载
            if (this.app.api && typeof this.app.api.getSubscriptionPlans === 'function') {
                const response = await this.app.api.getSubscriptionPlans();
                if (response.success) {
                    this.plans = response.plans || [];
                    console.log(`✅ Loaded ${this.plans.length} subscription plans`);
                    return this.plans;
                }
            }
            
            // 降级到模拟数据
            console.log('⚠️ API unavailable, using mock data');
            return this.loadMockPlans();
            
        } catch (error) {
            console.error('❌ Failed to load subscription plans:', error);
            this.app.showToast('error', '加载订阅计划失败');
            return this.loadMockPlans();
        }
    }

    /**
     * 加载模拟订阅计划 - 符合SUBSCRIPTION_PLANS表结构
     */
    loadMockPlans() {
        this.plans = [
            {
                plan_id: 1,
                plan_name: '免费版',
                plan_type: 'free',
                monthly_price: 0,
                yearly_price: 0,
                token_quota: 5000,
                elastic_quota: 0,
                features: [
                    '基础AI功能',
                    '每月5000 Tokens',
                    '单用户使用',
                    '社区支持'
                ],
                status: 'active',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            },
            {
                plan_id: 2,
                plan_name: '基础版',
                plan_type: 'basic',
                monthly_price: 99,
                yearly_price: 999,
                token_quota: 50000,
                elastic_quota: 10000,
                features: [
                    '所有免费版功能',
                    '每月50000 Tokens',
                    '弹性配额10000 Tokens',
                    '优先技术支持',
                    'API访问',
                    '使用分析报告'
                ],
                status: 'active',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            },
            {
                plan_id: 3,
                plan_name: '专业版',
                plan_type: 'pro',
                monthly_price: 299,
                yearly_price: 2999,
                token_quota: 200000,
                elastic_quota: 50000,
                features: [
                    '所有基础版功能',
                    '每月200000 Tokens',
                    '弹性配额50000 Tokens',
                    '团队协作（5人）',
                    '自定义AI模型',
                    '高级分析功能',
                    '专属客户经理'
                ],
                status: 'active',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            },
            {
                plan_id: 4,
                plan_name: '企业版',
                plan_type: 'enterprise',
                monthly_price: 999,
                yearly_price: 9999,
                token_quota: 1000000,
                elastic_quota: 200000,
                features: [
                    '所有专业版功能',
                    '每月1000000 Tokens',
                    '弹性配额200000 Tokens',
                    '无限用户',
                    '私有化部署选项',
                    'SLA保障',
                    '定制开发支持',
                    '7x24专属支持'
                ],
                status: 'active',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            }
        ];
        
        return this.plans;
    }

    /**
     * 加载订单数据
     */
    async loadOrders() {
        try {
            console.log('📥 Loading orders...');
            
            // 尝试从API加载
            if (this.app.api && typeof this.app.api.getOrders === 'function') {
                const response = await this.app.api.getOrders({
                    page: this.pagination.page,
                    pageSize: this.pagination.pageSize,
                    ...this.currentFilter
                });
                
                if (response.success) {
                    this.orders = response.orders || [];
                    this.pagination.total = response.total || this.orders.length;
                    console.log(`✅ Loaded ${this.orders.length} orders`);
                    return this.orders;
                }
            }
            
            // 降级到模拟数据
            console.log('⚠️ API unavailable, using mock data');
            return this.loadMockOrders();
            
        } catch (error) {
            console.error('❌ Failed to load orders:', error);
            this.app.showToast('error', '加载订单数据失败');
            return this.loadMockOrders();
        }
    }

    /**
     * 加载模拟订单数据 - 符合ORDERS表结构
     */
    loadMockOrders() {
        this.orders = [
            {
                order_id: 1,
                user_id: 2,
                plan_id: 2,
                order_number: 'ORD-20250801-001',
                amount: 99,
                currency: 'CNY',
                order_type: 'upgrade',
                status: 'paid',
                created_at: '2025-08-01T10:30:00Z',
                paid_at: '2025-08-01T10:32:00Z',
                metadata: {
                    user_name: 'davidwang812',
                    plan_name: '基础版',
                    billing_cycle: 'monthly'
                }
            },
            {
                order_id: 2,
                user_id: 1,
                plan_id: 3,
                order_number: 'ORD-20250715-002',
                amount: 2999,
                currency: 'CNY',
                order_type: 'renewal',
                status: 'paid',
                created_at: '2025-07-15T14:20:00Z',
                paid_at: '2025-07-15T14:25:00Z',
                metadata: {
                    user_name: 'admin',
                    plan_name: '专业版',
                    billing_cycle: 'yearly'
                }
            },
            {
                order_id: 3,
                user_id: 3,
                plan_id: 1,
                order_number: 'ORD-20250805-003',
                amount: 0,
                currency: 'CNY',
                order_type: 'upgrade',
                status: 'pending',
                created_at: '2025-08-05T08:00:00Z',
                paid_at: null,
                metadata: {
                    user_name: 'testuser',
                    plan_name: '免费版',
                    billing_cycle: 'monthly'
                }
            },
            {
                order_id: 4,
                user_id: 2,
                plan_id: 2,
                order_number: 'ORD-20250701-004',
                amount: 99,
                currency: 'CNY',
                order_type: 'addon',
                status: 'failed',
                created_at: '2025-07-01T16:45:00Z',
                paid_at: null,
                metadata: {
                    user_name: 'davidwang812',
                    addon_type: 'extra_tokens',
                    addon_amount: 10000
                }
            }
        ];
        
        this.pagination.total = this.orders.length;
        return this.orders;
    }

    /**
     * 加载支付记录
     */
    async loadPayments() {
        try {
            console.log('📥 Loading payment records...');
            
            // 尝试从API加载
            if (this.app.api && typeof this.app.api.getPayments === 'function') {
                const response = await this.app.api.getPayments({
                    page: this.pagination.page,
                    pageSize: this.pagination.pageSize,
                    ...this.currentFilter
                });
                
                if (response.success) {
                    this.payments = response.payments || [];
                    console.log(`✅ Loaded ${this.payments.length} payment records`);
                    return this.payments;
                }
            }
            
            // 降级到模拟数据
            return this.loadMockPayments();
            
        } catch (error) {
            console.error('❌ Failed to load payments:', error);
            return this.loadMockPayments();
        }
    }

    /**
     * 加载模拟支付记录 - 符合PAYMENTS表结构
     */
    loadMockPayments() {
        this.payments = [
            {
                payment_id: 1,
                order_id: 1,
                payment_method: 'alipay',
                transaction_id: 'ALI20250801103200',
                amount: 99,
                currency: 'CNY',
                status: 'success',
                gateway_response: '{"code":"SUCCESS","msg":"支付成功"}',
                created_at: '2025-08-01T10:31:00Z',
                processed_at: '2025-08-01T10:32:00Z'
            },
            {
                payment_id: 2,
                order_id: 2,
                payment_method: 'wechat',
                transaction_id: 'WX20250715142500',
                amount: 2999,
                currency: 'CNY',
                status: 'success',
                gateway_response: '{"code":"SUCCESS","msg":"支付成功"}',
                created_at: '2025-07-15T14:24:00Z',
                processed_at: '2025-07-15T14:25:00Z'
            },
            {
                payment_id: 3,
                order_id: 4,
                payment_method: 'card',
                transaction_id: 'CARD20250701164500',
                amount: 99,
                currency: 'CNY',
                status: 'failed',
                gateway_response: '{"code":"INSUFFICIENT_BALANCE","msg":"余额不足"}',
                created_at: '2025-07-01T16:45:00Z',
                processed_at: '2025-07-01T16:45:30Z'
            }
        ];
        
        return this.payments;
    }

    /**
     * 加载充值记录
     */
    async loadRecharges() {
        try {
            console.log('📥 Loading recharge records...');
            
            // 尝试从API加载
            if (this.app.api && typeof this.app.api.getRecharges === 'function') {
                const response = await this.app.api.getRecharges({
                    page: this.pagination.page,
                    pageSize: this.pagination.pageSize,
                    ...this.currentFilter
                });
                
                if (response.success) {
                    this.recharges = response.recharges || [];
                    console.log(`✅ Loaded ${this.recharges.length} recharge records`);
                    return this.recharges;
                }
            }
            
            // 降级到模拟数据
            return this.loadMockRecharges();
            
        } catch (error) {
            console.error('❌ Failed to load recharges:', error);
            return this.loadMockRecharges();
        }
    }

    /**
     * 加载模拟充值记录
     */
    loadMockRecharges() {
        this.recharges = [
            {
                recharge_id: 1,
                user_id: 2,
                amount: 500,
                tokens: 50000,
                payment_method: 'alipay',
                status: 'completed',
                created_at: '2025-08-03T15:00:00Z',
                completed_at: '2025-08-03T15:01:00Z',
                metadata: {
                    user_name: 'davidwang812',
                    promotion: '首充优惠',
                    bonus_tokens: 5000
                }
            },
            {
                recharge_id: 2,
                user_id: 1,
                amount: 1000,
                tokens: 100000,
                payment_method: 'wechat',
                status: 'completed',
                created_at: '2025-07-20T11:30:00Z',
                completed_at: '2025-07-20T11:31:00Z',
                metadata: {
                    user_name: 'admin',
                    promotion: null,
                    bonus_tokens: 0
                }
            },
            {
                recharge_id: 3,
                user_id: 3,
                amount: 100,
                tokens: 10000,
                payment_method: 'card',
                status: 'pending',
                created_at: '2025-08-05T09:00:00Z',
                completed_at: null,
                metadata: {
                    user_name: 'testuser',
                    promotion: null,
                    bonus_tokens: 0
                }
            }
        ];
        
        return this.recharges;
    }

    /**
     * 获取收入统计
     */
    async getRevenueStats(dateRange = 'last_30_days') {
        try {
            if (this.app.api && typeof this.app.api.getRevenueStats === 'function') {
                const response = await this.app.api.getRevenueStats({ dateRange });
                if (response.success) {
                    return response.stats;
                }
            }
            
            // 模拟统计数据
            return {
                totalRevenue: 12580,
                totalOrders: 156,
                paidOrders: 142,
                averageOrderValue: 88.5,
                revenueGrowth: 15.8,
                orderGrowth: 12.3,
                topPlans: [
                    { plan_name: '基础版', count: 68, revenue: 6732 },
                    { plan_name: '专业版', count: 42, revenue: 4158 },
                    { plan_name: '企业版', count: 12, revenue: 1690 }
                ],
                revenueByDay: this.generateMockDailyRevenue(30),
                paymentMethods: {
                    alipay: { count: 78, amount: 6890 },
                    wechat: { count: 56, amount: 4820 },
                    card: { count: 22, amount: 870 }
                }
            };
            
        } catch (error) {
            console.error('Failed to get revenue stats:', error);
            return null;
        }
    }

    /**
     * 生成模拟每日收入数据
     */
    generateMockDailyRevenue(days) {
        const data = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            data.push({
                date: date.toISOString().split('T')[0],
                revenue: Math.floor(Math.random() * 1000) + 200,
                orders: Math.floor(Math.random() * 10) + 2
            });
        }
        
        return data;
    }

    /**
     * 创建新订单
     */
    async createOrder(orderData) {
        try {
            console.log('📝 Creating new order:', orderData);
            
            // 验证必填字段
            if (!orderData.user_id || !orderData.plan_id) {
                throw new Error('用户ID和计划ID为必填项');
            }
            
            // 尝试通过API创建
            if (this.app.api && typeof this.app.api.createOrder === 'function') {
                const response = await this.app.api.createOrder(orderData);
                if (response.success) {
                    this.app.showToast('success', '订单创建成功');
                    await this.loadOrders();
                    return response.order;
                }
                throw new Error(response.message || '创建失败');
            }
            
            // 模拟创建
            const newOrder = {
                order_id: Math.max(...this.orders.map(o => o.order_id)) + 1,
                order_number: `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(this.orders.length + 1).padStart(3, '0')}`,
                ...orderData,
                status: 'pending',
                created_at: new Date().toISOString(),
                paid_at: null
            };
            
            this.orders.unshift(newOrder);
            this.pagination.total++;
            this.app.showToast('success', '订单创建成功（模拟）');
            return newOrder;
            
        } catch (error) {
            console.error('Failed to create order:', error);
            this.app.showToast('error', error.message || '创建订单失败');
            throw error;
        }
    }

    /**
     * 更新订单状态
     */
    async updateOrderStatus(orderId, status) {
        try {
            console.log('📝 Updating order status:', orderId, status);
            
            const validStatuses = ['pending', 'paid', 'failed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('无效的订单状态');
            }
            
            // 尝试通过API更新
            if (this.app.api && typeof this.app.api.updateOrderStatus === 'function') {
                const response = await this.app.api.updateOrderStatus(orderId, status);
                if (response.success) {
                    this.app.showToast('success', '订单状态已更新');
                    await this.loadOrders();
                    return response.order;
                }
                throw new Error(response.message || '更新失败');
            }
            
            // 模拟更新
            const orderIndex = this.orders.findIndex(o => o.order_id === parseInt(orderId));
            if (orderIndex === -1) {
                throw new Error('订单不存在');
            }
            
            this.orders[orderIndex].status = status;
            if (status === 'paid') {
                this.orders[orderIndex].paid_at = new Date().toISOString();
            }
            
            this.app.showToast('success', '订单状态已更新（模拟）');
            return this.orders[orderIndex];
            
        } catch (error) {
            console.error('Failed to update order status:', error);
            this.app.showToast('error', error.message || '更新订单状态失败');
            throw error;
        }
    }

    /**
     * 退款处理
     */
    async processRefund(orderId, reason) {
        try {
            console.log('💰 Processing refund for order:', orderId);
            
            if (!reason) {
                throw new Error('请填写退款原因');
            }
            
            // 尝试通过API处理
            if (this.app.api && typeof this.app.api.processRefund === 'function') {
                const response = await this.app.api.processRefund(orderId, { reason });
                if (response.success) {
                    this.app.showToast('success', '退款申请已提交');
                    await this.loadOrders();
                    return response.refund;
                }
                throw new Error(response.message || '退款失败');
            }
            
            // 模拟退款
            const order = this.orders.find(o => o.order_id === parseInt(orderId));
            if (!order) {
                throw new Error('订单不存在');
            }
            
            if (order.status !== 'paid') {
                throw new Error('只有已支付的订单才能退款');
            }
            
            // 更新订单状态
            order.status = 'refunded';
            order.metadata.refund_reason = reason;
            order.metadata.refund_at = new Date().toISOString();
            
            this.app.showToast('success', '退款申请已提交（模拟）');
            return order;
            
        } catch (error) {
            console.error('Failed to process refund:', error);
            this.app.showToast('error', error.message || '退款处理失败');
            throw error;
        }
    }

    /**
     * 更新订阅计划
     */
    async updateSubscriptionPlan(planId, updates) {
        try {
            console.log('📝 Updating subscription plan:', planId, updates);
            
            // 尝试通过API更新
            if (this.app.api && typeof this.app.api.updateSubscriptionPlan === 'function') {
                const response = await this.app.api.updateSubscriptionPlan(planId, updates);
                if (response.success) {
                    this.app.showToast('success', '订阅计划已更新');
                    await this.loadSubscriptionPlans();
                    return response.plan;
                }
                throw new Error(response.message || '更新失败');
            }
            
            // 模拟更新
            const planIndex = this.plans.findIndex(p => p.plan_id === parseInt(planId));
            if (planIndex === -1) {
                throw new Error('订阅计划不存在');
            }
            
            this.plans[planIndex] = {
                ...this.plans[planIndex],
                ...updates,
                updated_at: new Date().toISOString()
            };
            
            this.app.showToast('success', '订阅计划已更新（模拟）');
            return this.plans[planIndex];
            
        } catch (error) {
            console.error('Failed to update subscription plan:', error);
            this.app.showToast('error', error.message || '更新订阅计划失败');
            throw error;
        }
    }

    /**
     * 导出账单数据
     */
    async exportBillingData(format = 'csv', dateRange = 'last_30_days') {
        try {
            console.log('📤 Exporting billing data:', format, dateRange);
            
            if (this.app.api && typeof this.app.api.exportBillingData === 'function') {
                const response = await this.app.api.exportBillingData({ format, dateRange });
                if (response.success && response.downloadUrl) {
                    window.open(response.downloadUrl, '_blank');
                    this.app.showToast('success', '导出成功');
                    return;
                }
            }
            
            // 模拟导出
            const data = this.orders.map(order => ({
                订单号: order.order_number,
                用户: order.metadata.user_name,
                计划: order.metadata.plan_name,
                金额: order.amount,
                状态: this.getOrderStatusDisplay(order.status),
                创建时间: new Date(order.created_at).toLocaleString('zh-CN'),
                支付时间: order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '-'
            }));
            
            if (format === 'csv') {
                this.downloadCSV(data, `billing_export_${new Date().toISOString().split('T')[0]}.csv`);
            } else {
                this.downloadJSON(data, `billing_export_${new Date().toISOString().split('T')[0]}.json`);
            }
            
            this.app.showToast('success', '导出成功');
            
        } catch (error) {
            console.error('Failed to export billing data:', error);
            this.app.showToast('error', '导出失败');
        }
    }

    /**
     * 下载CSV文件
     */
    downloadCSV(data, filename) {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    /**
     * 下载JSON文件
     */
    downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    /**
     * 过滤订单
     */
    filterOrders(filters) {
        this.currentFilter = { ...this.currentFilter, ...filters };
        this.pagination.page = 1;
        return this.loadOrders();
    }

    /**
     * 搜索订单
     */
    searchOrders(query) {
        this.currentFilter.searchQuery = query;
        this.pagination.page = 1;
        return this.loadOrders();
    }

    /**
     * 分页
     */
    changePage(page) {
        this.pagination.page = page;
        return this.loadOrders();
    }

    /**
     * 获取订单状态显示文本
     */
    getOrderStatusDisplay(status) {
        const statuses = {
            pending: '待支付',
            paid: '已支付',
            failed: '支付失败',
            cancelled: '已取消',
            refunded: '已退款'
        };
        return statuses[status] || status;
    }

    /**
     * 获取支付方式显示文本
     */
    getPaymentMethodDisplay(method) {
        const methods = {
            alipay: '支付宝',
            wechat: '微信支付',
            card: '银行卡'
        };
        return methods[method] || method;
    }

    /**
     * 获取订单类型显示文本
     */
    getOrderTypeDisplay(type) {
        const types = {
            upgrade: '升级订阅',
            renewal: '续费订阅',
            addon: '购买增值'
        };
        return types[type] || type;
    }

    /**
     * 计算价格折扣
     */
    calculateDiscount(monthlyPrice, yearlyPrice) {
        if (!monthlyPrice || !yearlyPrice) return 0;
        const yearlyMonthly = yearlyPrice / 12;
        const discount = ((monthlyPrice - yearlyMonthly) / monthlyPrice * 100).toFixed(0);
        return discount > 0 ? discount : 0;
    }
}

export default BillingManager;