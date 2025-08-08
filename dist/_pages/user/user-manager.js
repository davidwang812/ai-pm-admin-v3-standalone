/**
 * User Manager Module
 * 用户管理核心模块 - 符合数据库契约
 */

export class UserManager {
    constructor(app) {
        this.app = app;
        this.users = [];
        this.sessions = [];
        this.permissions = [];
        this.currentFilter = {
            status: 'all',
            userType: 'all',
            searchQuery: ''
        };
        this.pagination = {
            page: 1,
            pageSize: 10,
            total: 0
        };
    }

    /**
     * 加载用户数据
     */
    async loadUsers() {
        try {
            console.log('📥 Loading users from API...');
            
            // 尝试从API加载
            if (this.app.api && typeof this.app.api.getUsers === 'function') {
                const response = await this.app.api.getUsers({
                    page: this.pagination.page,
                    pageSize: this.pagination.pageSize,
                    ...this.currentFilter
                });
                
                if (response.success) {
                    this.users = response.users || [];
                    this.pagination.total = response.total || this.users.length;
                    console.log(`✅ Loaded ${this.users.length} users`);
                    return this.users;
                }
            }
            
            // 降级到模拟数据
            console.log('⚠️ API unavailable, using mock data');
            return this.loadMockUsers();
            
        } catch (error) {
            console.error('❌ Failed to load users:', error);
            this.app.showToast('error', '加载用户数据失败');
            return this.loadMockUsers();
        }
    }

    /**
     * 加载模拟用户数据 - 符合USERS表结构
     */
    loadMockUsers() {
        this.users = [
            {
                user_id: 1,
                email: 'admin@example.com',
                username: 'admin',
                phone: '13800138000',
                user_type: 'enterprise',
                status: 'active',
                created_at: '2024-01-15T08:00:00Z',
                updated_at: '2024-12-20T10:30:00Z',
                last_login_at: '2025-08-05T09:00:00Z',
                avatar_url: null,
                // 扩展字段
                role: 'super_admin',
                quota_info: {
                    monthly_limit: 100000,
                    used_amount: 45000,
                    elastic_limit: 20000,
                    elastic_used: 5000
                }
            },
            {
                user_id: 2,
                email: 'davidwang812@gmail.com',
                username: 'davidwang812',
                phone: '13912345678',
                user_type: 'premium',
                status: 'active',
                created_at: '2024-01-20T10:00:00Z',
                updated_at: '2025-08-01T15:20:00Z',
                last_login_at: '2025-08-04T18:30:00Z',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=davidwang',
                role: 'admin',
                quota_info: {
                    monthly_limit: 50000,
                    used_amount: 12000,
                    elastic_limit: 10000,
                    elastic_used: 0
                }
            },
            {
                user_id: 3,
                email: 'test@example.com',
                username: 'testuser',
                phone: null,
                user_type: 'free',
                status: 'inactive',
                created_at: '2024-02-01T14:00:00Z',
                updated_at: '2024-08-15T09:00:00Z',
                last_login_at: '2024-08-10T16:45:00Z',
                avatar_url: null,
                role: 'user',
                quota_info: {
                    monthly_limit: 5000,
                    used_amount: 4800,
                    elastic_limit: 0,
                    elastic_used: 0
                }
            },
            {
                user_id: 4,
                email: 'banned@example.com',
                username: 'banneduser',
                phone: '13656789012',
                user_type: 'free',
                status: 'banned',
                created_at: '2024-03-10T09:30:00Z',
                updated_at: '2024-12-01T11:00:00Z',
                last_login_at: '2024-11-30T23:59:00Z',
                avatar_url: null,
                role: 'user',
                banned_reason: '违反使用条款 - 恶意刷取API',
                banned_at: '2024-12-01T11:00:00Z',
                quota_info: {
                    monthly_limit: 0,
                    used_amount: 0,
                    elastic_limit: 0,
                    elastic_used: 0
                }
            }
        ];
        
        this.pagination.total = this.users.length;
        return this.users;
    }

    /**
     * 获取用户详情
     */
    async getUserDetail(userId) {
        try {
            // 尝试从API获取
            if (this.app.api && typeof this.app.api.getUserDetail === 'function') {
                const response = await this.app.api.getUserDetail(userId);
                if (response.success) {
                    return response.user;
                }
            }
            
            // 从缓存获取
            return this.users.find(u => u.user_id === parseInt(userId));
            
        } catch (error) {
            console.error('Failed to get user detail:', error);
            return null;
        }
    }

    /**
     * 获取用户会话
     */
    async getUserSessions(userId) {
        try {
            if (this.app.api && typeof this.app.api.getUserSessions === 'function') {
                const response = await this.app.api.getUserSessions(userId);
                if (response.success) {
                    return response.sessions;
                }
            }
            
            // 模拟数据
            return [
                {
                    session_id: 1,
                    user_id: userId,
                    device_fingerprint: 'Windows-Chrome-123456',
                    ip_address: '192.168.1.100',
                    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date().toISOString(),
                    is_active: true
                }
            ];
            
        } catch (error) {
            console.error('Failed to get user sessions:', error);
            return [];
        }
    }

