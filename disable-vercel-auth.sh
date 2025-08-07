#!/bin/bash

# 禁用Vercel认证保护并重新部署

echo "🔧 禁用Vercel认证保护..."

# 使用Vercel CLI禁用认证
VERCEL_TOKEN=6h1LJWWVwGthIe0j5Fa5PjYY npx vercel --token 6h1LJWWVwGthIe0j5Fa5PjYY \
  --prod \
  --yes \
  --force \
  --public \
  --no-wait

echo "✅ 部署完成"
echo "📝 等待部署生效..."
sleep 10

echo "🔍 检查访问状态..."
curl -I https://ai-pm-admin-v3-prod.vercel.app/login.html 2>/dev/null | head -5