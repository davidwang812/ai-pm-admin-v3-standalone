/**
 * Vercel Edge Function - Admin Login Proxy
 * 代理到Railway后端，解决无痕浏览器跨域问题
 */

export default async function handler(req, res) {
  // 处理OPTIONS请求（CORS预检）
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    return res.status(200).end();
  }

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
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
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        'X-Original-Host': req.headers.host || 'unknown'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    // 获取响应数据
    const data = await response.json();

    // 转发响应状态码
    res.status(response.status);

    // 如果是成功响应，确保返回格式正确
    if (response.ok && data.success) {
      console.log('✅ Admin login proxy successful');
      
      // 确保响应包含必要的字段
      return res.json({
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
      });
    }

    // 转发错误响应
    console.log('❌ Admin login proxy failed:', response.status, data.message);
    return res.json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    
    // 如果Railway不可用，返回友好的错误信息
    if (error.name === 'FetchError' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Backend service temporarily unavailable. Please try again later.',
        error: 'SERVICE_UNAVAILABLE'
      });
    }

    // 其他错误
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// 配置Edge Runtime
export const config = {
  runtime: 'edge',
}