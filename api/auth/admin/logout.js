/**
 * Vercel Edge Function - Admin Logout Proxy
 * 代理到Railway后端
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

  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // 获取Authorization header
    const authHeader = req.headers.authorization;
    
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
    res.status(response.status).json(data);

  } catch (error) {
    console.error('Logout proxy error:', error);
    
    // 即使logout失败，也返回成功，让前端清理本地状态
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}

// 配置Edge Runtime
export const config = {
  runtime: 'edge',
}