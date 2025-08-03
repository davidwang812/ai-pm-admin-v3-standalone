# AI Product Manager - Admin V3

静态管理面板，使用纯HTML/CSS/JavaScript构建，优化用于Vercel部署。

## 功能特点

- 🚀 零依赖，纯静态部署
- 📊 实时数据仪表板
- 🤖 AI服务管理
- 👥 用户管理
- 💰 计费管理
- 🔐 JWT认证

## 部署

### Vercel部署（推荐）

1. Fork此仓库
2. 在Vercel中导入项目
3. 部署设置：
   - Framework: Other
   - Build Command: (留空)
   - Install Command: (留空)
   - Output Directory: .

### 本地运行

使用任何静态文件服务器：

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

## 技术栈

- 原生JavaScript ES6+
- CSS3 with CSS Variables
- Chart.js for 数据可视化
- LocalStorage/IndexedDB for 缓存

## License

MIT