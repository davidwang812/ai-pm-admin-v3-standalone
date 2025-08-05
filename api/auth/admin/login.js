/**
 * Vercel Edge Function - Admin Login Proxy
 * 代理到Railway后端，解决无痕浏览器跨域问题
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

    console.log('🔐 Proxying admin login request to Railway backend...');

    // 代理到Railway后端
    const railwayUrl = 'https://aiproductmanager-production.up.railway.app/api/auth/admin/login';
    
    const response = await fetch(railwayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // 转发原始请求的headers（如果需要）
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || 'unknown',
        'X-Original-Host': request.headers.get('host') || 'unknown'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    // 获取响应数据
    const data = await response.json();

    // 如果是成功响应，确保返回格式正确
    if (response.ok && data.success) {
      console.log('✅ Admin login proxy successful');
      
      // 确保响应包含必要的字段
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: data.data?.user || {
              id: 'super-admin',
              username: username,
              email: 'admin@example.com',
              isAdmin: true,
              isSuperAdmin: true
            },
            token: data.data?.token || data.token,
            redirectUrl: data.data?.redirectUrl || '/admin/dashboard-full.html'
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

    // 转发错误响应
    console.log('❌ Admin login proxy failed:', response.status, data.message);
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
    console.error('Proxy error:', error);
    
    // 如果Railway不可用，返回友好的错误信息
    if (error.name === 'FetchError' || error.code === 'ECONNREFUSED') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Backend service temporarily unavailable. Please try again later.',
          error: 'SERVICE_UNAVAILABLE'
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 其他错误
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
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