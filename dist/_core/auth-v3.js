/**
 * Auth Module - V3 Independent Version
 * 完全独立的V3认证管理，不依赖Railway
 * 符合契约要求：独立、快速、安全
 */

export class AuthManagerV3 {
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
   * 登录 - 使用V3独立认证
   */
  async login(username, password) {
    try {
      console.log('🔐 V3 Independent Authentication...');
      
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });
      
      console.log('📡 Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (data.success && data.data) {
        const { user, token, refreshToken } = data.data;
        
        // 存储认证信息
        this.token = token;
        this.user = user;
        
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        
        if (refreshToken) {
          localStorage.setItem(this.refreshTokenKey, refreshToken);
        }
        
        // 设置自动刷新
        this.setupAutoRefresh();
        
        console.log('✅ V3 Login successful:', user.username);
        return {
          success: true,
          user: user,
          redirectUrl: data.data.redirectUrl
        };
      }
      
      return {
        success: false,
        message: data.message || 'Login failed'
      };
      
    } catch (error) {
      console.error('❌ V3 Login error:', error);
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
      if (this.token) {
        await fetch('/api/auth/admin/logout', {
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
    
    console.log('👋 V3 Logged out successfully');
    return true;
  }

  /**
   * 检查认证状态
   */
  async check() {
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
    
    // 验证token有效性
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success === true;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
    
    return false;
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
      console.log('🔄 V3 Refreshing token...');
      
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
      
      if (data.success && data.data) {
        this.token = data.data.token;
        localStorage.setItem(this.tokenKey, data.data.token);
        
        if (data.data.refreshToken) {
          localStorage.setItem(this.refreshTokenKey, data.data.refreshToken);
        }
        
        this.setupAutoRefresh();
        console.log('✅ V3 Token refreshed');
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
      console.log(`⏰ V3 Auto refresh scheduled in ${Math.round(delay / 1000)}s`);
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
    if (this.user.role === 'super_admin' || this.user.isSuperAdmin) {
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
    return this.user && (this.user.isAdmin || this.user.isSuperAdmin);
  }
}

// 创建单例实例
const authManagerV3 = new AuthManagerV3();

// 导出为默认
export default authManagerV3;