/**
 * Admin V3 认证修复简化测试
 * 使用Node.js内置模块进行API测试
 */

const https = require('https');
const fs = require('fs');

class SimpleTestLogger {
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
  
  error(message) { this.log(message, 'ERROR'); }
  warn(message) { this.log(message, 'WARN'); }
  success(message) { this.log(message, 'SUCCESS'); }
}

async function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAdminV3Auth() {
  const logger = new SimpleTestLogger();
  
  try {
    logger.log('开始Admin V3认证API测试');
    
    // 1. 测试登录页面访问
    logger.log('测试1: 访问登录页面');
    const loginPageOptions = {
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/login.html',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    
    const loginPageResponse = await httpRequest(loginPageOptions);
    logger.log(`登录页面响应状态: ${loginPageResponse.statusCode}`);
    
    if (loginPageResponse.statusCode === 200) {
      logger.success('✅ 登录页面访问成功');
      
      // 检查登录页面内容
      const hasLoginForm = loginPageResponse.body.includes('id="username"') && 
                          loginPageResponse.body.includes('id="password"') &&
                          loginPageResponse.body.includes('id="loginBtn"');
      
      if (hasLoginForm) {
        logger.success('✅ 登录表单元素完整');
      } else {
        logger.error('❌ 登录表单元素缺失');
      }
    } else {
      logger.error(`❌ 登录页面访问失败: ${loginPageResponse.statusCode}`);
    }
    
    // 2. 测试登录API
    logger.log('测试2: 登录API调用');
    const loginData = JSON.stringify({
      username: 'admin',
      password: 'Admin@123456'
    });
    
    const loginApiOptions = {
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const loginApiResponse = await httpRequest(loginApiOptions, loginData);
    logger.log(`登录API响应状态: ${loginApiResponse.statusCode}`);
    logger.log(`登录API响应头: ${JSON.stringify(loginApiResponse.headers, null, 2)}`);
    
    let loginResult = null;
    try {
      loginResult = JSON.parse(loginApiResponse.body);
      logger.log(`登录API响应体: ${JSON.stringify(loginResult, null, 2)}`);
    } catch (e) {
      logger.warn('登录API响应不是有效JSON，原始响应:');
      logger.log(loginApiResponse.body.substring(0, 500));
    }
    
    // 3. 测试主页面访问
    logger.log('测试3: 访问主页面');
    const indexPageOptions = {
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/index.html',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const indexPageResponse = await httpRequest(indexPageOptions);
    logger.log(`主页面响应状态: ${indexPageResponse.statusCode}`);
    
    if (indexPageResponse.statusCode === 200) {
      logger.success('✅ 主页面访问成功');
      
      // 检查主页面内容
      const hasAdminInterface = indexPageResponse.body.includes('admin-container') || 
                               indexPageResponse.body.includes('sidebar') ||
                               indexPageResponse.body.includes('content');
      
      const hasLoginButton = indexPageResponse.body.includes('前往登录') ||
                             indexPageResponse.body.includes('login');
      
      logger.log(`主页面包含管理界面元素: ${hasAdminInterface}`);
      logger.log(`主页面包含登录按钮: ${hasLoginButton}`);
      
      if (hasAdminInterface) {
        logger.success('✅ 主页面包含管理界面元素');
      } else {
        logger.warn('⚠️ 主页面未找到管理界面元素');
      }
      
    } else {
      logger.error(`❌ 主页面访问失败: ${indexPageResponse.statusCode}`);
    }
    
    // 4. 测试认证验证API
    logger.log('测试4: 认证验证API');
    if (loginResult && loginResult.token) {
      const verifyOptions = {
        hostname: 'ai-pm-admin-v3-prod.vercel.app',
        path: '/api/auth/verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResult.token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };
      
      const verifyResponse = await httpRequest(verifyOptions, JSON.stringify({}));
      logger.log(`认证验证响应状态: ${verifyResponse.statusCode}`);
      
      if (verifyResponse.statusCode === 200) {
        logger.success('✅ 认证验证成功');
      } else {
        logger.warn(`⚠️ 认证验证失败: ${verifyResponse.statusCode}`);
      }
    } else {
      logger.warn('⚠️ 无有效token，跳过认证验证测试');
    }
    
    // 5. 生成测试报告
    const testReport = {
      timestamp: new Date().toISOString(),
      tests: {
        loginPageAccess: loginPageResponse.statusCode === 200,
        loginApiCall: loginResult && (loginResult.success || loginResult.token),
        indexPageAccess: indexPageResponse.statusCode === 200,
        hasAdminInterface: indexPageResponse.body.includes('admin-container'),
        hasUnwantedLoginButton: indexPageResponse.body.includes('前往登录')
      },
      details: {
        loginApiResponse: loginResult,
        loginPageStatus: loginPageResponse.statusCode,
        indexPageStatus: indexPageResponse.statusCode
      },
      logs: logger.logs
    };
    
    // 计算总体结果
    const passedTests = Object.values(testReport.tests).filter(t => t === true).length;
    const totalTests = Object.keys(testReport.tests).length;
    const failedTests = totalTests - passedTests;
    
    logger.log(`\n=== 测试结果汇总 ===`);
    logger.log(`通过测试: ${passedTests}/${totalTests}`);
    logger.log(`失败测试: ${failedTests}`);
    
    // 输出具体问题
    const issues = [];
    if (!testReport.tests.loginPageAccess) {
      issues.push('登录页面无法访问');
    }
    if (!testReport.tests.loginApiCall) {
      issues.push('登录API调用失败');
    }
    if (!testReport.tests.indexPageAccess) {
      issues.push('主页面无法访问');
    }
    if (!testReport.tests.hasAdminInterface) {
      issues.push('主页面缺少管理界面元素');
    }
    if (testReport.tests.hasUnwantedLoginButton) {
      issues.push('主页面仍显示"前往登录"按钮');
    }
    
    if (issues.length === 0) {
      logger.success('🎉 所有测试通过！Admin V3认证修复成功');
      testReport.conclusion = 'PASS';
    } else {
      logger.error('❌ 发现以下问题:');
      issues.forEach((issue, index) => {
        logger.error(`  ${index + 1}. ${issue}`);
      });
      testReport.conclusion = 'FAIL';
      testReport.issues = issues;
    }
    
    // 保存报告
    fs.writeFileSync('admin-v3-auth-test-report.json', JSON.stringify(testReport, null, 2));
    logger.log('测试报告已保存: admin-v3-auth-test-report.json');
    
    return testReport;
    
  } catch (error) {
    logger.error(`测试执行失败: ${error.message}`);
    return {
      conclusion: 'ERROR',
      error: error.message,
      logs: logger.logs
    };
  }
}

// 执行测试
if (require.main === module) {
  testAdminV3Auth()
    .then(result => {
      console.log(`\n最终结论: ${result.conclusion}`);
      process.exit(result.conclusion === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testAdminV3Auth };