/**
 * Version Manager - 版本管理和更新机制
 * 管理应用版本、检查更新、处理升级流程
 */

export class VersionManager {
  constructor() {
    this.currentVersion = '3.0.0';
    this.storageKey = 'admin_v3_version_info';
    this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24小时
    this.updateChannel = this.getUpdateChannel();
    
    // 版本历史
    this.versionHistory = [
      {
        version: '3.0.0',
        releaseDate: '2025-01-28',
        changes: [
          '全新SPA架构',
          'Vercel优化部署',
          '性能提升60%',
          '增强的错误处理',
          '完善的输入验证',
          '浏览器兼容性检查'
        ]
      },
      {
        version: '2.5.0',
        releaseDate: '2025-01-15',
        changes: [
          'AI服务管理优化',
          '用户管理模块',
          '计费系统集成'
        ]
      },
      {
        version: '2.0.0',
        releaseDate: '2024-12-01',
        changes: [
          '初始版本发布',
          '基础功能实现'
        ]
      }
    ];
  }

  /**
   * 初始化版本管理器
   */
  async init() {
    console.log(`📦 Version Manager initialized - v${this.currentVersion}`);
    
    // 检查是否是新安装或升级
    this.checkInstallOrUpgrade();
    
    // 定期检查更新
    this.scheduleUpdateCheck();
    
    // 返回版本信息
    return {
      current: this.currentVersion,
      channel: this.updateChannel,
      lastCheck: this.getLastUpdateCheck()
    };
  }

