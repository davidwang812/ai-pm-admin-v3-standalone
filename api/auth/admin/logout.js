/**
 * Vercel Edge Function - Admin Logout
 * V3独立登出，不依赖Railway后端
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
    // 获取Authorization header（可选）
    const authHeader = request.headers.get('authorization');
    
    console.log('🔐 V3 Admin logout processing...');

    // V3本地登出逻辑
    // 由于使用JWT，服务端无需维护session
    // 客户端清除token即可完成登出
    
    // 可以在这里记录登出日志或执行其他清理操作
    if (authHeader) {
      console.log('✅ V3 Admin logged out successfully');
    }

    // 总是返回成功，让前端清理本地状态
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

  } catch (error) {
    console.error('V3 Logout error:', error);
    
    // 即使出错，也返回成功，确保前端能清理状态
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