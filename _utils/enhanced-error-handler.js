/**
 * Enhanced Error Handler
 * 增强错误处理器 - 统一的错误处理、分类和恢复机制
 */

import { featureFlags } from './feature-flags.js';
import { performanceMonitor } from './performance-monitor.js';
import { autoRollback } from './auto-rollback.js';

// 错误类型枚举
export const ErrorTypes = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  API: 'api',
  DATABASE: 'database',
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  RATE_LIMIT: 'rate_limit',
  SYSTEM: 'system',
  UNKNOWN: 'unknown'
};

// 错误严重程度
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// 自定义错误类
export class EnhancedError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, severity = ErrorSeverity.MEDIUM, context = {}) {
    super(message);
    this.name = 'EnhancedError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.id = this.generateErrorId();
    this.handled = false;
    this.retryable = this.isRetryable();
    
    // 捕获堆栈追踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isRetryable() {
    const retryableTypes = [
      ErrorTypes.NETWORK,
      ErrorTypes.API,
      ErrorTypes.DATABASE,
      ErrorTypes.RATE_LIMIT
    ];
    return retryableTypes.includes(this.type);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      retryable: this.retryable,
      stack: this.stack
    };
  }
}

class EnhancedErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.errorPatterns = new Map();
    this.recoveryStrategies = new Map();
    this.errorThresholds = new Map();
    this.listeners = new Set();
    
    // 设置默认恢复策略
    this.setupDefaultRecoveryStrategies();
    
    // 设置默认错误阈值
    this.setupDefaultThresholds();
    
    // 监听未处理的异常
    this.setupGlobalErrorHandling();
  }

  /**
   * 设置默认恢复策略
   */
  setupDefaultRecoveryStrategies() {
    // 网络错误恢复策略
    this.addRecoveryStrategy(ErrorTypes.NETWORK, async (error, context) => {
      const maxRetries = context.maxRetries || 3;
      const delay = context.retryDelay || 1000;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          
          if (context.retryFunction) {
            const result = await context.retryFunction();
            console.log(`Network error recovery successful on attempt ${i + 1}`);
            return { success: true, result, attempts: i + 1 };
          }
        } catch (retryError) {
          console.warn(`Retry attempt ${i + 1} failed:`, retryError.message);
          if (i === maxRetries - 1) {
            throw new EnhancedError(
              `Network operation failed after ${maxRetries} attempts`,
              ErrorTypes.NETWORK,
              ErrorSeverity.HIGH,
              { originalError: error, attempts: maxRetries }
            );
          }
        }
      }
    });

    // API错误恢复策略
    this.addRecoveryStrategy(ErrorTypes.API, async (error, context) => {
      if (error.message.includes('timeout')) {
        // 超时错误：重试或使用备用服务
        if (context.fallbackService) {
          console.log('API timeout, switching to fallback service');
          return await context.fallbackService();
        }
      }
      
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        // 认证错误：刷新token
        if (context.refreshToken) {
          console.log('API auth error, refreshing token');
          await context.refreshToken();
          return { success: true, action: 'token_refreshed' };
        }
      }
      
      throw error; // 无法恢复的API错误
    });

    // 速率限制恢复策略
    this.addRecoveryStrategy(ErrorTypes.RATE_LIMIT, async (error, context) => {
      const waitTime = context.rateLimitWait || 60000; // 1分钟
      console.log(`Rate limit hit, waiting ${waitTime}ms before retry`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      if (context.retryFunction) {
        return await context.retryFunction();
      }
      
      return { success: true, action: 'rate_limit_waited' };
    });

    // 验证错误恢复策略
    this.addRecoveryStrategy(ErrorTypes.VALIDATION, async (error, context) => {
      if (context.sanitizeData) {
        console.log('Validation error, attempting data sanitization');
        const sanitizedData = await context.sanitizeData(context.originalData);
        
        if (context.retryWithSanitized) {
          return await context.retryWithSanitized(sanitizedData);
        }
      }
      
      throw error; // 验证错误通常不可恢复
    });
  }

  /**
   * 设置默认错误阈值
   */
  setupDefaultThresholds() {
    this.errorThresholds.set(ErrorTypes.NETWORK, { count: 10, timeWindow: 60000 }); // 1分钟10次
    this.errorThresholds.set(ErrorTypes.API, { count: 20, timeWindow: 60000 }); // 1分钟20次
    this.errorThresholds.set(ErrorTypes.DATABASE, { count: 5, timeWindow: 60000 }); // 1分钟5次
    this.errorThresholds.set(ErrorTypes.SYSTEM, { count: 3, timeWindow: 60000 }); // 1分钟3次
  }

  /**
   * 设置全局错误处理
   */
  setupGlobalErrorHandling() {
    if (typeof window !== 'undefined') {
      // 浏览器环境
      window.addEventListener('error', (event) => {
        this.handleError(new EnhancedError(
          event.error?.message || 'Uncaught error',
          ErrorTypes.SYSTEM,
          ErrorSeverity.HIGH,
          { 
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            originalError: event.error
          }
        ));
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(new EnhancedError(
          event.reason?.message || 'Unhandled promise rejection',
          ErrorTypes.SYSTEM,
          ErrorSeverity.HIGH,
          { 
            reason: event.reason,
            promise: event.promise
          }
        ));
      });
    } else if (typeof process !== 'undefined') {
      // Node.js环境
      process.on('uncaughtException', (error) => {
        this.handleError(new EnhancedError(
          error.message,
          ErrorTypes.SYSTEM,
          ErrorSeverity.CRITICAL,
          { originalError: error }
        ));
      });

      process.on('unhandledRejection', (reason, promise) => {
        this.handleError(new EnhancedError(
          reason?.message || 'Unhandled promise rejection',
          ErrorTypes.SYSTEM,
          ErrorSeverity.HIGH,
          { reason, promise }
        ));
      });
    }
  }

  /**
   * 处理错误的主要方法
   */
  async handleError(error, context = {}) {
    if (!featureFlags.isEnabled('USE_ENHANCED_ERROR_HANDLING')) {
      // 如果功能未启用，使用基本错误处理
      console.error('Error:', error);
      return { handled: false, error };
    }

    try {
      // 确保错误是EnhancedError实例
      const enhancedError = this.enhanceError(error, context);
      
      // 记录错误
      this.recordError(enhancedError);
      
      // 检查错误阈值
      const thresholdExceeded = this.checkErrorThreshold(enhancedError);
      if (thresholdExceeded) {
        console.warn(`Error threshold exceeded for type: ${enhancedError.type}`);
        this.triggerEmergencyResponse(enhancedError);
      }
      
      // 尝试恢复
      const recoveryResult = await this.attemptRecovery(enhancedError, context);
      
      // 通知监听器
      this.notifyListeners(enhancedError, recoveryResult);
      
      // 标记为已处理
      enhancedError.handled = true;
      
      return {
        handled: true,
        error: enhancedError,
        recovery: recoveryResult
      };
      
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      
      // 记录错误处理失败
      performanceMonitor.recordError('error_handler_failure', handlingError);
      
      return {
        handled: false,
        error,
        handlingError
      };
    }
  }

  /**
   * 增强普通错误对象
   */
  enhanceError(error, context = {}) {
    if (error instanceof EnhancedError) {
      return error;
    }

    // 根据错误消息和类型推断错误分类
    const type = this.classifyError(error);
    const severity = this.determineSeverity(error, type);

    return new EnhancedError(
      error.message || 'Unknown error',
      type,
      severity,
      {
        ...context,
        originalError: error,
        stack: error.stack
      }
    );
  }

  /**
   * 分类错误
   */
  classifyError(error) {
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();

    // 网络相关错误
    if (message.includes('network') || message.includes('timeout') || 
        message.includes('connection') || message.includes('fetch')) {
      return ErrorTypes.NETWORK;
    }

    // API相关错误
    if (message.includes('api') || message.includes('response') ||
        message.includes('status') || stack.includes('xhr') ||
        stack.includes('fetch')) {
      return ErrorTypes.API;
    }

    // 数据库相关错误
    if (message.includes('database') || message.includes('sql') ||
        message.includes('query') || message.includes('connection pool')) {
      return ErrorTypes.DATABASE;
    }

    // 认证相关错误
    if (message.includes('auth') || message.includes('unauthorized') ||
        message.includes('forbidden') || message.includes('token')) {
      return ErrorTypes.AUTHENTICATION;
    }

    // 权限相关错误
    if (message.includes('permission') || message.includes('access denied') ||
        message.includes('forbidden')) {
      return ErrorTypes.PERMISSION;
    }

    // 验证相关错误
    if (message.includes('validation') || message.includes('invalid') ||
        message.includes('required') || message.includes('format')) {
      return ErrorTypes.VALIDATION;
    }

    // 速率限制错误
    if (message.includes('rate limit') || message.includes('too many requests') ||
        message.includes('quota exceeded')) {
      return ErrorTypes.RATE_LIMIT;
    }

    return ErrorTypes.UNKNOWN;
  }

  /**
   * 确定错误严重程度
   */
  determineSeverity(error, type) {
    const message = (error.message || '').toLowerCase();

    // 关键词表示高严重程度
    const criticalKeywords = ['critical', 'fatal', 'crash', 'corruption'];
    const highKeywords = ['error', 'fail', 'exception', 'abort'];
    const mediumKeywords = ['warning', 'invalid', 'missing'];

    if (criticalKeywords.some(keyword => message.includes(keyword))) {
      return ErrorSeverity.CRITICAL;
    }

    if (highKeywords.some(keyword => message.includes(keyword))) {
      return ErrorSeverity.HIGH;
    }

    if (mediumKeywords.some(keyword => message.includes(keyword))) {
      return ErrorSeverity.MEDIUM;
    }

    // 根据错误类型设置默认严重程度
    const typeSeverityMap = {
      [ErrorTypes.SYSTEM]: ErrorSeverity.CRITICAL,
      [ErrorTypes.DATABASE]: ErrorSeverity.HIGH,
      [ErrorTypes.AUTHENTICATION]: ErrorSeverity.HIGH,
      [ErrorTypes.NETWORK]: ErrorSeverity.MEDIUM,
      [ErrorTypes.API]: ErrorSeverity.MEDIUM,
      [ErrorTypes.VALIDATION]: ErrorSeverity.LOW
    };

    return typeSeverityMap[type] || ErrorSeverity.MEDIUM;
  }

  /**
   * 记录错误
   */
  recordError(error) {
    // 添加到历史记录
    this.errorHistory.push(error);
    
    // 保持最近1000个错误
    if (this.errorHistory.length > 1000) {
      this.errorHistory.shift();
    }

    // 记录到性能监控
    performanceMonitor.record('error.count', 1, {
      type: error.type,
      severity: error.severity
    });

    // 记录到控制台
    const logLevel = this.getLogLevel(error.severity);
    console[logLevel](`[ERROR-${error.id}] ${error.type.toUpperCase()}: ${error.message}`, {
      severity: error.severity,
      context: error.context,
      timestamp: error.timestamp
    });
  }

  /**
   * 获取日志级别
   */
  getLogLevel(severity) {
    const levelMap = {
      [ErrorSeverity.LOW]: 'log',
      [ErrorSeverity.MEDIUM]: 'warn',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.CRITICAL]: 'error'
    };
    return levelMap[severity] || 'error';
  }

  /**
   * 检查错误阈值
   */
  checkErrorThreshold(error) {
    const threshold = this.errorThresholds.get(error.type);
    if (!threshold) return false;

    const timeWindow = threshold.timeWindow;
    const maxCount = threshold.count;
    const now = Date.now();

    // 统计时间窗口内同类型错误数量
    const recentErrors = this.errorHistory.filter(e => 
      e.type === error.type && 
      (now - e.timestamp.getTime()) <= timeWindow
    );

    return recentErrors.length >= maxCount;
  }

  /**
   * 触发紧急响应
   */
  async triggerEmergencyResponse(error) {
    console.warn(`🚨 Emergency response triggered for error type: ${error.type}`);

    // 触发自动回滚
    if (error.severity === ErrorSeverity.CRITICAL) {
      try {
        await autoRollback.triggerAutoRollback(
          `Critical error threshold exceeded: ${error.type}`,
          { error: error.toJSON() }
        );
      } catch (rollbackError) {
        console.error('Failed to trigger auto rollback:', rollbackError);
      }
    }

    // 禁用可能有问题的功能
    this.disableProblematicFeatures(error);
  }

  /**
   * 禁用有问题的功能
   */
  disableProblematicFeatures(error) {
    const featuresToDisable = {
      [ErrorTypes.API]: ['USE_NEW_API_CLIENT', 'USE_ADVANCED_CACHING'],
      [ErrorTypes.DATABASE]: ['USE_CONNECTION_POOLING', 'USE_QUERY_OPTIMIZATION'],
      [ErrorTypes.NETWORK]: ['USE_PARALLEL_REQUESTS', 'USE_REQUEST_BATCHING']
    };

    const features = featuresToDisable[error.type] || [];
    features.forEach(feature => {
      if (featureFlags.isEnabled(feature)) {
        console.warn(`Disabling feature due to errors: ${feature}`);
        featureFlags.disable(feature);
      }
    });
  }

  /**
   * 尝试恢复
   */
  async attemptRecovery(error, context) {
    if (!error.retryable) {
      return { attempted: false, reason: 'Error not retryable' };
    }

    const strategy = this.recoveryStrategies.get(error.type);
    if (!strategy) {
      return { attempted: false, reason: 'No recovery strategy available' };
    }

    try {
      console.log(`Attempting recovery for error type: ${error.type}`);
      const result = await strategy(error, context);
      
      console.log(`Recovery successful for error: ${error.id}`);
      performanceMonitor.record('error.recovery_success', 1, { type: error.type });
      
      return {
        attempted: true,
        success: true,
        result
      };
      
    } catch (recoveryError) {
      console.error(`Recovery failed for error: ${error.id}`, recoveryError);
      performanceMonitor.record('error.recovery_failure', 1, { type: error.type });
      
      return {
        attempted: true,
        success: false,
        error: recoveryError
      };
    }
  }

  /**
   * 添加恢复策略
   */
  addRecoveryStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * 添加错误监听器
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    // 返回移除监听器的函数
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 通知监听器
   */
  notifyListeners(error, recoveryResult) {
    this.listeners.forEach(callback => {
      try {
        callback(error, recoveryResult);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * 获取错误统计
   */
  getErrorStats(timeWindow = 3600000) { // 1小时
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(e => 
      (now - e.timestamp.getTime()) <= timeWindow
    );

    const stats = {
      total: recentErrors.length,
      byType: {},
      bySeverity: {},
      recoveryRate: 0
    };

    // 按类型统计
    recentErrors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    // 计算恢复率
    const handledErrors = recentErrors.filter(e => e.handled);
    if (recentErrors.length > 0) {
      stats.recoveryRate = (handledErrors.length / recentErrors.length) * 100;
    }

    return stats;
  }

  /**
   * 创建错误包装器函数
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const handlingResult = await this.handleError(error, {
          ...context,
          functionName: fn.name,
          arguments: args
        });
        
        if (handlingResult.recovery?.success) {
          return handlingResult.recovery.result;
        }
        
        throw handlingResult.error;
      }
    };
  }

  /**
   * 清理历史错误
   */
  cleanup(maxAge = 86400000) { // 24小时
    const cutoff = Date.now() - maxAge;
    this.errorHistory = this.errorHistory.filter(e => 
      e.timestamp.getTime() > cutoff
    );
  }
}

// 创建全局实例
const enhancedErrorHandler = new EnhancedErrorHandler();

// 工具函数
export function handleError(error, context = {}) {
  return enhancedErrorHandler.handleError(error, context);
}

export function wrapWithErrorHandler(fn, context = {}) {
  return enhancedErrorHandler.wrap(fn, context);
}

export function createError(message, type, severity, context) {
  return new EnhancedError(message, type, severity, context);
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EnhancedErrorHandler,
    EnhancedError,
    ErrorTypes,
    ErrorSeverity,
    enhancedErrorHandler,
    handleError,
    wrapWithErrorHandler,
    createError
  };
}

export {
  EnhancedErrorHandler,
  enhancedErrorHandler
};