  /**
   * 获取更新通道
   */
  getUpdateChannel() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else if (hostname.includes('test') || hostname.includes('staging')) {
      return 'staging';
    } else {
      return 'production';
    }
  }

  /**
   * 检查是否是新安装或升级
   */
  checkInstallOrUpgrade() {
    const storedInfo = this.getStoredVersionInfo();
    
    if (!storedInfo) {
      // 新安装
      console.log('🎉 Welcome to Admin V3!');
      this.showWelcomeMessage();
      this.saveVersionInfo();
    } else if (storedInfo.version !== this.currentVersion) {
      // 版本升级
      console.log(`🚀 Upgraded from v${storedInfo.version} to v${this.currentVersion}`);
      this.showUpgradeMessage(storedInfo.version, this.currentVersion);
      this.performUpgradeTasks(storedInfo.version, this.currentVersion);
      this.saveVersionInfo();
    }
  }

  /**
   * 获取存储的版本信息
   */
  getStoredVersionInfo() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to read version info:', error);
      return null;
    }
  }

  /**
   * 保存版本信息
   */
  saveVersionInfo() {
    try {
      const info = {
        version: this.currentVersion,
        installDate: new Date().toISOString(),
        lastCheck: new Date().toISOString(),
        channel: this.updateChannel
      };
      localStorage.setItem(this.storageKey, JSON.stringify(info));
    } catch (error) {
      console.error('Failed to save version info:', error);
    }
  }

  /**
   * 显示欢迎消息
   */
  showWelcomeMessage() {
    if (window.adminV3App?.showToast) {
      window.adminV3App.showToast('success', 
        `欢迎使用 AI Product Manager Admin V3! 当前版本: ${this.currentVersion}`,
        5000
      );
    }
  }

  /**
   * 显示升级消息
   */
  showUpgradeMessage(oldVersion, newVersion) {
    const changes = this.getChangelog(newVersion);
    
    if (window.adminV3App?.showModal) {
      window.adminV3App.showModal({
        title: `🎉 已升级到 v${newVersion}`,
        content: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p style="margin-bottom: 16px; color: #666;">
              从 v${oldVersion} 升级到 v${newVersion}
            </p>
            <h4 style="margin-bottom: 12px; color: #333;">新功能和改进：</h4>
            <ul style="list-style: none; padding: 0;">
              ${changes.map(change => `
                <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0; color: #667eea;">✓</span>
                  ${change}
                </li>
              `).join('')}
            </ul>
          </div>
        `,
        confirmText: '开始使用',
        showCancel: false
      });
    } else if (window.adminV3App?.showToast) {
      window.adminV3App.showToast('info', 
        `已升级到 v${newVersion}! 查看控制台了解新功能。`,
        5000
      );
      console.log('📋 更新内容:', changes);
    }
  }

  /**
   * 获取版本更新日志
   */
  getChangelog(version) {
    const versionInfo = this.versionHistory.find(v => v.version === version);
    return versionInfo ? versionInfo.changes : [];
  }

  /**
   * 执行升级任务
   */
  performUpgradeTasks(oldVersion, newVersion) {
    // 清理旧版本缓存
    this.clearOldCache();
    
    // 版本特定的升级任务
    if (this.compareVersions(oldVersion, '3.0.0') < 0) {
      // 从2.x升级到3.x
      this.migrateFromV2();
    }
    
    // 重新加载配置
    if (window.adminV3App?.reloadConfig) {
      window.adminV3App.reloadConfig();
    }
  }

  /**
   * 清理旧版本缓存
   */
  clearOldCache() {
    try {
      // 清理localStorage中的旧数据
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('admin_v2_') || key.startsWith('cache_'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 清理IndexedDB（如果使用）
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('admin_v2_cache');
      }
      
      console.log('✅ Cleared old version cache');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * 从V2迁移数据
   */
  migrateFromV2() {
    try {
      // 迁移认证令牌
      const v2Token = localStorage.getItem('admin_token');
      if (v2Token && !localStorage.getItem('admin_token_v3')) {
        localStorage.setItem('admin_token_v3', v2Token);
        console.log('✅ Migrated auth token from V2');
      }
      
      // 迁移用户偏好设置
      const v2Settings = localStorage.getItem('admin_settings');
      if (v2Settings) {
        try {
          const settings = JSON.parse(v2Settings);
          localStorage.setItem('admin_v3_settings', JSON.stringify({
            ...settings,
            migrated: true,
            migratedAt: new Date().toISOString()
          }));
          console.log('✅ Migrated settings from V2');
        } catch (e) {
          console.error('Failed to migrate settings:', e);
        }
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  /**
   * 比较版本号
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  /**
   * 检查更新
   */
  async checkForUpdates(force = false) {
    const lastCheck = this.getLastUpdateCheck();
    const now = Date.now();
    
    // 如果不是强制检查，且距离上次检查不到24小时，跳过
    if (!force && lastCheck && (now - lastCheck < this.updateCheckInterval)) {
      console.log('⏭️ Skipping update check (too soon)');
      return null;
    }
    
    try {
      console.log('🔍 Checking for updates...');
      
      // 模拟更新检查API调用
      // 实际应用中，这里应该调用真实的更新服务器
      const response = await this.fetchUpdateInfo();
      
      if (response && response.latestVersion) {
        const hasUpdate = this.compareVersions(response.latestVersion, this.currentVersion) > 0;
        
        if (hasUpdate) {
          console.log(`🆕 New version available: v${response.latestVersion}`);
          this.notifyUpdate(response);
        } else {
          console.log('✅ You are on the latest version');
        }
        
        // 更新最后检查时间
        this.updateLastCheck();
        
        return {
          hasUpdate,
          currentVersion: this.currentVersion,
          latestVersion: response.latestVersion,
          releaseNotes: response.releaseNotes
        };
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return null;
    }
  }

  /**
   * 获取更新信息（模拟）
   */
  async fetchUpdateInfo() {
    // 在实际应用中，这应该是一个真实的API调用
    // 这里返回模拟数据
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          latestVersion: '3.0.0',
          releaseDate: '2025-01-28',
          releaseNotes: this.getChangelog('3.0.0'),
          downloadUrl: 'https://github.com/your-repo/releases/latest',
          mandatory: false
        });
      }, 1000);
    });
  }

  /**
   * 通知更新可用
   */
  notifyUpdate(updateInfo) {
    if (window.adminV3App?.showModal) {
      window.adminV3App.showModal({
        title: '🆕 新版本可用',
        content: `
          <div>
            <p>发现新版本 <strong>v${updateInfo.latestVersion}</strong></p>
            <p style="margin-top: 12px; color: #666;">更新内容：</p>
            <ul style="margin-top: 8px;">
              ${updateInfo.releaseNotes.map(note => `<li>${note}</li>`).join('')}
            </ul>
          </div>
        `,
        confirmText: '立即更新',
        cancelText: '稍后提醒',
        onConfirm: () => this.performUpdate(updateInfo),
        onCancel: () => this.snoozeUpdate()
      });
    } else {
      console.log('🆕 Update available:', updateInfo);
    }
  }

  /**
   * 执行更新
   */
  performUpdate(updateInfo) {
    console.log('🔄 Starting update process...');
    
    // 在实际应用中，这里应该：
    // 1. 下载新版本
    // 2. 验证完整性
    // 3. 应用更新
    // 4. 重启应用
    
    // 这里简单地重新加载页面
    if (window.adminV3App?.showToast) {
      window.adminV3App.showToast('info', '正在准备更新，页面将重新加载...', 3000);
    }
    
    setTimeout(() => {
      window.location.reload(true);
    }, 3000);
  }

  /**
   * 推迟更新
   */
  snoozeUpdate() {
    const snoozeTime = 4 * 60 * 60 * 1000; // 4小时
    const nextCheck = Date.now() + snoozeTime;
    
    try {
      const info = this.getStoredVersionInfo() || {};
      info.nextCheck = nextCheck;
      localStorage.setItem(this.storageKey, JSON.stringify(info));
      
      console.log('😴 Update snoozed for 4 hours');
    } catch (error) {
      console.error('Failed to snooze update:', error);
    }
  }

  /**
   * 获取最后更新检查时间
   */
  getLastUpdateCheck() {
    const info = this.getStoredVersionInfo();
    return info?.lastCheck ? new Date(info.lastCheck).getTime() : null;
  }

  /**
   * 更新最后检查时间
   */
  updateLastCheck() {
    try {
      const info = this.getStoredVersionInfo() || {};
      info.lastCheck = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(info));
    } catch (error) {
      console.error('Failed to update last check time:', error);
    }
  }

  /**
   * 定期检查更新
   */
  scheduleUpdateCheck() {
    // 首次检查延迟5分钟
    setTimeout(() => {
      this.checkForUpdates();
    }, 5 * 60 * 1000);
    
    // 之后每24小时检查一次
    setInterval(() => {
      this.checkForUpdates();
    }, this.updateCheckInterval);
  }

  /**
   * 获取版本信息
   */
  getVersionInfo() {
    return {
      current: this.currentVersion,
      channel: this.updateChannel,
      history: this.versionHistory,
      lastCheck: this.getLastUpdateCheck(),
      environment: {
        browser: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    };
  }

  /**
   * 手动检查更新
   */
  async manualUpdateCheck() {
    if (window.adminV3App?.showToast) {
      window.adminV3App.showToast('info', '正在检查更新...', 2000);
    }
    
    const result = await this.checkForUpdates(true);
    
    if (result && !result.hasUpdate) {
      if (window.adminV3App?.showToast) {
        window.adminV3App.showToast('success', '已是最新版本！', 3000);
      }
    }
    
    return result;
  }

  /**
   * 导出版本报告
   */
  exportVersionReport() {
    const report = {
      generated: new Date().toISOString(),
      version: this.getVersionInfo(),
      features: this.getFeatureMatrix(),
      compatibility: this.getCompatibilityReport()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-v3-version-report-${this.currentVersion}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 获取功能矩阵
   */
  getFeatureMatrix() {
    return {
      core: {
        dashboard: true,
        aiService: true,
        userManagement: true,
        billing: true
      },
      advanced: {
        loadBalancing: true,
        costAnalysis: true,
        realtimeSync: false,
        edgeFunctions: true
      },
      security: {
        errorBoundary: true,
        inputValidation: true,
        xssProtection: true,
        csrfProtection: true
      },
      performance: {
        lazyLoading: true,
        codeSpiltting: true,
        caching: true,
        compression: true
      }
    };
  }

  /**
   * 获取兼容性报告
   */
  getCompatibilityReport() {
    return {
      browsers: {
        chrome: '90+',
        firefox: '88+',
        safari: '14+',
        edge: '90+'
      },
      runtime: {
        node: '16+',
        npm: '7+'
      },
      deployment: {
        vercel: true,
        railway: true,
        netlify: true,
        cloudflare: true
      }
    };
  }
}

// 创建单例
const versionManager = new VersionManager();

// 导出
export default versionManager;