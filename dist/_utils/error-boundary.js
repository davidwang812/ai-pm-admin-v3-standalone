/**
 * Error Boundary - 全局错误边界处理
 * 捕获和处理应用中的错误，防止白屏
 */

export class ErrorBoundary {
  constructor() {
    this.errorHandlers = new Map();
    this.errorLog = [];
    this.maxLogSize = 100;
    
    // 安装全局错误处理器
    this.installGlobalHandlers();
  }

  /**
   * 安装全局错误处理器
   */
  installGlobalHandlers() {
    // 处理未捕获的错误
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught-error'
      });
      
      // 阻止默认错误处理
      event.preventDefault();
    });

    // 处理未捕获的Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandled-rejection',
        promise: event.promise
      });
      
      // 阻止默认处理
      event.preventDefault();
    });

    // 处理资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleResourceError(event);
      }
    }, true);
  }

  /**
   * 处理错误
   */
  handleError(error, context = {}) {
    // 创建错误记录
    const errorRecord = {
      timestamp: new Date().toISOString(),
      error: this.serializeError(error),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error?.stack
    };

    // 记录错误
    this.logError(errorRecord);

    // 执行错误处理器
    this.executeHandlers(errorRecord);

    // 显示用户友好的错误提示
    this.showErrorNotification(error, context);

    // 上报错误（如果配置了）
    this.reportError(errorRecord);
  }

  /**
   * 处理资源加载错误
   */
  handleResourceError(event) {
    const target = event.target;
    const errorRecord = {
      timestamp: new Date().toISOString(),
      type: 'resource-error',
      tagName: target.tagName,
      src: target.src || target.href,
      message: `Failed to load ${target.tagName}: ${target.src || target.href}`,
      url: window.location.href
    };

    this.logError(errorRecord);

    // 尝试重新加载资源
    if (target.tagName === 'SCRIPT' && target.dataset.retryCount < 3) {
      this.retryLoadResource(target);
    }
  }

  /**
   * 序列化错误对象
   */
  serializeError(error) {
    if (!error) return null;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...error
      };
    }

    return error;
  }

  /**
   * 记录错误日志
   */
  logError(errorRecord) {
    this.errorLog.unshift(errorRecord);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // 保存到localStorage（可选）
    try {
      localStorage.setItem('error_log', JSON.stringify(this.errorLog.slice(0, 10)));
    } catch (e) {
      // 忽略存储错误
    }

    // 控制台输出（开发环境）
    if (window.adminV3App?.config?.debug?.enabled) {
      console.error('🚨 Error captured:', errorRecord);
    }
  }

  /**
   * 执行注册的错误处理器
   */
  executeHandlers(errorRecord) {
    for (const [name, handler] of this.errorHandlers) {
      try {
        handler(errorRecord);
      } catch (e) {
        console.error(`Error in error handler ${name}:`, e);
      }
    }
  }

  /**
   * 显示错误通知
   */
  showErrorNotification(error, context) {
    // 某些错误不需要显示给用户
    const silentErrors = [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured'
    ];

    const errorMessage = error?.message || String(error);
    
    if (silentErrors.some(msg => errorMessage.includes(msg))) {
      return;
    }

    // 使用应用的toast功能
    if (window.adminV3App?.showToast) {
      let userMessage = '系统出现错误，请刷新页面重试';
      
      // 特定错误的友好提示
      if (errorMessage.includes('Network')) {
        userMessage = '网络连接失败，请检查网络设置';
      } else if (errorMessage.includes('Failed to fetch')) {
        userMessage = '数据加载失败，请稍后重试';
      } else if (context.type === 'resource-error') {
        userMessage = '资源加载失败，请刷新页面';
      }

      window.adminV3App.showToast('error', userMessage);
    }
  }

  /**
   * 上报错误到服务器
   */
  async reportError(errorRecord) {
    // 检查是否应该上报
    if (!this.shouldReportError(errorRecord)) {
      return;
    }

    // 如果配置了错误上报端点
    const reportUrl = window.adminV3App?.config?.errorReporting?.endpoint;
    if (!reportUrl) return;

    try {
      await fetch(reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...errorRecord,
          environment: window.adminV3App?.config?.environment,
          version: window.adminV3App?.config?.app?.version
        })
      });
    } catch (e) {
      // 静默失败，避免错误上报本身引起错误
    }
  }

  /**
   * 判断是否应该上报错误
   */
  shouldReportError(errorRecord) {
    // 开发环境不上报
    if (window.location.hostname === 'localhost') {
      return false;
    }

    // 忽略某些已知的、无害的错误
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'Script error',
      'Network request failed'
    ];

    const errorMessage = errorRecord.error?.message || '';
    return !ignoredErrors.some(msg => errorMessage.includes(msg));
  }

  /**
   * 重试加载资源
   */
  retryLoadResource(element) {
    const retryCount = parseInt(element.dataset.retryCount || '0');
    element.dataset.retryCount = retryCount + 1;

    setTimeout(() => {
      console.log(`🔄 Retrying load resource: ${element.src}`);
      
      if (element.tagName === 'SCRIPT') {
        const newScript = document.createElement('script');
        newScript.src = element.src;
        newScript.dataset.retryCount = element.dataset.retryCount;
        element.parentNode.replaceChild(newScript, element);
      }
    }, 1000 * Math.pow(2, retryCount)); // 指数退避
  }

  /**
   * 注册错误处理器
   */
  registerHandler(name, handler) {
    this.errorHandlers.set(name, handler);
  }

  /**
   * 注销错误处理器
   */
  unregisterHandler(name) {
    this.errorHandlers.delete(name);
  }

  /**
   * 获取错误日志
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
    try {
      localStorage.removeItem('error_log');
    } catch (e) {
      // 忽略
    }
  }

  /**
   * 创建错误边界包装器
   */
  wrap(fn, context = 'unknown') {
    return (...args) => {
      try {
        const result = fn(...args);
        
        // 处理Promise
        if (result && typeof result.catch === 'function') {
          return result.catch(error => {
            this.handleError(error, { context, args });
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        this.handleError(error, { context, args });
        throw error;
      }
    };
  }

  /**
   * 安全执行函数
   */
  safeExecute(fn, defaultValue = null, context = 'unknown') {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, { context });
      return defaultValue;
    }
  }
}

// 创建单例
const errorBoundary = new ErrorBoundary();

// 导出实例
export default errorBoundary;