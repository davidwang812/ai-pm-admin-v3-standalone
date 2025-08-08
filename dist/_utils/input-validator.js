/**
 * Input Validator - 输入验证和清理工具
 * 提供全面的数据验证和清理功能，防止XSS和注入攻击
 */

export class InputValidator {
  constructor() {
    // 预编译的正则表达式
    this.patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^1[3-9]\d{9}$/,
      username: /^[a-zA-Z0-9_-]{3,20}$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
      url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      numeric: /^\d+$/,
      decimal: /^\d+(\.\d{1,2})?$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      date: /^\d{4}-\d{2}-\d{2}$/,
      time: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    };

    // XSS危险模式
    this.xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi
    ];

    // SQL注入危险模式
    this.sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(-{2}|\/\*|\*\/)/g,
      /(;|\||&&)/g
    ];
  }

  /**
   * 验证邮箱
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return this.patterns.email.test(email.trim());
  }

  /**
   * 验证手机号（中国）
   */
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    return this.patterns.phone.test(phone.trim());
  }

  /**
   * 验证用户名
   */
  validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    return this.patterns.username.test(username.trim());
  }

  /**
   * 验证密码强度
   */
  validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    
    const result = {
      valid: false,
      strength: 'weak',
      messages: []
    };

    // 基本长度检查
    if (password.length < 8) {
      result.messages.push('密码至少需要8个字符');
    }

    // 复杂度检查
    if (!/[a-z]/.test(password)) {
      result.messages.push('密码需要包含小写字母');
    }
    if (!/[A-Z]/.test(password)) {
      result.messages.push('密码需要包含大写字母');
    }
    if (!/\d/.test(password)) {
      result.messages.push('密码需要包含数字');
    }

    // 计算强度
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;

    if (strength <= 2) result.strength = 'weak';
    else if (strength <= 4) result.strength = 'medium';
    else result.strength = 'strong';

    result.valid = result.messages.length === 0;
    return result;
  }

  /**
   * 验证URL
   */
  validateURL(url) {
    if (!url || typeof url !== 'string') return false;
    return this.patterns.url.test(url.trim());
  }

  /**
   * 验证IP地址
   */
  validateIP(ip) {
    if (!ip || typeof ip !== 'string') return false;
    return this.patterns.ipv4.test(ip.trim());
  }

  /**
   * 验证数字
   */
  validateNumber(value, options = {}) {
    const num = Number(value);
    if (isNaN(num)) return false;

    if (options.min !== undefined && num < options.min) return false;
    if (options.max !== undefined && num > options.max) return false;
    if (options.integer && !Number.isInteger(num)) return false;

    return true;
  }

  /**
   * 验证日期
   */
  validateDate(date) {
    if (!date) return false;
    
    // 支持多种格式
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }

  /**
   * 验证必填字段
   */
  validateRequired(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  /**
   * 验证字符串长度
   */
  validateLength(value, min, max) {
    if (typeof value !== 'string') return false;
    const len = value.trim().length;
    if (min !== undefined && len < min) return false;
    if (max !== undefined && len > max) return false;
    return true;
  }

  /**
   * 清理XSS
   */
  sanitizeXSS(input) {
    if (typeof input !== 'string') return input;

    let sanitized = input;

    // 移除危险标签和属性
    this.xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // HTML实体编码
    sanitized = this.escapeHtml(sanitized);

    return sanitized;
  }

  /**
   * 清理SQL注入
   */
  sanitizeSQL(input) {
    if (typeof input !== 'string') return input;

    let sanitized = input;

    // 移除危险SQL模式
    this.sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // 转义单引号
    sanitized = sanitized.replace(/'/g, "''");

    return sanitized;
  }

  /**
   * HTML实体编码
   */
  escapeHtml(str) {
    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };

    return str.replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
  }

  /**
   * 清理输入值
   */
  sanitizeInput(input, type = 'text') {
    if (!input) return '';

    switch (type) {
      case 'email':
        return input.toLowerCase().trim();
      
      case 'phone':
        return input.replace(/\D/g, '');
      
      case 'number':
        return input.replace(/[^\d.-]/g, '');
      
      case 'alphanumeric':
        return input.replace(/[^a-zA-Z0-9]/g, '');
      
      case 'username':
        return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
      
      case 'url':
        return input.trim();
      
      case 'text':
      default:
        return this.sanitizeXSS(input.trim());
    }
  }

  /**
   * 验证文件类型
   */
  validateFileType(file, allowedTypes) {
    if (!file || !file.type) return false;
    
    // 支持MIME类型或扩展名
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    return allowedTypes.some(type => {
      if (type.includes('/')) {
        // MIME类型
        return fileType === type || fileType.startsWith(type.replace('*', ''));
      } else {
        // 扩展名
        return fileName.endsWith('.' + type);
      }
    });
  }

  /**
   * 验证文件大小
   */
  validateFileSize(file, maxSize) {
    if (!file || !file.size) return false;
    return file.size <= maxSize;
  }

  /**
   * 批量验证
   */
  validateForm(data, rules) {
    const errors = {};
    let isValid = true;

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = data[field];
      const fieldErrors = [];

      // 必填检查
      if (fieldRules.required && !this.validateRequired(value)) {
        fieldErrors.push(`${fieldRules.label || field}是必填项`);
      }

      // 类型检查
      if (value && fieldRules.type) {
        switch (fieldRules.type) {
          case 'email':
            if (!this.validateEmail(value)) {
              fieldErrors.push('请输入有效的邮箱地址');
            }
            break;
          
          case 'phone':
            if (!this.validatePhone(value)) {
              fieldErrors.push('请输入有效的手机号');
            }
            break;
          
          case 'username':
            if (!this.validateUsername(value)) {
              fieldErrors.push('用户名只能包含字母、数字、下划线和横线，长度3-20');
            }
            break;
          
          case 'password':
            const passwordResult = this.validatePassword(value);
            if (!passwordResult.valid) {
              fieldErrors.push(...passwordResult.messages);
            }
            break;
          
          case 'number':
            if (!this.validateNumber(value, fieldRules)) {
              fieldErrors.push('请输入有效的数字');
            }
            break;
          
          case 'url':
            if (!this.validateURL(value)) {
              fieldErrors.push('请输入有效的URL');
            }
            break;
        }
      }

      // 长度检查
      if (value && (fieldRules.minLength || fieldRules.maxLength)) {
        if (!this.validateLength(value, fieldRules.minLength, fieldRules.maxLength)) {
          if (fieldRules.minLength && fieldRules.maxLength) {
            fieldErrors.push(`长度应在${fieldRules.minLength}-${fieldRules.maxLength}之间`);
          } else if (fieldRules.minLength) {
            fieldErrors.push(`长度至少${fieldRules.minLength}个字符`);
          } else {
            fieldErrors.push(`长度不超过${fieldRules.maxLength}个字符`);
          }
        }
      }

      // 自定义验证
      if (value && fieldRules.custom) {
        const customResult = fieldRules.custom(value, data);
        if (customResult !== true) {
          fieldErrors.push(customResult || '验证失败');
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        isValid = false;
      }
    }

    return { isValid, errors };
  }

  /**
   * 清理表单数据
   */
  sanitizeFormData(data, schema) {
    const sanitized = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      if (value !== undefined && value !== null) {
        sanitized[field] = this.sanitizeInput(value, rules.type || 'text');
      }
    }

    return sanitized;
  }
}

// 创建单例
const validator = new InputValidator();

// 导出实例
export default validator;