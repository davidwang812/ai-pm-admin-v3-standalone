#!/bin/bash

echo "🧪 测试数据源API连接"
echo "===================="
echo ""

# 测试 OpenRouter API
echo "1. 测试 OpenRouter API"
echo "   URL: https://openrouter.ai/api/v1/models"
curl -s -w "\n   状态码: %{http_code}\n   响应时间: %{time_total}s\n" \
     -H "Accept: application/json" \
     https://openrouter.ai/api/v1/models \
     -o /tmp/openrouter_response.json

if [ -f /tmp/openrouter_response.json ]; then
    model_count=$(grep -o '"id"' /tmp/openrouter_response.json | wc -l)
    echo "   ✅ 成功获取 $model_count 个模型"
else
    echo "   ❌ 获取失败"
fi
echo ""

# 测试 LiteLLM 数据
echo "2. 测试 LiteLLM 数据源"
echo "   URL: GitHub Raw"
curl -s -w "\n   状态码: %{http_code}\n   响应时间: %{time_total}s\n" \
     -H "Accept: application/json" \
     https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json \
     -o /tmp/litellm_response.json

if [ -f /tmp/litellm_response.json ]; then
    model_count=$(grep -o '"model_name"' /tmp/litellm_response.json | wc -l)
    echo "   ✅ 成功获取数据，包含 $model_count 个模型记录"
else
    echo "   ❌ 获取失败"
fi
echo ""

# 测试默认 Vercel URL (预期失败)
echo "3. 测试 Vercel Data Fetcher (默认URL)"
echo "   URL: https://vercel-data-fetcher.vercel.app/api/fetch-openrouter"
curl -s -w "\n   状态码: %{http_code}\n   响应时间: %{time_total}s\n" \
     -H "Accept: application/json" \
     https://vercel-data-fetcher.vercel.app/api/fetch-openrouter \
     -o /tmp/vercel_response.json

if [ -f /tmp/vercel_response.json ] && [ -s /tmp/vercel_response.json ]; then
    echo "   ✅ 连接成功"
else
    echo "   ⚠️ 默认URL不可用（这是预期的，需要部署自己的实例）"
fi
echo ""

echo "测试完成！"
echo ""
echo "总结："
echo "- OpenRouter 和 LiteLLM 应该能正常工作"
echo "- Vercel 需要用户部署自己的实例"