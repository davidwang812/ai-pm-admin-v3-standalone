#!/usr/bin/env node

/**
 * V3认证系统测试脚本
 */

const https = require('https');

// 测试配置
const TEST_URL = 'https://ai-pm-admin-v3-prod.vercel.app';
const TEST_CREDENTIALS = [
  { username: 'davidwang812', password: 'Admin@4444' },
  { username: 'admin', password: 'admin123' },
  { username: 'test', password: 'test123' }
];

// 测试登录
async function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    
    const options = {
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: result,
            username,
            password: password.substring(0, 3) + '***'
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            error: error.message,
            username,
            password: password.substring(0, 3) + '***'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// 测试Token验证
async function testVerify(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/api/auth/verify',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: result
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            error: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// 运行测试
async function runTests() {
  console.log('🧪 V3认证系统测试开始\n');
  console.log(`📍 测试URL: ${TEST_URL}`);
  console.log('━'.repeat(50));
  
  // 测试登录端点
  console.log('\n1️⃣ 测试登录端点 /api/auth/admin/login\n');
  
  for (const cred of TEST_CREDENTIALS) {
    try {
      console.log(`   测试凭据: ${cred.username} / ${cred.password.substring(0, 3)}***`);
      const result = await testLogin(cred.username, cred.password);
      
      if (result.status === 200 && result.data.success) {
        console.log(`   ✅ 登录成功!`);
        console.log(`   📦 Token: ${result.data.data.token.substring(0, 20)}...`);
        console.log(`   👤 用户: ${JSON.stringify(result.data.data.user)}`);
        
        // 测试Token验证
        console.log(`\n   🔍 测试Token验证...`);
        const verifyResult = await testVerify(result.data.data.token);
        if (verifyResult.status === 200 && verifyResult.data.success) {
          console.log(`   ✅ Token验证成功!`);
        } else {
          console.log(`   ❌ Token验证失败: ${JSON.stringify(verifyResult.data)}`);
        }
      } else {
        console.log(`   ❌ 登录失败: ${result.data.message}`);
      }
    } catch (error) {
      console.log(`   ❌ 请求错误: ${error.message}`);
    }
    console.log('   ' + '─'.repeat(40));
  }
  
  // 测试OPTIONS请求
  console.log('\n2️⃣ 测试CORS预检请求\n');
  
  try {
    const options = {
      hostname: 'ai-pm-admin-v3-prod.vercel.app',
      path: '/api/auth/admin/login',
      method: 'OPTIONS'
    };
    
    const req = https.request(options, (res) => {
      console.log(`   状态码: ${res.statusCode}`);
      console.log(`   CORS Headers:`);
      console.log(`   - Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
      console.log(`   - Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods']}`);
      console.log(`   - Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers']}`);
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ OPTIONS请求错误: ${error.message}`);
    });
    
    req.end();
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`);
  }
  
  console.log('\n' + '━'.repeat(50));
  console.log('✅ 测试完成!\n');
}

// 执行测试
runTests().catch(console.error);