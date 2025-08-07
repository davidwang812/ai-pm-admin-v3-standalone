#!/bin/bash

echo "🚀 创建完全公开的Admin-V3部署..."

# 删除vercel.json中可能导致保护的设置
cat > vercel.json << 'EOF'
{
  "version": 2,
  "public": true
}
EOF

# 创建一个新的简单登录页面测试
cat > test.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Admin V3 Test</title>
</head>
<body>
    <h1>Admin V3 Test Page</h1>
    <p>This is a test page to verify deployment.</p>
    <a href="login.html">Go to Login</a>
</body>
</html>
EOF

# 提交更改
git add -A
git commit -m "Remove all Vercel auth settings for public deployment"
git push origin main

# 使用Vercel CLI创建新部署
echo "📦 创建新的公开部署..."
VERCEL_TOKEN=6h1LJWWVwGthIe0j5Fa5PjYY npx vercel \
  --token 6h1LJWWVwGthIe0j5Fa5PjYY \
  --prod \
  --yes \
  --force \
  --name ai-pm-admin-v3-public-test \
  --scope team_lK5cJywZg5gg0QVMxdgB7865

echo "✅ 部署完成"