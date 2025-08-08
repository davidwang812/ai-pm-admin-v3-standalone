/**
 * Vercel Edge Function - Token Refresh
 * V3独立Token刷新，不依赖Railway后端
 */

import { jwtVerify, SignJWT } from 'jose';

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
    const { refreshToken } = body;

    if (!refreshToken) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Refresh token is required'
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

    console.log('🔐 V3 Local Token Refresh...');

    // 验证Refresh Token
    const { payload } = await jwtVerify(refreshToken, JWT_SECRET, {
      issuer: 'ai-pm-v3'
    });

    // 确保是refresh token
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    console.log('✅ V3 Refresh token verified');

    // 生成新的Access Token
    const newToken = await new SignJWT({
      id: payload.id,
      username: process.env.SUPER_ADMIN_USERNAME || 'davidwang812',
      email: process.env.SUPER_ADMIN_EMAIL || 'davidwang812@gmail.com',
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
    
    // 生成新的Refresh Token
    const newRefreshToken = await new SignJWT({
      id: payload.id,
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
          token: newToken,
          refreshToken: newRefreshToken
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
    console.error('V3 Refresh error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to refresh token',
        error: error.message
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