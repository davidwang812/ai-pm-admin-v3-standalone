#!/bin/bash

# Vercel部署修复脚本 - 解决dist目录错误
echo "🔧 开始修复Vercel部署错误..."

# 强制使用CLI配置覆盖Web设置
echo "📝 使用CLI强制部署..."

# 设置环境变量
export VERCEL_TOKEN=6h1LJWWVwGthIe0j5Fa5PjYY

# 强制部署，明确指定无框架
npx vercel --prod \
  --yes \
  --token $VERCEL_TOKEN \
  --build-env FRAMEWORK_PRESET=static \
  --output . \
  --no-build

echo "✅ 部署命令已执行"
echo "📋 请查看部署日志确认结果"