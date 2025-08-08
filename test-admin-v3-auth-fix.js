/**
 * Admin V3 认证修复测试
 * 测试修复后的认证流程和界面渲染
 */

const { chromium } = require('playwright');
const fs = require('fs');

// 测试配置
const TEST_CONFIG = {
  url: 'https://ai-pm-admin-v3-prod.vercel.app/login.html',
  username: 'admin',
  password: 'Admin@123456',
  timeout: 30000,
  viewport: { width: 1280, height: 720 }
};

// 日志记录器
class TestLogger {
  constructor() {
    this.logs = [];
    this.startTime = new Date();
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    this.logs.push(logEntry);
  }
  
  error(message) {
    this.log(message, 'ERROR');
  }
  
  warn(message) {
    this.log(message, 'WARN');
  }
  
  success(message) {
    this.log(message, 'SUCCESS');
  }
  
  saveReport() {
    const duration = new Date() - this.startTime;
    const report = [
      '# Admin V3 认证修复测试报告',
      `测试时间: ${this.startTime.toISOString()}`,
      `测试耗时: ${duration}ms`,
      '',
      '## 测试日志',
      ...this.logs,
      ''
    ].join('\n');
    
    fs.writeFileSync('test-auth-fix-report.md', report);
    this.log('测试报告已保存: test-auth-fix-report.md');
  }
}

