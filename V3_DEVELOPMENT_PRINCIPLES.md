# 🎯 V3开发核心原则与禁忌

> **简短精要的行动指南**  
> **版本**: 1.0.0  
> **状态**: 🔴 强制执行  

## ⚡ 一句话原则

> **"V3 = 独立 + 简洁 + 快速"**

## ✅ 必须做的（DO）

### 1. 架构独立
```javascript
// ✅ 正确：完全独立的认证
const result = await authenticateLocally(username, password);

// ❌ 错误：依赖外部系统
const result = await fetch('https://railway.app/api/auth');
```

### 2. 保持简洁
```javascript
// ✅ 正确：直接明了
if (username === 'admin' && password === 'admin123') {
  return { success: true };
}

// ❌ 错误：过度抽象
const validator = new AuthenticationValidatorFactory()
  .createValidator('admin')
  .withStrategy('bcrypt')
  .validate(credentials);
```

### 3. 同域处理
```javascript
// ✅ 正确：相对路径
fetch('/api/auth/login')

// ❌ 错误：跨域请求
fetch('https://backend.example.com/api/auth/login')
```

## ❌ 绝对禁止（DON'T）

### 1. 禁止依赖Railway
```javascript
// 🚫 绝对禁止
const RAILWAY_API = 'https://aiproductmanager-production.up.railway.app';
```

### 2. 禁止过度工程化
```javascript
// 🚫 禁止创建不必要的抽象
class AbstractAuthenticationServiceProviderFactoryImpl { }
```

### 3. 禁止前后端分离
```
🚫 禁止的架构：
Frontend (Vercel) ←→ Backend (Railway)

✅ 正确的架构：
Static Files + Edge Functions (All in Vercel)
```

## 🔍 快速检查清单

每次开发前问自己：

- [ ] 这个功能是否真的需要？
- [ ] 能否用更简单的方式实现？
- [ ] 是否引入了外部依赖？
- [ ] 是否符合"独立"原则？
- [ ] 用户体验是否流畅？

## 🚨 警告信号

如果你在做以下事情，**立即停止**：

1. 📍 添加 `BACKEND_URL` 环境变量
2. 📍 写超过100行的单个函数
3. 📍 创建3层以上的目录嵌套
4. 📍 引入复杂的状态管理
5. 📍 考虑微服务架构

## 💡 黄金法则

### 1. KISS原则
> **Keep It Simple, Stupid**  
> 如果你需要画图才能解释你的代码，那就太复杂了

### 2. YAGNI原则
> **You Aren't Gonna Need It**  
> 不要为"可能需要"的功能编码

### 3. 最小可行产品
> **MVP First**  
> 先实现核心功能，再考虑优化

## 📝 代码示例

### ✅ 好的代码
```javascript
// 简单直接，一眼能懂
export async function login(username, password) {
  if (username === 'admin' && password === 'admin123') {
    const token = await generateToken({ username });
    return { success: true, token };
  }
  return { success: false, message: 'Invalid credentials' };
}
```

### ❌ 坏的代码
```javascript
// 过度设计，难以理解
@Injectable()
@Transactional()
export class AuthenticationService extends AbstractBaseService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cryptoService: ICryptoService,
    private readonly tokenFactory: ITokenFactory,
    private readonly eventBus: IEventBus
  ) {
    super();
  }
  
  async authenticate(dto: AuthenticationDto): Promise<Result<AuthToken>> {
    // 50行复杂逻辑...
  }
}
```

## 🎯 记住

> **"完美不是没有东西可以加，而是没有东西可以减"**  
> —— Antoine de Saint-Exupéry

---

**本文档是V3开发的最高指导原则，违反即为错误。**