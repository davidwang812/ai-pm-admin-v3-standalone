#!/bin/bash

# 设置Vercel环境变量
echo "Setting up Vercel environment variables..."

# 使用Vercel API直接设置环境变量
PROJECT_ID="ai-pm-admin-v3-prod"
VERCEL_TOKEN="6h1LJWWVwGthIe0j5Fa5PjYY"

# 设置管理员用户名
curl -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "SUPER_ADMIN_USERNAME",
    "value": "davidwang812",
    "type": "encrypted",
    "target": ["production", "preview", "development"]
  }'

echo ""

# 设置管理员密码
curl -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "SUPER_ADMIN_PASSWORD",
    "value": "@13910008788!",
    "type": "encrypted",
    "target": ["production", "preview", "development"]
  }'

echo ""

# 设置管理员邮箱
curl -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ADMIN_EMAIL",
    "value": "davidwang812@gmail.com",
    "type": "encrypted",
    "target": ["production", "preview", "development"]
  }'

echo ""

# 设置JWT密钥
curl -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "JWT_SECRET",
    "value": "admin-v3-secret-key-2025-davidwang812",
    "type": "encrypted",
    "target": ["production", "preview", "development"]
  }'

echo ""
echo "Environment variables setup completed!"