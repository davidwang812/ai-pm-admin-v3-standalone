#!/bin/bash

# Disable Vercel Authentication Protection for Admin-V3
# This script removes authentication requirements for public access

echo "========================================="
echo "   Disabling Vercel Authentication"
echo "========================================="
echo ""

# Set environment variables
export VERCEL_TOKEN="6h1LJWWVwGthIe0j5Fa5PjYY"
PROJECT_NAME="ai-pm-admin-v3-standalone"

echo "1. Checking current project settings..."
npx vercel env ls production --token $VERCEL_TOKEN

echo ""
echo "2. Updating project settings to disable authentication..."

# Create vercel.json with public access
cat > vercel.json << 'EOF'
{
  "version": 2,
  "public": true,
  "buildCommand": "",
  "installCommand": "",
  "outputDirectory": ".",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
EOF

echo "3. Updated vercel.json with public: true"
echo ""

echo "4. Committing changes..."
git add vercel.json
git commit -m "Disable Vercel authentication protection - set public: true"

echo ""
echo "5. Deploying to Vercel with public access..."
npx vercel --prod --yes --token $VERCEL_TOKEN

echo ""
echo "========================================="
echo "✅ Deployment complete!"
echo "========================================="
echo ""
echo "The Admin-V3 panel should now be accessible without authentication."
echo "Visit: https://ai-pm-admin-v3-prod.vercel.app"
echo ""
echo "Note: If still protected, you may need to:"
echo "1. Go to Vercel Dashboard"
echo "2. Select the project: $PROJECT_NAME"
echo "3. Go to Settings → Security"
echo "4. Turn OFF 'Vercel Authentication'"
echo "5. Turn OFF 'Password Protection'"