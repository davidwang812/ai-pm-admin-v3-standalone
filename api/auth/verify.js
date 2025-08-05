/**
 * Vercel Edge Function - Token Verify
 * V3独立JWT验证，不依赖Railway后端
 */

import { jwtVerify } from 'jose';

export const config = {
  runtime: 'edge',
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

  // 只允许GET请求
  if (request.method !== 'GET') {
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
    // 获取Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No authorization token provided'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 提取token
    const token = authHeader.replace('Bearer ', '');
    
    console.log('🔐 V3 Local Token Verification...');

    // 验证JWT Token
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'ai-pm-v3',
      audience: 'admin-panel',
    });

    console.log('✅ V3 Token verified successfully');

    // 返回用户信息
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: {
            id: payload.id,
            username: payload.username,
            email: payload.email,
            isAdmin: payload.isAdmin,
            isSuperAdmin: payload.isSuperAdmin,
            role: payload.role
          }
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

  } catch (error) {
    console.error('V3 Token verification error:', error);
    
    // Token无效或过期
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Invalid or expired token'
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}