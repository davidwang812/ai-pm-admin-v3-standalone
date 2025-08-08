/**
 * Auth Module
 * V3认证管理 - Token管理、自动刷新、权限验证
 * 使用Vercel Edge Functions进行认证
 */

export class AuthManager {
  constructor() {
    this.tokenKey = 'admin_token_v3';
    this.refreshTokenKey = 'admin_refresh_token_v3';
    this.userKey = 'admin_user_v3';
    
    this.user = null;
    this.token = null;
    this.refreshTimer = null;
    
    // 初始化时加载存储的认证信息
    this.loadStoredAuth();
  }

  /**
   * 加载存储的认证信息
   */
  loadStoredAuth() {
    try {
      const token = localStorage.getItem(this.tokenKey);
      const userStr = localStorage.getItem(this.userKey);
      
      if (token && userStr) {
        this.token = token;
        this.user = JSON.parse(userStr);
        
        // 检查token是否过期
        if (!this.isTokenExpired()) {
          this.setupAutoRefresh();
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    }
    
    this.clearAuth();
    return false;
  }

  /**
   * 登录
   */
  async login(username, password) {
    try {
      console.log('🔐 Attempting login with Vercel Edge Function...');
      
      // 使用本地的Vercel Edge Function而不是Railway
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      
      const data = await response.json();
      
      // 处理不同的响应格式
      const token = data.token || (data.data && data.data.token);
      const user = data.user || (data.data && data.data.user);
      const refreshToken = data.refreshToken || (data.data && data.data.refreshToken);
      
      if (data.success && token) {
        // 存储认证信息
        this.token = token;
        this.user = user;
        
        localStorage.setItem(this.tokenKey, this.token);
        localStorage.setItem(this.userKey, JSON.stringify(this.user));
        
        if (refreshToken) {
          localStorage.setItem(this.refreshTokenKey, refreshToken);
        }
        
        // 设置自动刷新
        this.setupAutoRefresh();
        
        console.log('✅ Login successful:', this.user.username || this.user.email);
        return {
          success: true,
          user: this.user
        };
      }
      
      return {
        success: false,
        message: data.message || 'Login failed'
      };
      
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        message: error.message || 'Network error'
      };
    }
  }

  /**
   * 登出
   */
  async logout() {
    try {
      // 调用Vercel Edge Function登出接口
      if (this.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    
    // 清理本地认证信息
    this.clearAuth();
    
    console.log('👋 Logged out successfully');
    return true;
  }

  /**
   * 检查认证状态
   */
  async check() {
    // 快速检查本地token
    if (!this.token) {
      return false;
    }
    
    // 检查token是否过期
    if (this.isTokenExpired()) {
      // 尝试刷新token
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        this.clearAuth();
        return false;
      }
    }
    
    // 验证token有效性（可选，避免每次都调用）
    if (Date.now() % 10 === 0) { // 10%概率验证
      return await this.verifyToken();
    }
    
    return true;
  }

  /**
   * 验证Token
   */
  async verifyToken() {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  /**
   * 刷新Token
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!refreshToken) {
      return false;
    }
    
    try {
      console.log('🔄 Refreshing token...');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.token) {
        this.token = data.data.token;
        localStorage.setItem(this.tokenKey, this.token);
        
        if (data.data.refreshToken) {
          localStorage.setItem(this.refreshTokenKey, data.data.refreshToken);
        }
        
        this.setupAutoRefresh();
        console.log('✅ Token refreshed');
        return true;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
    
    return false;
  }

  /**
   * 设置自动刷新
   */
  setupAutoRefresh() {
    // 清除旧的定时器
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // 解析token获取过期时间
    const payload = this.parseToken(this.token);
    if (!payload || !payload.exp) {
      return;
    }
    
    // 计算刷新时间（过期前5分钟）
    const expiresAt = payload.exp * 1000;
    const refreshAt = expiresAt - (5 * 60 * 1000);
    const delay = refreshAt - Date.now();
    
    if (delay > 0) {
      console.log(`⏰ Auto refresh scheduled in ${Math.round(delay / 1000)}s`);
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, delay);
    }
  }

  /**
   * 解析JWT Token
   */
  parseToken(token) {
    if (!token) return null;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }

  /**
   * 检查Token是否过期
   */
  isTokenExpired() {
    const payload = this.parseToken(this.token);
    if (!payload || !payload.exp) {
      return true;
    }
    
    // 添加30秒缓冲时间
    return Date.now() >= (payload.exp * 1000 - 30000);
  }

  /**
   * 清理认证信息
   */
  clearAuth() {
    this.token = null;
    this.user = null;
    
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 获取当前用户
   */
  getUser() {
    return this.user;
  }

  /**
   * 获取Token
   */
  getToken() {
    return this.token;
  }

  /**
   * 检查权限
   */
  hasPermission(permission) {
    if (!this.user) return false;
    
    // 超级管理员拥有所有权限
    if (this.user.role === 'super_admin') {
      return true;
    }
    
    // 检查具体权限
    if (this.user.permissions && Array.isArray(this.user.permissions)) {
      return this.user.permissions.includes(permission);
    }
    
    return false;
  }

  /**
   * 是否为管理员
   */
  isAdmin() {
    return this.user && (this.user.role === 'admin' || this.user.role === 'super_admin');
  }
}

// 创建单例实例
const authManager = new AuthManager();

// 导出为默认
export default authManager;