    /**
     * 获取用户权限
     */
    async getUserPermissions(userId) {
        try {
            if (this.app.api && typeof this.app.api.getUserPermissions === 'function') {
                const response = await this.app.api.getUserPermissions(userId);
                if (response.success) {
                    return response.permissions;
                }
            }
            
            // 模拟数据
            const user = this.users.find(u => u.user_id === parseInt(userId));
            if (!user) return [];
            
            const rolePermissions = {
                super_admin: ['*'],
                admin: ['user.view', 'user.edit', 'ai.manage', 'billing.view'],
                user: ['profile.view', 'profile.edit']
            };
            
            return (rolePermissions[user.role] || []).map((perm, index) => ({
                permission_id: index + 1,
                user_id: userId,
                permission_name: perm,
                resource_type: perm.split('.')[0],
                granted_at: user.created_at
            }));
            
        } catch (error) {
            console.error('Failed to get user permissions:', error);
            return [];
        }
    }

    /**
     * 创建新用户
     */
    async createUser(userData) {
        try {
            console.log('📝 Creating new user:', userData);
            
            // 验证必填字段
            if (!userData.email || !userData.username) {
                throw new Error('邮箱和用户名为必填项');
            }
            
            // 验证邮箱格式
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userData.email)) {
                throw new Error('邮箱格式不正确');
            }
            
            // 尝试通过API创建
            if (this.app.api && typeof this.app.api.createUser === 'function') {
                const response = await this.app.api.createUser(userData);
                if (response.success) {
                    this.app.showToast('success', '用户创建成功');
                    await this.loadUsers(); // 重新加载用户列表
                    return response.user;
                }
                throw new Error(response.message || '创建失败');
            }
            
            // 模拟创建
            const newUser = {
                user_id: Math.max(...this.users.map(u => u.user_id)) + 1,
                ...userData,
                password_hash: null, // 不在前端处理密码
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_login_at: null,
                quota_info: {
                    monthly_limit: userData.user_type === 'premium' ? 50000 : 5000,
                    used_amount: 0,
                    elastic_limit: userData.user_type === 'premium' ? 10000 : 0,
                    elastic_used: 0
                }
            };
            
