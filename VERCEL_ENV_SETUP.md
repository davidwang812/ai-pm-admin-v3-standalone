# Vercel Environment Variables Setup

## 🔧 Admin-V3 Environment Variables

Please set the following environment variables in Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select project: `ai-pm-admin-v3-standalone`
3. Go to Settings → Environment Variables
4. Add the following variables:

### Required Environment Variables:

```
SUPER_ADMIN_USERNAME=davidwang812
SUPER_ADMIN_PASSWORD=@13910008788!
ADMIN_EMAIL=davidwang812@gmail.com
JWT_SECRET=4fe6d5c9331f61c208f689b15d5703dce94e9a6d11857b533f4d991b7c7e1c21
```

### Optional Environment Variables:

```
NODE_ENV=production
```

## 🚀 After Setting Environment Variables

1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment
3. Wait for deployment to complete
4. Test login at: https://ai-pm-admin-v3-prod.vercel.app

## 🔐 Test Login Credentials

- **Username**: `davidwang812`
- **Password**: `@13910008788!`

## 📋 Expected Behavior After Fix

1. Visit: https://ai-pm-admin-v3-prod.vercel.app
2. Enter login credentials
3. Should successfully redirect to `/dashboard`
4. Dashboard should load with data

## 🔍 Troubleshooting

If login still fails:
1. Check browser Network tab for API call errors
2. Verify environment variables are set correctly
3. Check if Vercel Edge Function `/api/auth/login` is working
4. Test the new deployment URL directly