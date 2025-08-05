# 🔧 V3故障排查指南

> **快速定位和解决V3系统问题**  
> **版本**: 1.0.0  
> **最后更新**: 2025-08-05  

## 🚨 常见问题快速索引

| 症状 | 可能原因 | 跳转到 |
|------|----------|--------|
| 登录返回401 | 凭据/环境变量问题 | [认证问题](#1-认证问题) |
| 无痕浏览器无法登录 | CORS/跨域问题 | [浏览器问题](#2-浏览器兼容性问题) |
| Edge Function报错 | 语法/依赖问题 | [部署问题](#3-部署问题) |
| 页面白屏 | 路由/加载问题 | [前端问题](#4-前端问题) |

## 🔍 1. 认证问题

### 问题：登录总是返回401

#### 诊断步骤
```bash
# 1. 测试API是否正常
curl -X POST https://your-domain.vercel.app/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 2. 查看返回的调试信息
# 现在的API会返回expectedUsernames列表
```

#### 解决方案
1. **检查环境变量**
   ```bash
   vercel env ls production
   ```

2. **使用备用凭据**
   - `test` / `test123`
   - `admin` / `admin123`
   - `davidwang812` / `Admin@4444`

3. **添加调试日志**
   ```javascript
   console.log('Environment check:', {
     hasUsername: !!process.env.SUPER_ADMIN_USERNAME,
     actualUsername: ADMIN_CREDENTIALS.username
   });
   ```

### 问题：Token验证失败

#### 可能原因
- JWT密钥不一致
- Token已过期
- 签名算法不匹配

#### 解决方案
```javascript
// 确保使用相同的密钥
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'v3-admin-secret-key-default'
);
```

## 🌐 2. 浏览器兼容性问题

### 问题：无痕/隐私浏览器无法使用

#### 诊断方法
1. 打开浏览器开发者工具
2. 查看Network面板
3. 检查是否有CORS错误

#### 典型错误
```
Access to fetch at 'https://backend.com/api' from origin 'https://frontend.com' 
has been blocked by CORS policy
```

#### 解决方案
1. **使用同域API**
   ```javascript
   // ❌ 错误
   fetch('https://external-api.com/auth')
   
   // ✅ 正确
   fetch('/api/auth/login')
   ```

2. **实现API代理**
   ```javascript
   // api/proxy/auth.js
   export default async function handler(req) {
     // 代理到后端
     const response = await fetch(BACKEND_URL + req.url);
     return new Response(response.body, {
       headers: {
         ...response.headers,
         'Access-Control-Allow-Origin': '*'
       }
     });
   }
   ```

## 🚀 3. 部署问题

### 问题：Vercel部署失败

#### 常见错误类型

1. **Module not found**
   ```
   Error: Cannot find module 'jose'
   ```
   **解决**: 添加package.json
   ```json
   {
     "dependencies": {
       "jose": "^5.2.0"
     }
   }
   ```

2. **Edge Runtime错误**
   ```
   Error: req is not defined
   ```
   **解决**: 使用正确的Edge Runtime API
   ```javascript
   // ❌ 错误
   export default function handler(req, res) {
   
   // ✅ 正确
   export default async function handler(request) {
   ```

3. **环境变量未生效**
   **解决**: 重新部署
   ```bash
   vercel --prod --force
   ```

### 问题：部署成功但功能异常

#### 检查清单
- [ ] 环境变量是否正确设置
- [ ] API路由是否正确配置
- [ ] CORS头是否正确设置
- [ ] 静态文件是否正确服务

## 💻 4. 前端问题

### 问题：页面加载失败

#### 诊断步骤
1. 检查控制台错误
2. 检查网络请求
3. 检查路由配置

#### 常见原因
- 模块导入路径错误
- 异步加载失败
- 路由未注册

#### 解决方案
```javascript
// 确保模块路径正确
import { default: authManager } from './_core/auth-v3.js';

// 处理加载错误
try {
  const module = await import('./module.js');
} catch (error) {
  console.error('Module load failed:', error);
  // 降级处理
}
```

## 🛠️ 5. 调试技巧

### 5.1 Edge Function调试

```javascript
// 添加详细日志
export default async function handler(request) {
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers));
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
  } catch (e) {
    console.log('No JSON body');
  }
  
  // ... 业务逻辑
}
```

### 5.2 查看Vercel日志

```bash
# 查看函数日志
vercel logs your-deployment-url

# 查看构建日志
vercel inspect your-deployment-url --logs
```

### 5.3 本地测试

```bash
# 使用Vercel CLI本地运行
vercel dev

# 测试Edge Function
curl http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

## 📊 6. 性能问题

### 问题：页面加载慢

#### 检查点
1. Bundle大小
2. 网络请求数量
3. 阻塞资源

#### 优化方案
```javascript
// 1. 懒加载模块
const module = await import('./heavy-module.js');

// 2. 预连接
<link rel="preconnect" href="https://api.vercel.com">

// 3. 资源提示
<link rel="prefetch" href="/api/data">
```

## 🔐 7. 安全问题

### 问题：敏感信息泄露

#### 检查清单
- [ ] 生产环境移除console.log
- [ ] 环境变量不在代码中
- [ ] 错误信息不包含敏感数据
- [ ] API响应不包含调试信息

#### 安全配置
```javascript
// 生产环境配置
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  // 移除调试信息
  delete response.debug;
}
```

## 💡 8. 最佳实践

### 8.1 错误处理
```javascript
try {
  // 业务逻辑
} catch (error) {
  console.error('Operation failed:', error);
  
  // 用户友好的错误信息
  return new Response(
    JSON.stringify({
      success: false,
      message: '操作失败，请稍后重试'
    }),
    { status: 500 }
  );
}
```

### 8.2 防御性编程
```javascript
// 总是验证输入
if (!username || !password) {
  return { success: false, message: '请输入用户名和密码' };
}

// 提供默认值
const config = {
  timeout: process.env.TIMEOUT || 3000,
  retries: process.env.RETRIES || 3
};
```

### 8.3 监控和告警
```javascript
// 记录关键操作
console.log('Login attempt:', {
  username,
  timestamp: new Date().toISOString(),
  ip: request.headers.get('x-forwarded-for')
});

// 性能监控
const start = Date.now();
// ... 操作
console.log('Operation took:', Date.now() - start, 'ms');
```

## 🆘 9. 紧急联系

当遇到无法解决的问题时：

1. **查看文档**
   - V3_RECONSTRUCTION_ANALYSIS.md
   - V3_DEVELOPMENT_PRINCIPLES.md
   - ADMIN_V3_CONTRACT.md

2. **检查提交历史**
   ```bash
   git log --oneline --grep="fix"
   ```

3. **回滚到稳定版本**
   ```bash
   git checkout [stable-commit-hash]
   vercel --prod
   ```

## 📝 10. 问题记录模板

发现新问题时，请按以下格式记录：

```markdown
### 问题：[简短描述]

**症状**：
- 具体表现

**环境**：
- 浏览器：
- 部署URL：
- 时间：

**重现步骤**：
1. 步骤1
2. 步骤2

**期望结果**：
应该发生什么

**实际结果**：
实际发生了什么

**解决方案**：
如何解决的
```

---

**记住：大多数问题的答案都在错误信息里，仔细阅读！**