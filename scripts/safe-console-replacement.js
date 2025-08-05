/**
 * 安全的console替换方案 - 只添加Logger包装，不删除原有console
 * 这样可以保证现有功能不受影响
 */

const fs = require('fs');
const path = require('path');

// 创建一个全局Logger代理，确保兼容性
const loggerProxyCode = `
// Logger代理 - 保持向后兼容
if (typeof window !== 'undefined' && !window.console._isProxied) {
  const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };
  
  // 在开发环境保留console输出
  if (window.location.hostname === 'localhost' || window.DEBUG) {
    console.log = function(...args) {
      originalConsole.log(...args);
      // 未来可以添加日志收集
    };
    console.error = function(...args) {
      originalConsole.error(...args);
      // 未来可以添加错误上报
    };
    console.warn = function(...args) {
      originalConsole.warn(...args);
      // 未来可以添加警告收集
    };
  }
  
  console._isProxied = true;
}
`;

// 只在入口文件添加Logger代理
function addLoggerProxy() {
  const entryFiles = [
    'index.html',
    '_app/bootstrap.js'
  ];
  
  entryFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (file.endsWith('.html')) {
        // 在第一个script标签后添加
        if (!content.includes('Logger代理')) {
          const scriptIndex = content.indexOf('<script');
          if (scriptIndex !== -1) {
            const insertIndex = content.indexOf('>', scriptIndex) + 1;
            const newContent = content.slice(0, insertIndex) + 
              '\n// Logger代理 - 保持向后兼容\n' + loggerProxyCode + 
              content.slice(insertIndex);
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`✅ Added logger proxy to ${file}`);
          }
        }
      } else if (file.endsWith('.js')) {
        // 在文件开头添加
        if (!content.includes('Logger代理')) {
          const newContent = loggerProxyCode + '\n' + content;
          fs.writeFileSync(file, newContent, 'utf8');
          console.log(`✅ Added logger proxy to ${file}`);
        }
      }
    }
  });
}

// 生成迁移计划而不是直接修改
function generateMigrationPlan() {
  const report = `# Console到Logger迁移计划

## 当前状态
- 发现407个console语句
- 分布在34个文件中
- 主要集中在：router.js (60个), app.js (42个), unified-config.js (53个)

## 安全迁移策略

### 第一阶段：监控和收集（不修改代码）
1. 在入口文件添加console代理
2. 收集所有console调用的统计信息
3. 在生产环境自动禁用console输出
4. 保持所有现有功能不变

### 第二阶段：渐进式替换（2-4周后）
1. 先替换新增代码中的console
2. 对每个模块单独测试后再替换
3. 保留关键调试信息
4. 添加日志级别控制

### 第三阶段：完全迁移（经过充分测试后）
1. 使用Logger完全替代console
2. 添加日志持久化
3. 实现日志分析功能

## 立即可以做的安全改进

1. **添加日志级别控制**
   \`\`\`javascript
   // 在生产环境自动禁用debug日志
   if (process.env.NODE_ENV === 'production') {
     console.debug = () => {};
   }
   \`\`\`

2. **添加错误收集**
   \`\`\`javascript
   window.addEventListener('error', (event) => {
     // 收集错误信息但不影响原有行为
     if (window.errorCollector) {
       window.errorCollector.collect(event);
     }
   });
   \`\`\`

3. **性能监控**
   - 使用Performance API
   - 不修改现有代码
   - 只添加监控层

## 风险评估
- 直接替换console：高风险，可能破坏现有功能
- 添加代理层：低风险，完全向后兼容
- 渐进式迁移：最安全，可控可回滚

## 建议
1. 先运行监控1-2周，收集数据
2. 根据实际使用情况制定详细替换计划
3. 每次只替换一个模块，充分测试
4. 保持紧急回滚方案
`;

  fs.writeFileSync('CONSOLE_MIGRATION_PLAN.md', report, 'utf8');
  console.log('✅ 生成迁移计划: CONSOLE_MIGRATION_PLAN.md');
}

// 创建一个简单的日志统计工具
function createLogStats() {
  const statsCode = `
// 日志统计工具 - 不影响现有功能
window.logStats = {
  counts: {
    log: 0,
    error: 0,
    warn: 0,
    info: 0,
    debug: 0
  },
  
  init() {
    const methods = ['log', 'error', 'warn', 'info', 'debug'];
    methods.forEach(method => {
      const original = console[method];
      console[method] = function(...args) {
        window.logStats.counts[method]++;
        return original.apply(console, args);
      };
    });
  },
  
  report() {
    console.table(this.counts);
    const total = Object.values(this.counts).reduce((a, b) => a + b, 0);
    console.log(\`Total console calls: \${total}\`);
  }
};

// 自动初始化（仅开发环境）
if (window.location.hostname === 'localhost') {
  window.logStats.init();
}
`;

  fs.writeFileSync('_utils/log-stats.js', statsCode, 'utf8');
  console.log('✅ 创建日志统计工具: _utils/log-stats.js');
}

// 执行安全的改进
console.log('🔒 执行安全的console改进方案...\n');

// 1. 生成迁移计划
generateMigrationPlan();

// 2. 创建日志统计工具
createLogStats();

// 3. 添加Logger代理（可选）
console.log('\n是否要添加Logger代理？这是完全安全的，不会影响现有功能。');
console.log('如果需要添加，请手动执行: addLoggerProxy()');

// 导出函数供手动调用
module.exports = { addLoggerProxy };