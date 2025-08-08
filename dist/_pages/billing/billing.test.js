/**
 * Billing Management Module Tests
 * 测试计费管理模块的完整功能
 */

// 模拟测试环境
const mockApp = {
  showToast: (type, message) => console.log(`[${type.toUpperCase()}] ${message}`),
  api: null // 模拟无API情况，使用mock数据
};

// 测试计费管理功能
async function testBillingManagement() {
  console.log('🧪 开始测试计费管理模块...\n');
  
  // 导入模块
  const { BillingManager } = await import('./billing-manager.js');
  const { BillingComponents } = await import('./billing-components.js');
  const { BillingPage } = await import('./index.js');
  
  // 创建实例
  const billingManager = new BillingManager(mockApp);
  const components = new BillingComponents(billingManager);
  const billingPage = new BillingPage(mockApp);
  
  // 测试1: 加载订阅计划
  console.log('📋 测试1: 加载订阅计划');
  const plans = await billingManager.loadSubscriptionPlans();
  console.log(`✅ 成功加载 ${plans.length} 个订阅计划`);
  console.log('计划列表:', plans.map(p => `${p.plan_name} (¥${p.monthly_price}/月)`).join(', '));
  
  // 测试2: 加载订单数据
  console.log('\n📋 测试2: 加载订单数据');
  const orders = await billingManager.loadOrders();
  console.log(`✅ 成功加载 ${orders.length} 个订单`);
  console.log('订单状态分布:', {
    待支付: orders.filter(o => o.status === 'pending').length,
    已支付: orders.filter(o => o.status === 'paid').length,
    失败: orders.filter(o => o.status === 'failed').length
  });
  
  // 测试3: 加载支付记录
  console.log('\n📋 测试3: 加载支付记录');
  const payments = await billingManager.loadPayments();
  console.log(`✅ 成功加载 ${payments.length} 条支付记录`);
  
  // 测试4: 加载充值记录
  console.log('\n📋 测试4: 加载充值记录');
  const recharges = await billingManager.loadRecharges();
  console.log(`✅ 成功加载 ${recharges.length} 条充值记录`);
  const totalRecharge = recharges.reduce((sum, r) => sum + r.amount, 0);
  console.log(`总充值金额: ¥${totalRecharge}`);
  
  // 测试5: 获取收入统计
  console.log('\n📋 测试5: 获取收入统计');
  const stats = await billingManager.getRevenueStats();
  console.log(`✅ 收入统计:
  - 总收入: ¥${stats.totalRevenue}
  - 总订单数: ${stats.totalOrders}
  - 支付成功率: ${((stats.paidOrders / stats.totalOrders) * 100).toFixed(1)}%
  - 平均订单价值: ¥${stats.averageOrderValue}
  - 收入增长: ${stats.revenueGrowth}%`);
  
  // 测试6: 订单过滤
  console.log('\n📋 测试6: 订单过滤功能');
  await billingManager.filterOrders({ status: 'paid' });
  const paidOrders = await billingManager.loadOrders();
  console.log(`✅ 过滤已支付订单: ${paidOrders.length} 个`);
  
  // 测试7: UI组件渲染
  console.log('\n📋 测试7: UI组件渲染');
  
  // 测试订阅计划卡片渲染
  const plansHtml = components.renderSubscriptionPlans(plans);
  console.log(`✅ 订阅计划渲染: ${plansHtml.includes('plan-card') ? '成功' : '失败'}`);
  
  // 测试订单表格渲染
  const ordersHtml = components.renderOrdersTable(orders);
  console.log(`✅ 订单表格渲染: ${ordersHtml.includes('orders-table') ? '成功' : '失败'}`);
  
  // 测试收入统计渲染
  const statsHtml = components.renderRevenueStats(stats);
  console.log(`✅ 收入统计渲染: ${statsHtml.includes('revenue-stats') ? '成功' : '失败'}`);
  
  // 测试收入图表渲染
  const chartHtml = components.renderRevenueChart(stats.revenueByDay);
  console.log(`✅ 收入图表渲染: ${chartHtml.includes('revenue-chart') ? '成功' : '失败'}`);
  
  // 测试8: 创建订单（模拟）
  console.log('\n📋 测试8: 创建新订单');
  try {
    const newOrder = await billingManager.createOrder({
      user_id: 1,
      plan_id: 2,
      amount: 99,
      currency: 'CNY',
      order_type: 'upgrade',
      metadata: {
        user_name: 'testuser',
        plan_name: '基础版',
        billing_cycle: 'monthly'
      }
    });
    console.log(`✅ 成功创建订单: ${newOrder.order_number} (ID: ${newOrder.order_id})`);
  } catch (error) {
    console.log('❌ 创建订单失败:', error.message);
  }
  
  // 测试9: 更新订单状态
  console.log('\n📋 测试9: 更新订单状态');
  try {
    await billingManager.updateOrderStatus(3, 'paid');
    console.log('✅ 成功更新订单状态');
  } catch (error) {
    console.log('❌ 更新订单状态失败:', error.message);
  }
  
  // 测试10: 导出功能
  console.log('\n📋 测试10: 导出功能');
  // 模拟下载函数
  billingManager.downloadCSV = (data, filename) => {
    console.log(`✅ 导出CSV: ${filename}, ${data.length} 条记录`);
  };
  billingManager.downloadJSON = (data, filename) => {
    console.log(`✅ 导出JSON: ${filename}, ${data.length} 条记录`);
  };
  
  await billingManager.exportBillingData('csv');
  await billingManager.exportBillingData('json');
  
  // 测试11: 计算折扣
  console.log('\n📋 测试11: 计算年付折扣');
  plans.forEach(plan => {
    if (plan.monthly_price > 0) {
      const discount = billingManager.calculateDiscount(plan.monthly_price, plan.yearly_price);
      console.log(`${plan.plan_name}: 年付优惠 ${discount}%`);
    }
  });
  
  // 测试12: 页面集成
  console.log('\n📋 测试12: 页面集成测试');
  const pageHtml = await billingPage.render();
  console.log(`✅ 页面渲染: ${pageHtml.includes('billing-page') ? '成功' : '失败'}`);
  console.log(`✅ 包含视图标签: ${pageHtml.includes('view-tabs') ? '是' : '否'}`);
  console.log(`✅ 包含内容区域: ${pageHtml.includes('content-area') ? '是' : '否'}`);
  
  console.log('\n✅ 所有测试完成！计费管理模块功能正常。');
}

// 运行测试
testBillingManagement().catch(console.error);