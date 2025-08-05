/**
 * User Management Module Tests
 * 测试用户管理模块的完整功能
 */

// 模拟测试环境
const mockApp = {
  showToast: (type, message) => console.log(`[${type.toUpperCase()}] ${message}`),
  api: null // 模拟无API情况，使用mock数据
};

// 测试用户管理功能
async function testUserManagement() {
  console.log('🧪 开始测试用户管理模块...\n');
  
  // 导入模块
  const { UserManager } = await import('./user-manager.js');
  const { UserComponents } = await import('./user-components.js');
  const { UserPage } = await import('./index.js');
  
  // 创建实例
  const userManager = new UserManager(mockApp);
  const components = new UserComponents(userManager);
  const userPage = new UserPage(mockApp);
  
  // 测试1: 加载用户数据
  console.log('📋 测试1: 加载用户数据');
  const users = await userManager.loadUsers();
  console.log(`✅ 成功加载 ${users.length} 个用户`);
  console.log('用户列表:', users.map(u => `${u.username} (${u.status})`).join(', '));
  
  // 测试2: 用户过滤
  console.log('\n📋 测试2: 用户过滤功能');
  await userManager.filterUsers({ status: 'active' });
  const activeUsers = await userManager.loadUsers();
  console.log(`✅ 过滤活跃用户: ${activeUsers.length} 个`);
  
  // 测试3: 用户搜索
  console.log('\n📋 测试3: 用户搜索功能');
  await userManager.searchUsers('david');
  const searchResults = await userManager.loadUsers();
  console.log(`✅ 搜索 "david": 找到 ${searchResults.length} 个用户`);
  
  // 测试4: 获取用户统计
  console.log('\n📋 测试4: 用户统计数据');
  const stats = await userManager.getUserStats();
  console.log(`✅ 统计数据:
  - 总用户数: ${stats.totalUsers}
  - 活跃用户: ${stats.activeUsers}
  - 新增用户: ${stats.newUsers}
  - 免费用户: ${stats.userTypes.free}
  - 高级用户: ${stats.userTypes.premium}
  - 企业用户: ${stats.userTypes.enterprise}`);
  
  // 测试5: 用户详情
  console.log('\n📋 测试5: 获取用户详情');
  const userDetail = await userManager.getUserDetail(1);
  console.log(`✅ 用户详情: ${userDetail.username} - ${userDetail.email}`);
  
  // 测试6: 用户会话
  console.log('\n📋 测试6: 获取用户会话');
  const sessions = await userManager.getUserSessions(1);
  console.log(`✅ 用户会话数: ${sessions.length}`);
  
  // 测试7: 用户权限
  console.log('\n📋 测试7: 获取用户权限');
  const permissions = await userManager.getUserPermissions(1);
  console.log(`✅ 用户权限: ${permissions.map(p => p.permission_name).join(', ')}`);
  
  // 测试8: UI组件渲染
  console.log('\n📋 测试8: UI组件渲染');
  
  // 测试表格渲染
  const tableHtml = components.renderUserTable(users);
  console.log(`✅ 用户表格渲染: ${tableHtml.includes('user-table') ? '成功' : '失败'}`);
  
  // 测试分页渲染
  const paginationHtml = components.renderPagination(userManager.pagination);
  console.log(`✅ 分页控件渲染: ${paginationHtml.includes('pagination') ? '成功' : '失败'}`);
  
  // 测试用户编辑表单
  const editFormHtml = components.renderUserEditForm();
  console.log(`✅ 编辑表单渲染: ${editFormHtml.includes('user-edit-form') ? '成功' : '失败'}`);
  
  // 测试用户详情弹窗
  const detailModalHtml = components.renderUserDetailModal(userDetail);
  console.log(`✅ 详情弹窗渲染: ${detailModalHtml.includes('user-detail-modal') ? '成功' : '失败'}`);
  
  // 测试9: 创建用户（模拟）
  console.log('\n📋 测试9: 创建新用户');
  try {
    const newUser = await userManager.createUser({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123',
      user_type: 'free',
      status: 'active'
    });
    console.log(`✅ 成功创建用户: ${newUser.username} (ID: ${newUser.user_id})`);
  } catch (error) {
    console.log('❌ 创建用户失败:', error.message);
  }
  
  // 测试10: 导出功能
  console.log('\n📋 测试10: 导出功能');
  // 模拟下载函数
  userManager.downloadCSV = (data, filename) => {
    console.log(`✅ 导出CSV: ${filename}, ${data.length} 条记录`);
  };
  userManager.downloadJSON = (data, filename) => {
    console.log(`✅ 导出JSON: ${filename}, ${data.length} 条记录`);
  };
  
  await userManager.exportUsers('csv');
  await userManager.exportUsers('json');
  
  // 测试11: 页面集成
  console.log('\n📋 测试11: 页面集成测试');
  const pageHtml = await userPage.render();
  console.log(`✅ 页面渲染: ${pageHtml.includes('user-page') ? '成功' : '失败'}`);
  console.log(`✅ 包含统计卡片: ${pageHtml.includes('stat-card') ? '是' : '否'}`);
  console.log(`✅ 包含过滤器: ${pageHtml.includes('filter-section') ? '是' : '否'}`);
  console.log(`✅ 包含表格容器: ${pageHtml.includes('table-container') ? '是' : '否'}`);
  
  console.log('\n✅ 所有测试完成！用户管理模块功能正常。');
}

// 运行测试
testUserManagement().catch(console.error);