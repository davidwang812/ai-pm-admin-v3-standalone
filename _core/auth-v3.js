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
      console.log('🔍 Loading stored auth...');
      const token = localStorage.getItem(this.tokenKey);
      const userStr = localStorage.getItem(this.userKey);
      
      console.log('📦 Token found:', !!token);
      console.log('📦 User data found:', !!userStr);
      
      if (token && userStr) {
        this.token = token;
        this.user = JSON.parse(userStr);
        
        console.log('👤 User loaded:', this.user?.username);
        
        // 检查token是否过期
        const expired = this.isTokenExpired();
        console.log('⏰ Token expired:', expired);
        
        if (!expired) {
          console.log('✅ Token is valid, setting up auto-refresh');
          this.setupAutoRefresh();
          return true;
        } else {
          console.log('⚠️ Token appears expired, but keeping it for now');
          // 不立即清除，让check方法决定是否刷新
          return true; // 返回true，表示有存储的认证信息
        }
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    }
    
    console.log('❌ No valid stored auth found');
    // 只有在没有token或解析失败时才清除
    if (!this.token) {
      this.clearAuth();
    }
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
    console.log('🔐 Checking authentication status...');
    
    // 如果没有token，尝试从localStorage加载
    if (!this.token) {
      console.log('📦 No token in memory, loading from storage...');
      const loaded = this.loadStoredAuth();
      if (!loaded) {
        console.log('❌ No stored auth found');
        return false;
      }
    }
    
    if (!this.token) {
      console.log('❌ Still no token after loading');
      return false;
    }
    
    console.log('🎫 Token present, checking validity...');
    
    // 检查token是否过期
    if (this.isTokenExpired()) {
      console.log('🔄 Token expired, attempting refresh...');
      // 尝试刷新token
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        console.log('❌ Token refresh failed');
        this.clearAuth();
        return false;
      }
      console.log('✅ Token refreshed successfully');
    }
    
    // 简化验证逻辑 - 如果有token且未过期，就认为有效
    // 避免每次都调用后端验证
    if (this.token && this.user) {
      console.log('✅ Authentication valid (token and user present)');
      return true;
    }
    
    // 只有在必要时才验证token
    console.log('🔍 Verifying token with backend...');
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const valid = data.success === true;
        console.log('🎯 Backend verification result:', valid);
        return valid;
      } else {
        console.log('❌ Backend verification failed:', response.status);
      }
    } catch (error) {
      console.error('Token verification error:', error);
      // 网络错误时，如果有token就认为有效
      if (this.token && this.user) {
        console.log('⚠️ Network error, but token exists, treating as valid');
        return true;
      }
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
    if (!payload) {
      console.warn('⚠️ Cannot parse token');
      return true;
    }
    
    if (!payload.exp) {
      console.log('ℹ️ Token has no expiry, treating as valid');
      return false; // 没有过期时间的token视为永不过期
    }
    
    const now = Date.now();
    const expiry = payload.exp * 1000;
    const timeLeft = expiry - now;
    
    console.log('⏰ Token expiry check:');
    console.log('   Current time:', new Date(now).toISOString());
    console.log('   Token expires:', new Date(expiry).toISOString());
    console.log('   Time left:', Math.floor(timeLeft / 1000), 'seconds');
    
    // 给5分钟缓冲时间
    const bufferTime = 5 * 60 * 1000;
    const expired = now >= (expiry - bufferTime);
    
    if (expired) {
      console.log('⚠️ Token is expired or expiring soon');
    } else {
      console.log('✅ Token is still valid');
    }
    
    return expired;
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