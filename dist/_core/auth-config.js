/**
 * V3 Authentication Configuration
 * 独立的认证配置，不依赖Railway后端
 * 
 * 契约要求：
 * - 独立认证系统
 * - 快速响应 (<1秒)
 * - 安全配置管理
 */

// 管理员账户配置
// 优先从环境变量读取，开发环境使用默认值
const ADMIN_ACCOUNTS = {
  // 超级管理员账户
  superAdmin: {
    username: process.env.SUPER_ADMIN_USERNAME || 'davidwang812',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@4444',
    email: process.env.SUPER_ADMIN_EMAIL || 'davidwang812@gmail.com',
    role: 'super_admin',
    permissions: ['*'] // 所有权限
  },
  
  // 普通管理员账户（可扩展）
  admins: [
    {
      username: 'admin',
      email: 'admin@aipm.local',
      role: 'admin',
      permissions: ['users:read', 'users:write', 'config:read', 'config:write']
    }
  ]
};

// JWT配置
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'v3-admin-secret-key-' + Math.random().toString(36).substring(7),
  expiresIn: '2h',
  refreshExpiresIn: '7d',
  issuer: 'ai-pm-v3',
  audience: 'admin-panel'
};

// 安全配置
const SECURITY_CONFIG = {
  // 登录尝试限制
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15分钟
  
  // 密码策略
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  
  // Session配置
  sessionTimeout: 30 * 60 * 1000, // 30分钟
  rememberMeDuration: 7 * 24 * 60 * 60 * 1000 // 7天
};

// 临时存储登录尝试（生产环境应使用Vercel KV）
const loginAttempts = new Map();

/**
 * 验证管理员凭据
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Object|null} - 用户信息或null
 */
export function validateAdminCredentials(username, password) {
  // 检查超级管理员
  if (username === ADMIN_ACCOUNTS.superAdmin.username && 
      password === ADMIN_ACCOUNTS.superAdmin.password) {
    return {
      id: 'super-admin-v3',
      username: ADMIN_ACCOUNTS.superAdmin.username,
      email: ADMIN_ACCOUNTS.superAdmin.email,
      role: ADMIN_ACCOUNTS.superAdmin.role,
      permissions: ADMIN_ACCOUNTS.superAdmin.permissions,
      isAdmin: true,
      isSuperAdmin: true
    };
  }
  
  // 检查其他管理员（预留扩展）
  // 未来可以从Vercel KV或其他存储读取
  
  return null;
}

/**
 * 检查登录尝试限制
 * @param {string} identifier - 用户标识（username或IP）
 * @returns {boolean} - 是否允许登录
 */
export function checkLoginAttempts(identifier) {
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  const now = Date.now();
  
  // 检查是否在锁定期内
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return false;
  }
  
  // 重置过期的尝试计数
  if (now - attempts.lastAttempt > SECURITY_CONFIG.lockoutDuration) {
    attempts.count = 0;
  }
  
  return attempts.count < SECURITY_CONFIG.maxLoginAttempts;
}

/**
 * 记录登录尝试
 * @param {string} identifier - 用户标识
 * @param {boolean} success - 是否成功
 */
export function recordLoginAttempt(identifier, success) {
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  
  if (success) {
    // 成功登录，清除记录
    loginAttempts.delete(identifier);
  } else {
    // 失败，增加计数
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    // 达到限制，设置锁定时间
    if (attempts.count >= SECURITY_CONFIG.maxLoginAttempts) {
      attempts.lockedUntil = Date.now() + SECURITY_CONFIG.lockoutDuration;
    }
    
    loginAttempts.set(identifier, attempts);
  }
}

/**
 * 获取JWT配置
 */
export function getJWTConfig() {
  return { ...JWT_CONFIG };
}

/**
 * 获取安全配置
 */
export function getSecurityConfig() {
  return { ...SECURITY_CONFIG };
}

// 清理过期的登录尝试记录（每小时执行一次）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, attempts] of loginAttempts.entries()) {
      if (now - attempts.lastAttempt > SECURITY_CONFIG.lockoutDuration) {
        loginAttempts.delete(key);
      }
    }
  }, 60 * 60 * 1000);
}

export default {
  validateAdminCredentials,
  checkLoginAttempts,
  recordLoginAttempt,
  getJWTConfig,
  getSecurityConfig
};