            this.users.unshift(newUser);
            this.pagination.total++;
            this.app.showToast('success', '用户创建成功（模拟）');
            return newUser;
            
        } catch (error) {
            console.error('Failed to create user:', error);
            this.app.showToast('error', error.message || '创建用户失败');
            throw error;
        }
    }

    /**
     * 更新用户信息
     */
    async updateUser(userId, updates) {
        try {
            console.log('📝 Updating user:', userId, updates);
            
            // 尝试通过API更新
            if (this.app.api && typeof this.app.api.updateUser === 'function') {
                const response = await this.app.api.updateUser(userId, updates);
                if (response.success) {
                    this.app.showToast('success', '用户信息已更新');
                    await this.loadUsers();
                    return response.user;
                }
                throw new Error(response.message || '更新失败');
            }
            
            // 模拟更新
            const userIndex = this.users.findIndex(u => u.user_id === parseInt(userId));
            if (userIndex === -1) {
                throw new Error('用户不存在');
            }
            
            this.users[userIndex] = {
                ...this.users[userIndex],
                ...updates,
                updated_at: new Date().toISOString()
            };
            
            this.app.showToast('success', '用户信息已更新（模拟）');
            return this.users[userIndex];
            
        } catch (error) {
            console.error('Failed to update user:', error);
            this.app.showToast('error', error.message || '更新用户失败');
            throw error;
        }
    }

    /**
     * 删除用户
     */
    async deleteUser(userId) {
        try {
            console.log('🗑️ Deleting user:', userId);
            
            // 尝试通过API删除
            if (this.app.api && typeof this.app.api.deleteUser === 'function') {
                const response = await this.app.api.deleteUser(userId);
                if (response.success) {
                    this.app.showToast('success', '用户已删除');
                    await this.loadUsers();
                    return true;
                }
                throw new Error(response.message || '删除失败');
            }
            
            // 模拟删除
            const userIndex = this.users.findIndex(u => u.user_id === parseInt(userId));
            if (userIndex === -1) {
                throw new Error('用户不存在');
            }
            
            this.users.splice(userIndex, 1);
            this.pagination.total--;
            this.app.showToast('success', '用户已删除（模拟）');
            return true;
            
        } catch (error) {
            console.error('Failed to delete user:', error);
            this.app.showToast('error', error.message || '删除用户失败');
            throw error;
        }
    }

    /**
     * 更新用户状态
     */
    async updateUserStatus(userId, status) {
        const validStatuses = ['active', 'inactive', 'banned'];
        if (!validStatuses.includes(status)) {
            throw new Error('无效的状态值');
        }
        
        const updates = { status };
        if (status === 'banned') {
            updates.banned_at = new Date().toISOString();
        }
        
        return this.updateUser(userId, updates);
    }

    /**
     * 重置用户密码
     */
    async resetUserPassword(userId) {
        try {
            console.log('🔑 Resetting password for user:', userId);
            
            if (this.app.api && typeof this.app.api.resetUserPassword === 'function') {
                const response = await this.app.api.resetUserPassword(userId);
                if (response.success) {
                    this.app.showToast('success', '密码重置邮件已发送');
                    return true;
                }
                throw new Error(response.message || '重置失败');
            }
            
            // 模拟重置
            this.app.showToast('success', '密码重置邮件已发送（模拟）');
            return true;
            
        } catch (error) {
            console.error('Failed to reset password:', error);
            this.app.showToast('error', error.message || '重置密码失败');
            throw error;
        }
    }

    /**
     * 调整用户配额
     */
    async adjustUserQuota(userId, quotaChanges) {
        try {
            console.log('📊 Adjusting user quota:', userId, quotaChanges);
            
            if (this.app.api && typeof this.app.api.adjustUserQuota === 'function') {
                const response = await this.app.api.adjustUserQuota(userId, quotaChanges);
                if (response.success) {
                    this.app.showToast('success', '配额已调整');
                    await this.loadUsers();
                    return response.quota;
                }
                throw new Error(response.message || '调整失败');
            }
            
            // 模拟调整
            const user = this.users.find(u => u.user_id === parseInt(userId));
            if (user && user.quota_info) {
                Object.assign(user.quota_info, quotaChanges);
                this.app.showToast('success', '配额已调整（模拟）');
                return user.quota_info;
            }
            
            throw new Error('用户不存在');
            
        } catch (error) {
            console.error('Failed to adjust quota:', error);
            this.app.showToast('error', error.message || '调整配额失败');
            throw error;
        }
    }

    /**
     * 导出用户数据
     */
    async exportUsers(format = 'csv') {
        try {
            console.log('📤 Exporting users in format:', format);
            
            if (this.app.api && typeof this.app.api.exportUsers === 'function') {
                const response = await this.app.api.exportUsers({ format });
                if (response.success && response.downloadUrl) {
                    window.open(response.downloadUrl, '_blank');
                    this.app.showToast('success', '导出成功');
                    return;
                }
            }
            
            // 模拟导出
            const data = this.users.map(user => ({
                用户ID: user.user_id,
                用户名: user.username,
                邮箱: user.email,
                手机: user.phone || '-',
                类型: user.user_type,
                状态: user.status,
                注册时间: new Date(user.created_at).toLocaleString('zh-CN'),
                最后登录: user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '从未登录'
            }));
            
            if (format === 'csv') {
                this.downloadCSV(data, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
            } else {
                this.downloadJSON(data, `users_export_${new Date().toISOString().split('T')[0]}.json`);
            }
            
            this.app.showToast('success', '导出成功');
            
        } catch (error) {
            console.error('Failed to export users:', error);
            this.app.showToast('error', '导出失败');
        }
    }

    /**
     * 下载CSV文件
     */
    downloadCSV(data, filename) {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    /**
     * 下载JSON文件
     */
    downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    /**
     * 过滤用户
     */
    filterUsers(filters) {
        this.currentFilter = { ...this.currentFilter, ...filters };
        this.pagination.page = 1;
        return this.loadUsers();
    }

    /**
     * 搜索用户
     */
    searchUsers(query) {
        this.currentFilter.searchQuery = query;
        this.pagination.page = 1;
        return this.loadUsers();
    }

    /**
     * 分页
     */
    changePage(page) {
        this.pagination.page = page;
        return this.loadUsers();
    }

    /**
     * 获取用户统计
     */
    async getUserStats() {
        try {
            if (this.app.api && typeof this.app.api.getUserStats === 'function') {
                const response = await this.app.api.getUserStats();
                if (response.success) {
                    return response.stats;
                }
            }
            
            // 从当前数据计算统计
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            
            const stats = {
                totalUsers: this.users.length,
                activeUsers: this.users.filter(u => u.status === 'active').length,
                newUsers: this.users.filter(u => new Date(u.created_at) > lastMonth).length,
                userTypes: {
                    free: this.users.filter(u => u.user_type === 'free').length,
                    premium: this.users.filter(u => u.user_type === 'premium').length,
                    enterprise: this.users.filter(u => u.user_type === 'enterprise').length
                },
                trends: {
                    totalChange: 8, // 模拟数据
                    activeChange: 12,
                    newChange: 5
                }
            };
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get user stats:', error);
            return null;
        }
    }
}

export default UserManager;