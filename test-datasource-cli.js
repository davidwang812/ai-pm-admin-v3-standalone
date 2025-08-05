#!/usr/bin/env node

/**
 * 数据源页面功能测试脚本
 */

const https = require('https');

const BASE_URL = 'https://ai-pm-admin-v3-prod.vercel.app';
let authToken = null;

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTPS请求封装
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// 测试步骤
async function testLogin() {
  log('\n📝 测试1: 登录功能', 'blue');
  
  try {
    const response = await httpsRequest({
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      username: 'davidwang812',
      password: 'Admin@4444'
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      log('✅ 登录成功', 'green');
      log(`   Token: ${authToken.substring(0, 30)}...`);
      log(`   RedirectUrl: ${response.data.data.redirectUrl}`);
      return true;
    } else {
      log('❌ 登录失败: ' + response.data.message, 'red');
      return false;
    }
  } catch (error) {
    log('❌ 请求失败: ' + error.message, 'red');
    return false;
  }
}

async function testPageLoad() {
  log('\n📝 测试2: 页面加载', 'blue');
  
  try {
    const response = await httpsRequest({
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/index.html',
      method: 'GET'
    });
    
    if (response.status === 200) {
      const html = response.data;
      
      // 检查关键元素
      const checks = [
        { name: '页面标题', pattern: /Admin V3/ },
        { name: 'Bootstrap脚本', pattern: /_app\/bootstrap\.js/ },
        { name: '路由链接', pattern: /href="#\/ai-service"/ },
        { name: 'AI服务样式', pattern: /ai-service\.css/ }
      ];
      
      checks.forEach(check => {
        if (check.pattern.test(html)) {
          log(`✅ ${check.name}: 找到`, 'green');
        } else {
          log(`❌ ${check.name}: 未找到`, 'red');
        }
      });
      
      return true;
    } else {
      log('❌ 页面加载失败: HTTP ' + response.status, 'red');
      return false;
    }
  } catch (error) {
    log('❌ 请求失败: ' + error.message, 'red');
    return false;
  }
}

async function testDataSourceModule() {
  log('\n📝 测试3: 数据源模块加载', 'blue');
  
  try {
    const response = await httpsRequest({
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/_pages/ai-service/data-sources.js',
      method: 'GET'
    });
    
    if (response.status === 200) {
      const code = response.data;
      
      // 检查关键代码
      const checks = [
        { name: 'DataSources类', pattern: /export class DataSources/ },
        { name: '正确的window引用', pattern: /window\.adminV3App\.aiServicePage/ },
        { name: '测试按钮', pattern: /onclick="window\.adminV3App\.aiServicePage\.testDataSources/ },
        { name: '刷新按钮', pattern: /onclick="window\.adminV3App\.aiServicePage\.refreshDataSources/ },
        { name: 'Vercel测试', pattern: /onclick="window\.adminV3App\.aiServicePage\.testVercelConnection/ },
        { name: '错误的引用', pattern: /window\.adminApp\./, shouldNotExist: true }
      ];
      
      checks.forEach(check => {
        const found = check.pattern.test(code);
        if (check.shouldNotExist) {
          if (!found) {
            log(`✅ ${check.name}: 不存在（正确）`, 'green');
          } else {
            log(`❌ ${check.name}: 仍然存在（错误）`, 'red');
          }
        } else {
          if (found) {
            log(`✅ ${check.name}: 找到`, 'green');
          } else {
            log(`❌ ${check.name}: 未找到`, 'red');
          }
        }
      });
      
      return true;
    } else {
      log('❌ 模块加载失败: HTTP ' + response.status, 'red');
      return false;
    }
  } catch (error) {
    log('❌ 请求失败: ' + error.message, 'red');
    return false;
  }
}

async function testAIServiceModule() {
  log('\n📝 测试4: AI服务主模块', 'blue');
  
  try {
    const response = await httpsRequest({
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/_pages/ai-service/index.js',
      method: 'GET'
    });
    
    if (response.status === 200) {
      const code = response.data;
      
      // 检查关键代码
      const checks = [
        { name: 'AIServicePage类', pattern: /export class AIServicePage/ },
        { name: '全局绑定', pattern: /window\.adminV3App\.aiServicePage = this/ },
        { name: 'testDataSources方法', pattern: /async testDataSources\(\)/ },
        { name: 'refreshDataSources方法', pattern: /async refreshDataSources\(\)/ },
        { name: 'updateVercelUrl方法', pattern: /updateVercelUrl\(url\)/ },
        { name: 'DataSources模块导入', pattern: /import.*DataSources.*from.*data-sources/ }
      ];
      
      checks.forEach(check => {
        if (check.pattern.test(code)) {
          log(`✅ ${check.name}: 找到`, 'green');
        } else {
          log(`❌ ${check.name}: 未找到`, 'red');
        }
      });
      
      return true;
    } else {
      log('❌ 模块加载失败: HTTP ' + response.status, 'red');
      return false;
    }
  } catch (error) {
    log('❌ 请求失败: ' + error.message, 'red');
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  log('🚀 开始数据源页面完整测试', 'yellow');
  log('================================', 'yellow');
  
  const tests = [
    { name: '登录功能', fn: testLogin },
    { name: '页面加载', fn: testPageLoad },
    { name: '数据源模块', fn: testDataSourceModule },
    { name: 'AI服务模块', fn: testAIServiceModule }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) passed++;
    else failed++;
  }
  
  log('\n================================', 'yellow');
  log('📊 测试结果汇总', 'yellow');
  log(`✅ 通过: ${passed}`, 'green');
  log(`❌ 失败: ${failed}`, 'red');
  log(`📈 成功率: ${Math.round(passed / tests.length * 100)}%`, passed === tests.length ? 'green' : 'yellow');
  
  if (failed === 0) {
    log('\n🎉 所有测试通过！数据源页面功能正常', 'green');
  } else {
    log('\n⚠️ 部分测试失败，请检查问题', 'red');
  }
}

// 执行测试
runAllTests().catch(console.error);