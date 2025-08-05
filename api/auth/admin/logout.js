/**
 * Vercel Edge Function - Admin Logout Proxy
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
    // 获取Authorization header
    const authHeader = request.headers.get('authorization');
    
    console.log('🔐 Proxying admin logout request to Railway backend...');

    // 代理到Railway后端
    const railwayUrl = 'https://aiproductmanager-production.up.railway.app/api/auth/admin/logout';
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // 转发Authorization header
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(railwayUrl, {
      method: 'POST',
      headers
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
    console.error('Logout proxy error:', error);
    
    // 即使logout失败，也返回成功，让前端清理本地状态
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully'
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
}