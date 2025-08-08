#!/bin/bash

# 临时解决方案 - 创建dist目录
echo "📁 创建临时dist目录..."

# 创建dist目录
mkdir -p dist

# 复制所有必要文件到dist
echo "📋 复制文件到dist..."
cp -r *.html _app _core _pages _styles _utils api dist/ 2>/dev/null || true

# 创建重定向文件
echo '<!DOCTYPE html><meta http-equiv="refresh" content="0; url=/index.html">' > dist/index.html

echo "✅ dist目录已创建"
echo "📂 目录内容："
ls -la dist/

echo ""
echo "🚀 现在可以重新部署了"