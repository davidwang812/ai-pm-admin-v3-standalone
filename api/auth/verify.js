/**
 * Vercel Edge Function - Token Verify Proxy
 * 代理到Railway后端
 */

export const config = {
  runtime: 'edge',
};

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

    console.log('🔐 Proxying token verify request to Railway backend...');

    // 代理到Railway后端
    const railwayUrl = 'https://aiproductmanager-production.up.railway.app/api/auth/verify';
    
    const response = await fetch(railwayUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    // 获取响应数据
    const data = await response.json();

    // 转发响应
    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Verify proxy error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to verify token',
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