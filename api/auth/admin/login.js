/**
 * Vercel Edge Function - Admin Login Proxy
 * 代理到Railway后端API进行认证
 * 
 * 功能：
 * - 代理认证请求到Railway
 * - 处理CORS
 * - 返回统一格式响应
 */

export const config = {
  runtime: 'edge',
};

// Railway API配置
const RAILWAY_API_URL = process.env.RAILWAY_API_URL || 'https://aiproductmanager-production.up.railway.app';

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

    console.log('🔐 Proxying authentication to Railway backend...');
    console.log('📍 Target:', `${RAILWAY_API_URL}/api/auth/admin/login`);
    
    // 代理请求到Railway后端
    const backendResponse = await fetch(`${RAILWAY_API_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    console.log('📡 Backend response status:', backendResponse.status);
    
    // 获取后端响应
    const backendData = await backendResponse.json();
    console.log('📦 Backend response:', {
      success: backendData.success,
      hasData: !!backendData.data,
      hasToken: !!(backendData.data && backendData.data.token)
    });
    
    // 直接转发后端响应
    return new Response(
      JSON.stringify(backendData),
      {
        status: backendResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
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