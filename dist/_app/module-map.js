/**
 * 模块映射配置 - 确保使用正确的模块
 * 防止引用冗余文件
 */

export const MODULE_MAP = {
  // 认证模块 - 只使用auth-v3.js
  auth: {
    correct: '_core/auth-v3.js',
    forbidden: [
      '_core/auth-old.js',      // ❌ 禁止使用
      '_core/auth-config.js'    // ❌ 禁止使用
    ]
  },
  
  // 负载均衡模块 - 只使用_app/modules中的版本
  loadBalance: {
    correct: '_app/modules/load-balance.js',
    forbidden: [
      '_pages/ai-service/load-balance.js',          // ❌ 禁止使用
      '_pages/ai-service/load-balance-enhanced.js', // ❌ 禁止使用
      '_pages/ai-service/load-balancing.js'         // ❌ 禁止使用
    ]
  },
  
  // 成本分析模块 - 只使用_app/modules中的版本
  costAnalysis: {
    correct: '_app/modules/cost-analysis.js',
    forbidden: [
      '_pages/ai-service/cost-analysis.js'  // ❌ 禁止使用
    ]
  },
  
  // 统一配置模块 - 只使用_app/modules中的版本
  unifiedConfig: {
    correct: '_app/modules/unified-config.js',
    forbidden: [
      '_pages/ai-service/unified-config.js'  // ❌ 禁止使用
    ]
  },
  
  // HTML页面 - 只使用这两个
  htmlPages: {
    correct: [
      'index.html',
      'login.html'
    ],
    forbidden: [
      'test.html',        // ❌ 禁止访问
      'index-test.html',  // ❌ 禁止访问
      'admin.html',       // ❌ 禁止访问
      'standalone.html'   // ❌ 禁止访问
    ]
  }
};

/**
 * 验证模块路径是否允许使用
 */
export function isModuleAllowed(modulePath) {
  for (const [key, config] of Object.entries(MODULE_MAP)) {
    if (config.forbidden && config.forbidden.includes(modulePath)) {
      console.error(`❌ 禁止使用冗余模块: ${modulePath}`);
      console.error(`✅ 请使用: ${config.correct}`);
      return false;
    }
  }
  return true;
}

/**
 * 获取正确的模块路径
 */
export function getCorrectModule(type) {
  return MODULE_MAP[type]?.correct || null;
}