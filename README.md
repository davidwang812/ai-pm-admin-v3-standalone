# AI Product Manager - Admin V3 Standalone

一个独立的、现代化的AI产品管理系统管理面板，专为Vercel部署优化。

## 🚀 特性

- **完全独立**: 不依赖后端API的独立前端应用
- **模块化架构**: 采用ES6模块系统，支持按需加载
- **响应式设计**: 适配各种屏幕尺寸
- **Vercel优化**: 针对边缘网络和静态托管优化
- **丰富功能**: 包含用户管理、计费管理、AI服务配置、仪表板等核心功能
- **零依赖构建**: 无需构建工具，直接部署即可运行

## 📋 功能模块

### 1. 仪表板 (Dashboard)
- 实时数据统计展示
- 使用趋势图表（基于Chart.js）
- 服务商分布可视化
- 最近活动日志
- 自动刷新功能

### 2. AI服务管理
- 服务商配置管理
- 统一配置中心
- 负载均衡设置（基础版和Pro版）
- 成本分析工具
- 提供商目录
- 多数据源管理

### 3. 用户管理
- 用户列表与搜索
- 用户详情查看
- 权限管理
- 会话管理
- 配额调整
- 批量操作

### 4. 计费管理
- 订阅计划管理
- 订单管理与追踪
- 支付记录查询
- 收入统计与分析
- 充值记录管理
- 数据导出功能

## 🛠️ 技术栈

- **前端框架**: 原生JavaScript + ES6模块
- **样式**: CSS3 + CSS Variables
- **图表库**: Chart.js v4
- **状态管理**: 自定义State Manager
- **路由**: 自定义Router
- **缓存**: LocalStorage + 内存缓存
- **部署**: Vercel Static Hosting

## 📦 项目结构

```
ai-pm-admin-v3-standalone/
├── index.html              # 主入口文件
├── login.html              # 登录页面
├── _app/                   # 核心应用文件
│   ├── app.js              # 主应用类
│   ├── bootstrap.js        # 启动引导
│   ├── config.js           # 配置管理
│   └── lazy-loader.js      # 懒加载工具
├── _core/                  # 核心模块
│   ├── api-client.js       # API客户端
│   ├── auth.js             # 认证管理
│   ├── router.js           # 路由系统
│   ├── cache.js            # 缓存管理
│   └── state.js            # 状态管理
├── _pages/                 # 页面模块
│   ├── dashboard/          # 仪表板
│   ├── ai-service/         # AI服务管理
│   ├── user/               # 用户管理
│   └── billing/            # 计费管理
├── _styles/                # 样式文件
├── _utils/                 # 工具类
│   └── logger.js           # 日志工具
└── api/                    # Vercel API函数
```

## 🚀 快速开始

### 本地开发

1. 克隆仓库
```bash
git clone https://github.com/your-username/ai-pm-admin-v3-standalone.git
cd ai-pm-admin-v3-standalone
```

2. 启动本地服务器（任选其一）
```bash
# 使用Python
python -m http.server 3000

# 使用Node.js
npx http-server -p 3000

# 使用PHP
php -S localhost:3000

# 使用Vercel CLI（推荐）
vercel dev
```

3. 访问 http://localhost:3000

### 部署到Vercel

#### 方法1：通过GitHub（推荐）

1. Fork此仓库到你的GitHub账号
2. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
3. 点击 "New Project"
4. 导入你的GitHub仓库
5. 部署设置：
   - Framework Preset: `Other`
   - Build Command: （留空）
   - Output Directory: `.`
   - Install Command: （留空）
6. 点击 "Deploy"

#### 方法2：使用Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 在项目目录中运行
vercel

# 按提示完成部署
```

## 🔧 配置

### 环境变量

在Vercel项目设置中配置以下环境变量：

- `SUPER_ADMIN_USERNAME` - 超级管理员用户名
- `SUPER_ADMIN_PASSWORD` - 超级管理员密码
- `JWT_SECRET` - JWT密钥（至少32字符）
- `DATABASE_URL` - PostgreSQL数据库连接字符串（可选）
- `RAILWAY_API_URL` - 后端API地址（如果有）

### 本地配置

编辑 `_app/config.js` 文件调整配置：

```javascript
export const config = {
  api: {
    railwayApiUrl: 'YOUR_BACKEND_API_URL',
    vercelDataFetcherUrl: 'YOUR_VERCEL_FUNCTION_URL'
  },
  cache: {
    enabled: true,
    ttl: {
      catalog: 24 * 60 * 60 * 1000, // 24小时
      config: 60 * 60 * 1000,        // 1小时
    }
  },
  // 其他配置...
};
```

## 📝 使用说明

### 登录

1. 访问 `/login.html`
2. 使用配置的管理员账号登录
3. 默认演示账号：
   - 用户名：`demo`
   - 密码：`demo123`

### 功能导航

登录后，你可以通过左侧导航栏访问各个功能模块：

- **仪表板**: 查看系统总览、统计数据和趋势图表
- **AI服务**: 配置AI服务提供商、管理负载均衡、分析成本
- **用户管理**: 管理系统用户、调整权限和配额
- **计费管理**: 处理订单、查看收入统计、管理订阅计划

### 数据说明

本项目在无后端API的情况下使用模拟数据运行，适合：
- 功能演示
- UI/UX测试
- 前端开发

连接真实后端API后，将自动切换到真实数据模式。

## 🧪 测试

运行集成测试：

```bash
node test-all-modules.js
```

测试覆盖：
- 用户管理模块
- 计费管理模块
- Dashboard页面
- AI服务管理页面
- 核心模块（Auth、Router、Cache、State）
- 工具类

## 🔒 安全说明

- 所有敏感信息应通过环境变量配置
- JWT密钥必须足够复杂（至少32字符）
- 生产环境建议启用HTTPS
- 定期更新依赖和检查安全漏洞

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [在线演示](https://ai-pm-admin-v3-prod.vercel.app)
- [后端API项目](https://github.com/your-username/ai-product-manager)
- [问题反馈](https://github.com/your-username/ai-pm-admin-v3-standalone/issues)
- [功能请求](https://github.com/your-username/ai-pm-admin-v3-standalone/discussions)

## 🙏 致谢

- [Chart.js](https://www.chartjs.org/) - 图表库
- [Vercel](https://vercel.com/) - 部署平台
- 所有贡献者和用户

---

Made with ❤️ by AI Product Manager Team