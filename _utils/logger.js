/**
 * 统一日志服务
 * 替代console.log，提供更专业的日志管理
 */

export class Logger {
  constructor(module = 'app') {
    this.module = module;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    // 从环境变量或配置获取日志级别
    this.currentLevel = this.levels[this.getLogLevel()] || this.levels.info;
    
    // 日志输出目标
    this.outputs = this.getLogOutputs();
    
    // 日志格式化选项
    this.options = {
      timestamp: true,
      module: true,
      colorize: this.supportsColor()
    };
  }

  /**
   * 获取日志级别配置
   */
  getLogLevel() {
    // 在生产环境默认使用 warn 级别
    if (typeof window !== 'undefined') {
      return window.LOG_LEVEL || (window.location.hostname === 'localhost' ? 'debug' : 'warn');
    }
    return process.env.LOG_LEVEL || 'info';
  }

  /**
   * 获取日志输出配置
   */
  getLogOutputs() {
    const outputs = [];
    
    // 控制台输出
    if (this.shouldLogToConsole()) {
      outputs.push(this.consoleOutput.bind(this));
    }
    
    // 远程日志服务（生产环境）
    if (this.shouldLogToRemote()) {
      outputs.push(this.remoteOutput.bind(this));
    }
    
    // 本地存储（用于调试）
    if (this.shouldLogToStorage()) {
      outputs.push(this.storageOutput.bind(this));
    }
    
    return outputs;
  }

  /**
   * 检查是否支持彩色输出
   */
  supportsColor() {
    if (typeof window !== 'undefined') {
      return true; // 浏览器控制台支持彩色
    }
    return process.stdout.isTTY;
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, ...args) {
    const parts = [];
    
    // 时间戳
    if (this.options.timestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }
    
    // 日志级别
    parts.push(`[${level.toUpperCase()}]`);
    
    // 模块名
    if (this.options.module) {
      parts.push(`[${this.module}]`);
    }
    
    // 消息内容
    parts.push(message);
    
    // 额外参数
    if (args.length > 0) {
      parts.push(...args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      ));
    }
    
    return parts.join(' ');
  }

  /**
   * 获取级别对应的颜色
   */
  getLevelColor(level) {
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m'  // red
    };
    return colors[level] || '';
  }

  /**
   * 控制台输出
   */
  consoleOutput(level, formattedMessage) {
    const consoleMethods = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error
    };
    
    const method = consoleMethods[level] || console.log;
    
    if (this.options.colorize && typeof window === 'undefined') {
      // Node.js 环境彩色输出
      const color = this.getLevelColor(level);
      const reset = '\x1b[0m';
      method.call(console, `${color}${formattedMessage}${reset}`);
    } else if (typeof window !== 'undefined') {
      // 浏览器环境样式输出
      const styles = {
        debug: 'color: #00bcd4',
        info: 'color: #4caf50',
        warn: 'color: #ff9800',
        error: 'color: #f44336'
      };
      method.call(console, `%c${formattedMessage}`, styles[level] || '');
    } else {
      method.call(console, formattedMessage);
    }
  }

  /**
   * 远程日志输出（用于生产环境）
   */
  async remoteOutput(level, formattedMessage) {
    // 仅在生产环境且是警告或错误时发送
    if (level === 'warn' || level === 'error') {
      try {
        // TODO: 实现远程日志API调用
        // await fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     level,
        //     message: formattedMessage,
        //     module: this.module,
        //     timestamp: new Date().toISOString()
        //   })
        // });
      } catch (error) {
        // 远程日志失败不应影响应用运行
      }
    }
  }

  /**
   * 本地存储输出（用于调试）
   */
  storageOutput(level, formattedMessage) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
        logs.push({
          level,
          message: formattedMessage,
          timestamp: new Date().toISOString()
        });
        
        // 只保留最近的100条日志
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('app_logs', JSON.stringify(logs));
      } catch (error) {
        // 存储失败不应影响应用运行
      }
    }
  }

  /**
   * 判断是否应该输出到控制台
   */
  shouldLogToConsole() {
    // 开发环境总是输出到控制台
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' || window.DEBUG;
    }
    return process.env.NODE_ENV !== 'production' || process.env.LOG_TO_CONSOLE === 'true';
  }

  /**
   * 判断是否应该输出到远程
   */
  shouldLogToRemote() {
    if (typeof window !== 'undefined') {
      return window.location.hostname !== 'localhost' && !window.DEBUG;
    }
    return process.env.NODE_ENV === 'production';
  }

  /**
   * 判断是否应该输出到本地存储
   */
  shouldLogToStorage() {
    if (typeof window !== 'undefined') {
      return window.localStorage && (window.DEBUG || window.LOG_TO_STORAGE);
    }
    return false;
  }

  /**
   * 通用日志方法
   */
  log(level, message, ...args) {
    // 检查日志级别
    if (this.levels[level] < this.currentLevel) {
      return;
    }
    
    // 格式化消息
    const formattedMessage = this.formatMessage(level, message, ...args);
    
    // 输出到所有配置的目标
    this.outputs.forEach(output => {
      output(level, formattedMessage);
    });
  }

  /**
   * Debug级别日志
   */
  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  /**
   * Info级别日志
   */
  info(message, ...args) {
    this.log('info', message, ...args);
  }

  /**
   * Warning级别日志
   */
  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  /**
   * Error级别日志
   */
  error(message, ...args) {
    this.log('error', message, ...args);
  }

  /**
   * 创建子logger
   */
  child(subModule) {
    return new Logger(`${this.module}:${subModule}`);
  }

  /**
   * 性能计时开始
   */
  time(label) {
    if (typeof window !== 'undefined') {
      console.time(label);
    } else {
      this.timers = this.timers || {};
      this.timers[label] = process.hrtime();
    }
  }

  /**
   * 性能计时结束
   */
  timeEnd(label) {
    if (typeof window !== 'undefined') {
      console.timeEnd(label);
    } else if (this.timers && this.timers[label]) {
      const elapsed = process.hrtime(this.timers[label]);
      const ms = elapsed[0] * 1000 + elapsed[1] / 1000000;
      this.debug(`${label}: ${ms.toFixed(3)}ms`);
      delete this.timers[label];
    }
  }

  /**
   * 断言
   */
  assert(condition, message) {
    if (!condition) {
      this.error(`Assertion failed: ${message}`);
      if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
        throw new Error(`Assertion failed: ${message}`);
      }
    }
  }

  /**
   * 表格输出（仅开发环境）
   */
  table(data) {
    if (this.currentLevel <= this.levels.debug) {
      console.table(data);
    }
  }

  /**
   * 分组开始
   */
  group(label) {
    if (this.currentLevel <= this.levels.debug && console.group) {
      console.group(label);
    }
  }

  /**
   * 分组结束
   */
  groupEnd() {
    if (this.currentLevel <= this.levels.debug && console.groupEnd) {
      console.groupEnd();
    }
  }

  /**
   * 获取所有存储的日志（用于调试）
   */
  static getLogs() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return JSON.parse(localStorage.getItem('app_logs') || '[]');
      } catch (error) {
        return [];
      }
    }
    return [];
  }

  /**
   * 清除所有存储的日志
   */
  static clearLogs() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('app_logs');
    }
  }

  /**
   * 导出日志（用于调试报告）
   */
  static exportLogs() {
    const logs = Logger.getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 创建默认logger实例
export const logger = new Logger('default');

// 导出便捷方法
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);