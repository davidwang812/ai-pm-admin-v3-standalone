/**
 * User Management UI Components
 * 用户管理界面组件库
 */

export class UserComponents {
    constructor(userManager) {
        this.userManager = userManager;
    }

    /**
     * 渲染用户表格
     */
    renderUserTable(users) {
        if (!users || users.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <div class="empty-title">暂无用户数据</div>
                    <div class="empty-desc">没有找到符合条件的用户</div>
                </div>
            `;
        }

        return `
            <table class="user-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">
                            <input type="checkbox" id="select-all-users" />
                        </th>
                        <th>用户信息</th>
                        <th>类型</th>
                        <th>状态</th>
                        <th>配额使用</th>
                        <th>最后登录</th>
                        <th style="width: 120px;">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => this.renderUserRow(user)).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * 渲染用户行
     */
    renderUserRow(user) {
        const avatar = user.avatar_url || this.getDefaultAvatar(user.username);
        const quotaPercent = user.quota_info ? 
            ((user.quota_info.used_amount / user.quota_info.monthly_limit) * 100).toFixed(1) : 0;
        
        return `
            <tr data-user-id="${user.user_id}">
                <td>
                    <input type="checkbox" class="user-checkbox" value="${user.user_id}" />
                </td>
                <td>
                    <div class="user-info">
                        <img src="${avatar}" alt="${user.username}" class="user-avatar" />
                        <div class="user-details">
                            <div class="user-name">${user.username}</div>
                            <div class="user-email">${user.email}</div>
                            ${user.phone ? `<div class="user-phone">📱 ${user.phone}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="user-type-badge type-${user.user_type}">
                        ${this.getUserTypeDisplay(user.user_type)}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${user.status}">
                        ${this.getStatusDisplay(user.status)}
                    </span>
                    ${user.banned_reason ? `
                        <div class="banned-reason" title="${user.banned_reason}">
                            ${user.banned_reason}
                        </div>
                    ` : ''}
                </td>
                <td>
                    ${user.quota_info ? `
                        <div class="quota-info">
                            <div class="quota-bar">
                                <div class="quota-fill" style="width: ${quotaPercent}%"></div>
                            </div>
                            <div class="quota-text">
                                ${this.formatNumber(user.quota_info.used_amount)} / ${this.formatNumber(user.quota_info.monthly_limit)}
                            </div>
                        </div>
                    ` : '-'}
                </td>
                <td>
                    ${user.last_login_at ? `
                        <div class="last-login">
                            <div class="login-time">${this.formatDate(user.last_login_at)}</div>
                            <div class="login-ago">${this.getTimeAgo(user.last_login_at)}</div>
                        </div>
                    ` : '<span class="text-muted">从未登录</span>'}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="window.adminV3App.userPage.viewUserDetail('${user.user_id}')" title="查看详情">
                            👁️
                        </button>
                        <button class="btn-icon" onclick="window.adminV3App.userPage.editUser('${user.user_id}')" title="编辑">
                            ✏️
                        </button>
                        <div class="dropdown">
                            <button class="btn-icon" onclick="this.parentElement.classList.toggle('open')">
                                ⋮
                            </button>
                            <div class="dropdown-menu">
                                ${this.renderUserActions(user)}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * 渲染用户操作菜单
     */
    renderUserActions(user) {
        const actions = [];
        
        if (user.status === 'active') {
            actions.push(`
                <a href="#" onclick="window.adminV3App.userPage.updateUserStatus('${user.user_id}', 'inactive'); return false;">
                    🔒 停用账号
                </a>
            `);
        } else if (user.status === 'inactive') {
            actions.push(`
                <a href="#" onclick="window.adminV3App.userPage.updateUserStatus('${user.user_id}', 'active'); return false;">
                    🔓 激活账号
                </a>
            `);
        }
        
        if (user.status !== 'banned') {
            actions.push(`
                <a href="#" onclick="window.adminV3App.userPage.banUser('${user.user_id}'); return false;" class="text-danger">
                    🚫 封禁账号
                </a>
            `);
        } else {
            actions.push(`
                <a href="#" onclick="window.adminV3App.userPage.unbanUser('${user.user_id}'); return false;" class="text-success">
                    ✅ 解除封禁
                </a>
            `);
        }
        
        actions.push(`
            <a href="#" onclick="window.adminV3App.userPage.resetPassword('${user.user_id}'); return false;">
                🔑 重置密码
            </a>
            <a href="#" onclick="window.adminV3App.userPage.adjustQuota('${user.user_id}'); return false;">
                📊 调整配额
            </a>
            <a href="#" onclick="window.adminV3App.userPage.viewSessions('${user.user_id}'); return false;">
                💻 查看会话
            </a>
            <a href="#" onclick="window.adminV3App.userPage.viewPermissions('${user.user_id}'); return false;">
                🔐 权限管理
            </a>
            <hr>
            <a href="#" onclick="window.adminV3App.userPage.deleteUser('${user.user_id}'); return false;" class="text-danger">
                🗑️ 删除用户
            </a>
        `);
        
        return actions.join('');
    }

    /**
     * 渲染用户详情弹窗
     */
    renderUserDetailModal(user) {
        const sessions = user.sessions || [];
        const permissions = user.permissions || [];
        
        return `
            <div class="modal-overlay" id="user-detail-modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>用户详情 - ${user.username}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-tabs">
                            <button class="tab-btn active" data-tab="info">基本信息</button>
                            <button class="tab-btn" data-tab="sessions">活跃会话</button>
                            <button class="tab-btn" data-tab="permissions">权限管理</button>
                            <button class="tab-btn" data-tab="usage">使用统计</button>
                        </div>
                        
                        <div class="tab-content" id="tab-info">
                            ${this.renderUserInfo(user)}
                        </div>
                        
                        <div class="tab-content" id="tab-sessions" style="display: none;">
                            ${this.renderUserSessions(sessions)}
                        </div>
                        
                        <div class="tab-content" id="tab-permissions" style="display: none;">
                            ${this.renderUserPermissions(permissions)}
                        </div>
                        
                        <div class="tab-content" id="tab-usage" style="display: none;">
                            ${this.renderUserUsage(user)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染用户基本信息
     */
    renderUserInfo(user) {
        return `
            <div class="user-detail-info">
                <div class="info-header">
                    <img src="${user.avatar_url || this.getDefaultAvatar(user.username)}" 
                         alt="${user.username}" class="large-avatar" />
                    <div class="info-main">
                        <h4>${user.username}</h4>
                        <p>${user.email}</p>
                        <div class="info-badges">
                            <span class="user-type-badge type-${user.user_type}">
                                ${this.getUserTypeDisplay(user.user_type)}
                            </span>
                            <span class="status-badge status-${user.status}">
                                ${this.getStatusDisplay(user.status)}
                            </span>
                            ${user.role ? `
                                <span class="role-badge role-${user.role}">
                                    ${this.getRoleDisplay(user.role)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <label>用户ID</label>
                        <span>${user.user_id}</span>
                    </div>
                    <div class="info-item">
                        <label>手机号码</label>
                        <span>${user.phone || '未设置'}</span>
                    </div>
                    <div class="info-item">
                        <label>注册时间</label>
                        <span>${this.formatDate(user.created_at)}</span>
                    </div>
                    <div class="info-item">
                        <label>最后更新</label>
                        <span>${this.formatDate(user.updated_at)}</span>
                    </div>
                    <div class="info-item">
                        <label>最后登录</label>
                        <span>${user.last_login_at ? this.formatDate(user.last_login_at) : '从未登录'}</span>
                    </div>
                    ${user.banned_at ? `
                        <div class="info-item">
                            <label>封禁时间</label>
                            <span>${this.formatDate(user.banned_at)}</span>
                        </div>
                        <div class="info-item full-width">
                            <label>封禁原因</label>
                            <span class="text-danger">${user.banned_reason || '未说明'}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * 渲染用户会话列表
     */
    renderUserSessions(sessions) {
        if (!sessions || sessions.length === 0) {
            return '<div class="empty-state small">暂无活跃会话</div>';
        }
        
        return `
            <div class="sessions-list">
                ${sessions.map(session => `
                    <div class="session-item ${session.is_active ? 'active' : 'inactive'}">
                        <div class="session-info">
                            <div class="session-device">
                                💻 ${this.parseDeviceInfo(session.user_agent)}
                            </div>
                            <div class="session-details">
                                <span>IP: ${session.ip_address}</span>
                                <span>设备指纹: ${session.device_fingerprint}</span>
                            </div>
                            <div class="session-time">
                                创建: ${this.formatDate(session.created_at)}
                                ${session.expires_at ? `<br>过期: ${this.formatDate(session.expires_at)}` : ''}
                            </div>
                        </div>
                        <div class="session-actions">
                            ${session.is_active ? `
                                <button class="btn-small btn-danger" 
                                        onclick="window.adminV3App.userPage.terminateSession('${session.session_id}')">
                                    结束会话
                                </button>
                            ` : '<span class="text-muted">已失效</span>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 渲染用户权限
     */
    renderUserPermissions(permissions) {
        return `
            <div class="permissions-section">
                <div class="permissions-actions">
                    <button class="btn btn-primary" onclick="window.adminV3App.userPage.addPermission()">
                        添加权限
                    </button>
                </div>
                
                ${permissions && permissions.length > 0 ? `
                    <div class="permissions-list">
                        ${permissions.map(perm => `
                            <div class="permission-item">
                                <div class="permission-info">
                                    <div class="permission-name">${perm.permission_name}</div>
                                    <div class="permission-resource">
                                        资源类型: ${perm.resource_type}
                                        ${perm.resource_id ? ` | 资源ID: ${perm.resource_id}` : ''}
                                    </div>
                                    <div class="permission-time">
                                        授予时间: ${this.formatDate(perm.granted_at)}
                                        ${perm.expires_at ? `| 过期时间: ${this.formatDate(perm.expires_at)}` : ''}
                                    </div>
                                </div>
                                <button class="btn-icon btn-danger" 
                                        onclick="window.adminV3App.userPage.removePermission('${perm.permission_id}')">
                                    🗑️
                                </button>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="empty-state small">暂无权限配置</div>'}
            </div>
        `;
    }

    /**
     * 渲染用户使用统计
     */
    renderUserUsage(user) {
        const quota = user.quota_info || {};
        const usagePercent = quota.monthly_limit ? 
            ((quota.used_amount / quota.monthly_limit) * 100).toFixed(1) : 0;
        const elasticPercent = quota.elastic_limit ? 
            ((quota.elastic_used / quota.elastic_limit) * 100).toFixed(1) : 0;
        
        return `
            <div class="usage-stats">
                <div class="usage-summary">
                    <div class="usage-card">
                        <h5>月度配额使用</h5>
                        <div class="usage-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${usagePercent}%"></div>
                            </div>
                            <div class="usage-numbers">
                                <span>${this.formatNumber(quota.used_amount || 0)}</span>
                                <span>${this.formatNumber(quota.monthly_limit || 0)}</span>
                            </div>
                            <div class="usage-label">
                                <span>已使用</span>
                                <span>总配额</span>
                            </div>
                        </div>
                    </div>
                    
                    ${quota.elastic_limit > 0 ? `
                        <div class="usage-card">
                            <h5>弹性配额使用</h5>
                            <div class="usage-progress">
                                <div class="progress-bar elastic">
                                    <div class="progress-fill" style="width: ${elasticPercent}%"></div>
                                </div>
                                <div class="usage-numbers">
                                    <span>${this.formatNumber(quota.elastic_used || 0)}</span>
                                    <span>${this.formatNumber(quota.elastic_limit || 0)}</span>
                                </div>
                                <div class="usage-label">
                                    <span>已使用</span>
                                    <span>弹性配额</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="usage-actions">
                    <button class="btn" onclick="window.adminV3App.userPage.viewDetailedUsage('${user.user_id}')">
                        查看详细使用记录
                    </button>
                    <button class="btn" onclick="window.adminV3App.userPage.adjustQuota('${user.user_id}')">
                        调整配额
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 渲染用户编辑表单
     */
    renderUserEditForm(user = {}) {
        const isNew = !user.user_id;
        
        return `
            <div class="modal-overlay" id="user-edit-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${isNew ? '添加用户' : '编辑用户'}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <form id="user-edit-form" onsubmit="window.adminV3App.userPage.saveUser(event); return false;">
                            ${!isNew ? `<input type="hidden" name="user_id" value="${user.user_id}">` : ''}
                            
                            <div class="form-group">
                                <label>用户名 <span class="required">*</span></label>
                                <input type="text" name="username" value="${user.username || ''}" 
                                       required placeholder="请输入用户名" ${!isNew ? 'readonly' : ''}>
                            </div>
                            
                            <div class="form-group">
                                <label>邮箱 <span class="required">*</span></label>
                                <input type="email" name="email" value="${user.email || ''}" 
                                       required placeholder="user@example.com">
                            </div>
                            
                            <div class="form-group">
                                <label>手机号码</label>
                                <input type="tel" name="phone" value="${user.phone || ''}" 
                                       placeholder="13800138000">
                            </div>
                            
                            ${isNew ? `
                                <div class="form-group">
                                    <label>初始密码 <span class="required">*</span></label>
                                    <input type="password" name="password" required 
                                           placeholder="至少8位，包含字母和数字">
                                </div>
                            ` : ''}
                            
                            <div class="form-group">
                                <label>用户类型</label>
                                <select name="user_type" value="${user.user_type || 'free'}">
                                    <option value="free" ${user.user_type === 'free' ? 'selected' : ''}>
                                        免费用户
                                    </option>
                                    <option value="premium" ${user.user_type === 'premium' ? 'selected' : ''}>
                                        高级用户
                                    </option>
                                    <option value="enterprise" ${user.user_type === 'enterprise' ? 'selected' : ''}>
                                        企业用户
                                    </option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>用户角色</label>
                                <select name="role" value="${user.role || 'user'}">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>
                                        普通用户
                                    </option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>
                                        管理员
                                    </option>
                                    <option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>
                                        超级管理员
                                    </option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>账号状态</label>
                                <select name="status" value="${user.status || 'active'}">
                                    <option value="active" ${user.status === 'active' ? 'selected' : ''}>
                                        激活
                                    </option>
                                    <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>
                                        未激活
                                    </option>
                                    ${!isNew ? `
                                        <option value="banned" ${user.status === 'banned' ? 'selected' : ''}>
                                            封禁
                                        </option>
                                    ` : ''}
                                </select>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" 
                                        onclick="this.closest('.modal-overlay').remove()">
                                    取消
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    ${isNew ? '创建用户' : '保存更改'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染配额调整表单
     */
    renderQuotaAdjustForm(user) {
        const quota = user.quota_info || {};
        
        return `
            <div class="modal-overlay" id="quota-adjust-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>调整用户配额 - ${user.username}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <form id="quota-adjust-form" onsubmit="window.adminV3App.userPage.saveQuotaAdjustment(event, '${user.user_id}'); return false;">
                            <div class="current-quota">
                                <h4>当前配额情况</h4>
                                <div class="quota-display">
                                    <div class="quota-item">
                                        <span>月度配额:</span>
                                        <strong>${this.formatNumber(quota.monthly_limit || 0)}</strong>
                                    </div>
                                    <div class="quota-item">
                                        <span>已使用:</span>
                                        <strong>${this.formatNumber(quota.used_amount || 0)}</strong>
                                    </div>
                                    <div class="quota-item">
                                        <span>弹性配额:</span>
                                        <strong>${this.formatNumber(quota.elastic_limit || 0)}</strong>
                                    </div>
                                    <div class="quota-item">
                                        <span>弹性已用:</span>
                                        <strong>${this.formatNumber(quota.elastic_used || 0)}</strong>
                                    </div>
                                </div>
                            </div>
                            
                            <hr>
                            
                            <div class="form-group">
                                <label>新月度配额</label>
                                <input type="number" name="monthly_limit" 
                                       value="${quota.monthly_limit || 0}" 
                                       min="0" step="1000" required>
                                <small>设置用户的月度Token配额上限</small>
                            </div>
                            
                            <div class="form-group">
                                <label>新弹性配额</label>
                                <input type="number" name="elastic_limit" 
                                       value="${quota.elastic_limit || 0}" 
                                       min="0" step="1000" required>
                                <small>设置用户可以使用的弹性配额上限</small>
                            </div>
                            
                            <div class="form-group">
                                <label>调整原因</label>
                                <textarea name="reason" rows="3" required 
                                          placeholder="请说明调整配额的原因..."></textarea>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" 
                                        onclick="this.closest('.modal-overlay').remove()">
                                    取消
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    确认调整
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染过滤器
     */
    renderFilters(currentFilter) {
        return `
            <div class="filter-section">
                <div class="filter-group">
                    <label>用户状态</label>
                    <select id="filter-status" onchange="window.adminV3App.userPage.applyFilters()">
                        <option value="all" ${currentFilter.status === 'all' ? 'selected' : ''}>全部</option>
                        <option value="active" ${currentFilter.status === 'active' ? 'selected' : ''}>激活</option>
                        <option value="inactive" ${currentFilter.status === 'inactive' ? 'selected' : ''}>未激活</option>
                        <option value="banned" ${currentFilter.status === 'banned' ? 'selected' : ''}>已封禁</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>用户类型</label>
                    <select id="filter-type" onchange="window.adminV3App.userPage.applyFilters()">
                        <option value="all" ${currentFilter.userType === 'all' ? 'selected' : ''}>全部</option>
                        <option value="free" ${currentFilter.userType === 'free' ? 'selected' : ''}>免费用户</option>
                        <option value="premium" ${currentFilter.userType === 'premium' ? 'selected' : ''}>高级用户</option>
                        <option value="enterprise" ${currentFilter.userType === 'enterprise' ? 'selected' : ''}>企业用户</option>
                    </select>
                </div>
                
                <div class="filter-group search-group">
                    <label>搜索用户</label>
                    <div class="search-input">
                        <input type="text" id="search-users" 
                               placeholder="输入用户名、邮箱或手机号..." 
                               value="${currentFilter.searchQuery || ''}"
                               onkeyup="window.adminV3App.userPage.handleSearch(event)">
                        <button class="search-btn" onclick="window.adminV3App.userPage.searchUsers()">
                            🔍
                        </button>
                    </div>
                </div>
                
                <div class="filter-actions">
                    <button class="btn btn-secondary" onclick="window.adminV3App.userPage.resetFilters()">
                        重置筛选
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 渲染分页控件
     */
    renderPagination(pagination) {
        const { page, pageSize, total } = pagination;
        const totalPages = Math.ceil(total / pageSize);
        
        // 即使只有一页也显示分页信息
        if (totalPages === 0) return '';
        
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        return `
            <div class="pagination">
                <button class="page-btn" onclick="window.adminV3App.userPage.changePage(1)" 
                        ${page === 1 ? 'disabled' : ''}>
                    首页
                </button>
                <button class="page-btn" onclick="window.adminV3App.userPage.changePage(${page - 1})" 
                        ${page === 1 ? 'disabled' : ''}>
                    上一页
                </button>
                
                ${start > 1 ? '<span class="page-ellipsis">...</span>' : ''}
                
                ${Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => `
                    <button class="page-btn ${p === page ? 'active' : ''}" 
                            onclick="window.adminV3App.userPage.changePage(${p})">
                        ${p}
                    </button>
                `).join('')}
                
                ${end < totalPages ? '<span class="page-ellipsis">...</span>' : ''}
                
                <button class="page-btn" onclick="window.adminV3App.userPage.changePage(${page + 1})" 
                        ${page === totalPages ? 'disabled' : ''}>
                    下一页
                </button>
                <button class="page-btn" onclick="window.adminV3App.userPage.changePage(${totalPages})" 
                        ${page === totalPages ? 'disabled' : ''}>
                    末页
                </button>
                
                <span class="page-info">
                    第 ${page} 页，共 ${totalPages} 页，${total} 条记录
                </span>
            </div>
        `;
    }

    // 工具方法
    getDefaultAvatar(username) {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    }

    getUserTypeDisplay(type) {
        const types = {
            free: '免费用户',
            premium: '高级用户',
            enterprise: '企业用户'
        };
        return types[type] || type;
    }

    getStatusDisplay(status) {
        const statuses = {
            active: '激活',
            inactive: '未激活',
            banned: '已封禁'
        };
        return statuses[status] || status;
    }

    getRoleDisplay(role) {
        const roles = {
            user: '普通用户',
            admin: '管理员',
            super_admin: '超级管理员'
        };
        return roles[role] || role;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getTimeAgo(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 30) return `${days}天前`;
        
        return date.toLocaleDateString('zh-CN');
    }

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }

    parseDeviceInfo(userAgent) {
        if (!userAgent) return '未知设备';
        
        // 简单的设备解析
        if (userAgent.includes('Windows')) return 'Windows PC';
        if (userAgent.includes('Mac')) return 'Mac';
        if (userAgent.includes('iPhone')) return 'iPhone';
        if (userAgent.includes('iPad')) return 'iPad';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('Linux')) return 'Linux';
        
        return '其他设备';
    }
}

export default UserComponents;