async function testAdminV3AuthFix() {
  const logger = new TestLogger();
  let browser, context, page;
  
  try {
    logger.log('开始Admin V3认证修复测试');
    
    // 1. 启动浏览器
    browser = await chromium.launch({ 
      headless: false, // 显示浏览器窗口
      slowMo: 500 // 慢速执行便于观察
    });
    
    context = await browser.newContext({
      viewport: TEST_CONFIG.viewport,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    page = await context.newPage();
    
    // 监听控制台日志
    const consoleLogs = [];
    page.on('console', msg => {
      const logText = `[浏览器控制台] ${msg.type()}: ${msg.text()}`;
      logger.log(logText);
      consoleLogs.push(logText);
    });
    
    // 监听网络请求错误
    page.on('requestfailed', request => {
      logger.error(`网络请求失败: ${request.url()} - ${request.failure().errorText}`);
    });
    
    logger.log(`访问登录页面: ${TEST_CONFIG.url}`);
    
    // 2. 访问登录页面
    await page.goto(TEST_CONFIG.url, { 
      waitUntil: 'networkidle',
      timeout: TEST_CONFIG.timeout 
    });
    
    // 截图：登录页面
    await page.screenshot({ path: 'test-step1-login-page.png', fullPage: true });
    logger.log('已截图：登录页面 (test-step1-login-page.png)');
    
    // 3. 检查登录页面元素
    logger.log('检查登录页面元素...');
    
    const usernameInput = await page.locator('#username');
    const passwordInput = await page.locator('#password'); 
    const loginBtn = await page.locator('#loginBtn');
    
    const elementsVisible = {
      username: await usernameInput.isVisible(),
      password: await passwordInput.isVisible(),
      loginBtn: await loginBtn.isVisible()
    };
    
    logger.log(`登录表单元素可见性: ${JSON.stringify(elementsVisible)}`);
    
    if (!elementsVisible.username || !elementsVisible.password || !elementsVisible.loginBtn) {
      throw new Error('登录表单元素不完整');
    }
    
    // 4. 执行登录
    logger.log('开始执行登录流程...');
    
    await usernameInput.fill(TEST_CONFIG.username);
    logger.log(`已输入用户名: ${TEST_CONFIG.username}`);
    
    await passwordInput.fill(TEST_CONFIG.password);
    logger.log('已输入密码');
    
    // 等待一下让页面稳定
    await page.waitForTimeout(1000);
    
    // 点击登录按钮
    await loginBtn.click();
    logger.log('已点击登录按钮');
    
    // 5. 等待登录响应和页面跳转
    logger.log('等待登录响应...');
    
    try {
      // 等待页面跳转或界面更新
      await page.waitForFunction(
        () => {
          // 检查是否跳转到index.html或认证状态改变
          return window.location.pathname.includes('index.html') ||
                 document.querySelector('.admin-container') !== null ||
                 document.querySelector('.sidebar') !== null;
        },
        { timeout: 15000 }
      );
      
      logger.success('登录响应检测成功');
      
    } catch (error) {
      logger.warn('登录响应超时，继续检测当前状态');
    }
    
    // 等待页面稳定
    await page.waitForTimeout(3000);
    
    // 截图：登录后状态
    await page.screenshot({ path: 'test-step2-after-login.png', fullPage: true });
    logger.log('已截图：登录后状态 (test-step2-after-login.png)');
    
    // 6. 检查当前页面URL和状态
    const currentUrl = page.url();
    logger.log(`当前页面URL: ${currentUrl}`);
    
    // 7. 检查关键元素是否存在
    logger.log('检查登录后的界面元素...');
    
    const uiElements = {
      adminContainer: await page.locator('.admin-container').count(),
      sidebar: await page.locator('.sidebar').count(),
      contentArea: await page.locator('.content').count(),
      loginButton: await page.locator('button:has-text("前往登录")').count(),
      logoutButton: await page.locator('button:has-text("退出登录")').count(),
      userInfo: await page.locator('.user-info').count()
    };
    
    logger.log(`界面元素统计: ${JSON.stringify(uiElements, null, 2)}`);
    
    // 8. 验证登录状态
    let authStatus = 'UNKNOWN';
    let authDetails = {};
    
    try {
      // 检查localStorage中的认证信息
      const authData = await page.evaluate(() => {
        const token = localStorage.getItem('admin_token');
        const userInfo = localStorage.getItem('admin_user');
        return {
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          hasUserInfo: !!userInfo,
          userInfo: userInfo ? JSON.parse(userInfo) : null
        };
      });
      
      authDetails = authData;
      logger.log(`认证数据检查: ${JSON.stringify(authData, null, 2)}`);
      
      // 检查认证状态
      const authCheckResult = await page.evaluate(() => {
        if (window.AdminAuthV3) {
          return {
            isAuthenticated: window.AdminAuthV3.isAuthenticated(),
            currentUser: window.AdminAuthV3.getCurrentUser()
          };
        }
        return null;
      });
      
      if (authCheckResult) {
        logger.log(`认证检查结果: ${JSON.stringify(authCheckResult, null, 2)}`);
        authStatus = authCheckResult.isAuthenticated ? 'AUTHENTICATED' : 'NOT_AUTHENTICATED';
      }
      
    } catch (error) {
      logger.error(`认证状态检查失败: ${error.message}`);
      authStatus = 'ERROR';
    }
    
    // 9. 生成测试结果
    const testResults = {
      timestamp: new Date().toISOString(),
      url: currentUrl,
      authStatus: authStatus,
      authDetails: authDetails,
      uiElements: uiElements,
      consoleLogs: consoleLogs.slice(-10), // 最后10条日志
      issues: []
    };
    
    // 10. 分析测试结果
    logger.log('分析测试结果...');
    
    // 检查是否成功跳转到index.html
    if (!currentUrl.includes('index.html')) {
      testResults.issues.push('未能跳转到index.html');
      logger.warn('问题: 未能跳转到index.html');
    }
    
    // 检查是否还显示"前往登录"按钮
    if (uiElements.loginButton > 0) {
      testResults.issues.push('登录后仍显示"前往登录"按钮');
      logger.warn('问题: 登录后仍显示"前往登录"按钮');
    }
    
    // 检查是否有管理界面元素
    if (uiElements.adminContainer === 0 && uiElements.sidebar === 0) {
      testResults.issues.push('未找到管理界面元素');
      logger.warn('问题: 未找到管理界面元素');
    }
    
    // 检查认证状态
    if (authStatus !== 'AUTHENTICATED') {
      testResults.issues.push(`认证状态异常: ${authStatus}`);
      logger.warn(`问题: 认证状态异常: ${authStatus}`);
    }
    
    // 11. 输出测试结论
    if (testResults.issues.length === 0) {
      logger.success('✅ Admin V3认证修复测试通过！所有检查项目正常');
      testResults.conclusion = 'PASS';
    } else {
      logger.error(`❌ Admin V3认证修复测试发现问题 (${testResults.issues.length}个):`);
      testResults.issues.forEach((issue, index) => {
        logger.error(`  ${index + 1}. ${issue}`);
      });
      testResults.conclusion = 'FAIL';
    }
    
    // 12. 保存详细测试结果
    fs.writeFileSync('test-auth-fix-results.json', JSON.stringify(testResults, null, 2));
    logger.log('详细测试结果已保存: test-auth-fix-results.json');
    
    return testResults;
    
  } catch (error) {
    logger.error(`测试执行失败: ${error.message}`);
    logger.error(error.stack);
    
    if (page) {
      await page.screenshot({ path: 'test-error-screenshot.png', fullPage: true });
      logger.log('错误截图已保存: test-error-screenshot.png');
    }
    
    return {
      conclusion: 'ERROR',
      error: error.message,
      stack: error.stack
    };
    
  } finally {
    // 清理资源
    if (browser) {
      await browser.close();
    }
    
    logger.saveReport();
  }
}

// 执行测试
if (require.main === module) {
  testAdminV3AuthFix()
    .then(results => {
      console.log('\n=== 测试完成 ===');
      console.log(`结论: ${results.conclusion}`);
      
      if (results.issues && results.issues.length > 0) {
        console.log('\n发现的问题:');
        results.issues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue}`);
        });
      }
      
      process.exit(results.conclusion === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('测试运行失败:', error);
      process.exit(1);
    });
}

module.exports = { testAdminV3AuthFix };