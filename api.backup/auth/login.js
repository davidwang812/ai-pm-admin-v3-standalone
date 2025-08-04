/**
 * Vercel Edge Function for Admin Login
 * 独立的管理员认证系统
 */

export default function handler(req, res) {
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

    // 从环境变量获取管理员凭据
    const ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || 'davidwang812';
    const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || '@13910008788!';
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'davidwang812@gmail.com';

    // 验证管理员凭据
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // 生成JWT token (简化版，实际应使用jsonwebtoken库)
      const token = generateToken({
        userId: 'admin-001',
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        role: 'super_admin',
        isAdmin: true
      });

      // 返回成功响应
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          id: 'admin-001',
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          role: 'super_admin',
          isAdmin: true,
          permissions: ['all']
        }
      });
    } else {
      // 凭据无效
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * 生成简单的JWT token
 * 注意：这是简化版实现，生产环境应使用jsonwebtoken库
 */
function generateToken(payload) {
  // 创建header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // 添加过期时间（7天）
  payload.iat = Math.floor(Date.now() / 1000);
  payload.exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

  // Base64编码
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // 创建签名（简化版，实际应使用HMAC-SHA256）
  const secret = process.env.JWT_SECRET || 'admin-v3-secret-key-2025';
  const signature = Buffer.from(
    `${encodedHeader}.${encodedPayload}.${secret}`
  ).toString('base64url').substring(0, 43);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
