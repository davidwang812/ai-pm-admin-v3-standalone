/**
 * 查找并统计所有console语句
 */

const fs = require('fs');
const path = require('path');

// 统计结果
const results = {
  total: 0,
  byFile: {},
  byType: {
    log: 0,
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    other: 0
  }
};

// 要扫描的目录
const scanDirs = ['_app', '_core', '_pages', '_utils'];

// 忽略的文件
const ignorePatterns = [
  /\.test\.js$/,
  /\.spec\.js$/,
  /node_modules/,
  /__tests__/,
  /logger\.js$/ // 忽略logger本身
];

// 检查文件是否应该被忽略
function shouldIgnore(filePath) {
  return ignorePatterns.some(pattern => pattern.test(filePath));
}

// 扫描文件
function scanFile(filePath) {
  if (shouldIgnore(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileName = path.relative(process.cwd(), filePath);
    
    const matches = [];
    
    lines.forEach((line, index) => {
      // 匹配console.xxx
      const consoleRegex = /console\.(log|error|warn|info|debug|trace|table|group|groupEnd|time|timeEnd|assert|clear|count|dir|dirxml|profile|profileEnd)\s*\(/g;
      let match;
      
      while ((match = consoleRegex.exec(line)) !== null) {
        const type = match[1];
        matches.push({
          line: index + 1,
          type,
          content: line.trim()
        });
        
        results.total++;
        results.byType[type] = (results.byType[type] || 0) + 1;
      }
    });
    
    if (matches.length > 0) {
      results.byFile[fileName] = matches;
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
}

// 递归扫描目录
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !shouldIgnore(filePath)) {
      scanDirectory(filePath);
    } else if (stat.isFile() && filePath.endsWith('.js')) {
      scanFile(filePath);
    }
  });
}

// 生成报告
function generateReport() {
  console.log('📊 Console语句扫描报告\n');
  console.log('='.repeat(60));
  
  console.log(`\n总计: ${results.total} 个console语句\n`);
  
  console.log('按类型统计:');
  Object.entries(results.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  console.${type}: ${count}`);
    }
  });
  
  console.log('\n按文件统计:');
  Object.entries(results.byFile).forEach(([file, matches]) => {
    console.log(`\n${file} (${matches.length}个):`);
    matches.forEach(match => {
      console.log(`  第${match.line}行: console.${match.type}`);
      console.log(`    ${match.content}`);
    });
  });
  
  // 生成替换建议
  console.log('\n\n替换建议:');
  console.log('1. 导入Logger: import { Logger } from \'../_utils/logger.js\';');
  console.log('2. 创建logger实例: this.logger = new Logger(\'ModuleName\');');
  console.log('3. 替换映射:');
  console.log('   console.log -> logger.info');
  console.log('   console.error -> logger.error');
  console.log('   console.warn -> logger.warn');
  console.log('   console.debug -> logger.debug');
  console.log('   console.info -> logger.info');
  
  // 保存详细报告
  const reportPath = path.join(__dirname, '..', 'CONSOLE_LOGS_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 详细报告已保存至: ${reportPath}`);
}

// 执行扫描
console.log('🔍 开始扫描console语句...\n');

scanDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`扫描目录: ${dir}`);
    scanDirectory(dir);
  }
});

// 生成报告
generateReport();