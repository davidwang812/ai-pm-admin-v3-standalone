/**
 * Vercel Edge Function - Admin Login
 * V3独立认证系统，不依赖Railway后端
 * 
 * 契约要求：
 * - 独立认证
 * - 快速响应 (<1秒)
 * - 安全验证
 */

import { SignJWT } from 'jose';

export const config = {
  runtime: 'edge',
};

// 简化的认证配置（Edge Runtime兼容）
const ADMIN_CREDENTIALS = {
  username: process.env.SUPER_ADMIN_USERNAME || 'davidwang812',
  password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@4444',
  email: process.env.SUPER_ADMIN_EMAIL || 'davidwang812@gmail.com'
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'v3-admin-secret-key-default'
);

export default async function handler(request) {
  // 处理OPTIONS请求（CORS预检）
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
      }
    });
  }

  // 只允许POST请求
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  try {
    // 解析请求体
    const body = await request.json();
    const { username, password } = body;

    // 验证输入
    if (!username || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Username and password are required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    console.log('🔐 V3 Local Authentication - Validating credentials...');

    // 本地验证管理员凭据
    if (username === ADMIN_CREDENTIALS.username && 
        password === ADMIN_CREDENTIALS.password) {
      
      console.log('✅ V3 Admin authentication successful');
      
      // 生成JWT Token
      const token = await new SignJWT({
        id: 'super-admin-v3',
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        isAdmin: true,
        isSuperAdmin: true,
        role: 'super_admin'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('ai-pm-v3')
        .setAudience('admin-panel')
        .setExpirationTime('2h')
        .sign(JWT_SECRET);
      
      // 生成Refresh Token
      const refreshToken = await new SignJWT({
        id: 'super-admin-v3',
        type: 'refresh'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('ai-pm-v3')
        .setExpirationTime('7d')
        .sign(JWT_SECRET);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'super-admin-v3',
              username: ADMIN_CREDENTIALS.username,
              email: ADMIN_CREDENTIALS.email,
              isAdmin: true,
              isSuperAdmin: true,
              role: 'super_admin'
            },
            token: token,
            refreshToken: refreshToken,
            redirectUrl: '/admin.html'
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 认证失败
    console.log('❌ V3 Admin authentication failed');
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Invalid username or password'
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('V3 Auth error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Authentication service error',
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}