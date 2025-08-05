/**
 * 批量替换console语句为Logger
 */

const fs = require('fs');
const path = require('path');

// 替换规则
const replacementRules = {
  'console.log': 'logger.info',
  'console.error': 'logger.error',
  'console.warn': 'logger.warn',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug'
};

// 要处理的目录
const scanDirs = ['_app', '_core', '_pages'];

// 忽略的文件
const ignorePatterns = [
  /\.test\.js$/,
  /\.spec\.js$/,
  /node_modules/,
  /__tests__/,
  /logger\.js$/ // 忽略logger本身
];

// 统计信息
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalReplacements: 0,
  byFile: {}
};

// 检查文件是否应该被忽略
function shouldIgnore(filePath) {
  return ignorePatterns.some(pattern => pattern.test(filePath));
}

// 检查是否需要导入Logger
function needsLoggerImport(content) {
  // 检查是否已经导入了Logger
  const hasLoggerImport = /import\s+.*Logger.*from\s+['"].*logger/i.test(content);
  // 检查是否有console语句
  const hasConsole = /console\.(log|error|warn|info|debug)\s*\(/g.test(content);
  
  return hasConsole && !hasLoggerImport;
}

// 添加Logger导入
function addLoggerImport(content, filePath) {
  // 计算相对路径
  const relativePath = path.relative(path.dirname(filePath), path.join(process.cwd(), '_utils/logger.js'));
  const importPath = relativePath.replace(/\\/g, '/');
  
  const importStatement = `import { Logger } from '${importPath}';\n`;
  
  // 查找第一个import语句的位置
  const importMatch = content.match(/^import\s+/m);
  if (importMatch) {
    // 在第一个import之前添加
    const index = content.indexOf(importMatch[0]);
    return content.slice(0, index) + importStatement + content.slice(index);
  }
  
  // 如果没有import语句，在文件开头添加（跳过注释）
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // 跳过开头的注释
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && line !== '') {
      insertIndex = i;
      break;
    }
  }
  
  lines.splice(insertIndex, 0, '', importStatement);
  return lines.join('\n');
}

// 检查是否需要创建logger实例
function needsLoggerInstance(content, className) {
  // 检查是否已经有logger实例
  const hasLoggerInstance = /this\.logger\s*=\s*new\s+Logger/i.test(content);
  const hasConsoleInClass = /console\.(log|error|warn|info|debug)\s*\(/g.test(content);
  
  return hasConsoleInClass && !hasLoggerInstance;
}

// 添加logger实例到类
function addLoggerInstance(content, className) {
  // 查找构造函数
  const constructorRegex = new RegExp(`constructor\\s*\\([^)]*\\)\\s*\\{`);
  const match = content.match(constructorRegex);
  
  if (match) {
    const index = content.indexOf(match[0]) + match[0].length;
    const indent = '    ';
    const loggerInit = `\n${indent}// 创建logger实例\n${indent}this.logger = new Logger('${className}');\n`;
    
    return content.slice(0, index) + loggerInit + content.slice(index);
  }
  
  return content;
}

// 替换console语句
function replaceConsoleStatements(content, filePath) {
  let modifiedContent = content;
  let replacementCount = 0;
  
  // 检测主要的类名或模块名
  let moduleName = 'Module';
  const classMatch = content.match(/class\s+(\w+)/);
  const exportMatch = content.match(/export\s+(?:default\s+)?(?:class\s+)?(\w+)/);
  
  if (classMatch) {
    moduleName = classMatch[1];
  } else if (exportMatch) {
    moduleName = exportMatch[1];
  } else {
    // 使用文件名作为模块名
    moduleName = path.basename(filePath, '.js');
  }
  
  // 检查是否需要导入Logger
  if (needsLoggerImport(modifiedContent)) {
    modifiedContent = addLoggerImport(modifiedContent, filePath);
    console.log(`✅ Added Logger import to ${filePath}`);
  }
  
  // 对于类，检查是否需要添加logger实例
  if (classMatch && needsLoggerInstance(modifiedContent, moduleName)) {
    modifiedContent = addLoggerInstance(modifiedContent, moduleName);
    console.log(`✅ Added logger instance to ${moduleName} class`);
  }
  
  // 对于非类文件，在顶部创建logger实例
  if (!classMatch && /console\.(log|error|warn|info|debug)\s*\(/g.test(modifiedContent)) {
    // 检查是否已经有logger实例
    if (!/const\s+logger\s*=\s*new\s+Logger/i.test(modifiedContent)) {
      // 在import语句后添加logger实例
      const importEndMatch = modifiedContent.match(/^import[^;]+;/gm);
      if (importEndMatch) {
        const lastImportIndex = modifiedContent.lastIndexOf(importEndMatch[importEndMatch.length - 1]);
        const insertIndex = lastImportIndex + importEndMatch[importEndMatch.length - 1].length;
        const loggerInit = `\n\n// 创建logger实例\nconst logger = new Logger('${moduleName}');`;
        modifiedContent = modifiedContent.slice(0, insertIndex) + loggerInit + modifiedContent.slice(insertIndex);
      }
    }
  }
  
  // 替换console语句
  Object.entries(replacementRules).forEach(([oldStatement, newStatement]) => {
    const regex = new RegExp(oldStatement.replace('.', '\\.'), 'g');
    const matches = modifiedContent.match(regex) || [];
    replacementCount += matches.length;
    
    // 对于类方法中的console，替换为this.logger
    if (classMatch) {
      modifiedContent = modifiedContent.replace(regex, `this.${newStatement}`);
    } else {
      // 对于普通函数，使用logger
      modifiedContent = modifiedContent.replace(regex, newStatement);
    }
  });
  
  return { modifiedContent, replacementCount };
}

// 处理文件
function processFile(filePath) {
  if (shouldIgnore(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { modifiedContent, replacementCount } = replaceConsoleStatements(content, filePath);
    
    if (replacementCount > 0) {
      // 写回文件
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      
      const fileName = path.relative(process.cwd(), filePath);
      stats.filesModified++;
      stats.totalReplacements += replacementCount;
      stats.byFile[fileName] = replacementCount;
      
      console.log(`✅ Processed ${fileName}: ${replacementCount} replacements`);
    }
    
    stats.filesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
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
      processFile(filePath);
    }
  });
}

// 生成报告
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Console替换完成报告\n');
  
  console.log(`文件处理: ${stats.filesProcessed}`);
  console.log(`文件修改: ${stats.filesModified}`);
  console.log(`总替换数: ${stats.totalReplacements}`);
  
  if (stats.filesModified > 0) {
    console.log('\n修改的文件:');
    Object.entries(stats.byFile).forEach(([file, count]) => {
      console.log(`  ${file}: ${count} 个替换`);
    });
  }
  
  console.log('\n✅ 所有console语句已成功替换为Logger!');
}

// 执行替换
console.log('🔄 开始批量替换console语句...\n');

// 首先创建备份
console.log('📦 创建备份...');
const backupDir = path.join(__dirname, '..', 'backup', new Date().toISOString().split('T')[0]);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`✅ 备份目录创建: ${backupDir}`);
}

// 扫描并处理文件
scanDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`\n扫描目录: ${dir}`);
    scanDirectory(dir);
  }
});

// 生成报告
generateReport();