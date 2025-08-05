/**
 * 查找并分析TODO/FIXME注释
 */

const fs = require('fs');
const path = require('path');

// 统计结果
const results = {
  total: 0,
  byType: {
    TODO: 0,
    FIXME: 0,
    HACK: 0,
    NOTE: 0,
    XXX: 0
  },
  byPriority: {
    high: [],
    medium: [],
    low: []
  },
  byFile: {}
};

// 要扫描的目录
const scanDirs = ['_app', '_core', '_pages', '_utils'];

// 忽略的文件
const ignorePatterns = [
  /\.test\.js$/,
  /node_modules/,
  /__tests__/
];

// 检查文件是否应该被忽略
function shouldIgnore(filePath) {
  return ignorePatterns.some(pattern => pattern.test(filePath));
}

// 分析TODO的优先级
function analyzePriority(content, line) {
  // 高优先级标志
  if (/urgent|asap|critical|important|bug|fix|error/i.test(content)) {
    return 'high';
  }
  // 低优先级标志
  if (/later|future|maybe|consider|optimize|refactor/i.test(content)) {
    return 'low';
  }
  // 默认中等优先级
  return 'medium';
}

// 扫描文件
function scanFile(filePath) {
  if (shouldIgnore(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileName = path.relative(process.cwd(), filePath);
    
    const todos = [];
    
    lines.forEach((line, index) => {
      // 匹配TODO类型的注释
      const todoRegex = /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX)[\s:]*(.*)$/gi;
      const blockTodoRegex = /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX)[\s:]*([^*]*)\*\//gi;
      
      let match;
      
      // 单行注释
      while ((match = todoRegex.exec(line)) !== null) {
        const type = match[1].toUpperCase();
        const text = match[2].trim();
        const priority = analyzePriority(text, line);
        
        const todo = {
          file: fileName,
          line: index + 1,
          type,
          text,
          priority,
          code: line.trim()
        };
        
        todos.push(todo);
        results.total++;
        results.byType[type] = (results.byType[type] || 0) + 1;
        results.byPriority[priority].push(todo);
      }
      
      // 块注释
      while ((match = blockTodoRegex.exec(line)) !== null) {
        const type = match[1].toUpperCase();
        const text = match[2].trim();
        const priority = analyzePriority(text, line);
        
        const todo = {
          file: fileName,
          line: index + 1,
          type,
          text,
          priority,
          code: line.trim()
        };
        
        todos.push(todo);
        results.total++;
        results.byType[type] = (results.byType[type] || 0) + 1;
        results.byPriority[priority].push(todo);
      }
    });
    
    if (todos.length > 0) {
      results.byFile[fileName] = todos;
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
    } else if (stat.isFile() && (filePath.endsWith('.js') || filePath.endsWith('.jsx'))) {
      scanFile(filePath);
    }
  });
}

// 生成任务列表
function generateTaskList() {
  const tasks = [];
  
  // 高优先级任务
  results.byPriority.high.forEach(todo => {
    tasks.push({
      priority: 'HIGH',
      type: todo.type,
      task: todo.text || '需要修复',
      location: `${todo.file}:${todo.line}`,
      category: categorizeTask(todo.text)
    });
  });
  
  // 中等优先级任务
  results.byPriority.medium.slice(0, 10).forEach(todo => {
    tasks.push({
      priority: 'MEDIUM',
      type: todo.type,
      task: todo.text || '需要处理',
      location: `${todo.file}:${todo.line}`,
      category: categorizeTask(todo.text)
    });
  });
  
  return tasks;
}

// 分类任务
function categorizeTask(text) {
  if (/api|endpoint|request|response/i.test(text)) return 'API';
  if (/ui|interface|display|render/i.test(text)) return 'UI';
  if (/error|exception|handle/i.test(text)) return 'Error Handling';
  if (/test|testing|coverage/i.test(text)) return 'Testing';
  if (/performance|optimize|speed/i.test(text)) return 'Performance';
  if (/security|auth|permission/i.test(text)) return 'Security';
  return 'General';
}

// 生成报告
function generateReport() {
  console.log('📋 TODO/FIXME 扫描报告\n');
  console.log('='.repeat(60));
  
  console.log(`\n总计: ${results.total} 个待办注释\n`);
  
  console.log('按类型统计:');
  Object.entries(results.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  });
  
  console.log('\n按优先级统计:');
  console.log(`  🔴 高优先级: ${results.byPriority.high.length}`);
  console.log(`  🟡 中优先级: ${results.byPriority.medium.length}`);
  console.log(`  🟢 低优先级: ${results.byPriority.low.length}`);
  
  // 高优先级详情
  if (results.byPriority.high.length > 0) {
    console.log('\n🔴 高优先级任务:');
    results.byPriority.high.forEach(todo => {
      console.log(`\n  ${todo.file}:${todo.line}`);
      console.log(`  ${todo.type}: ${todo.text || '(无描述)'}`);
      console.log(`  代码: ${todo.code}`);
    });
  }
  
  // 生成Markdown报告
  const tasks = generateTaskList();
  const report = `# TODO/FIXME 任务清单

## 统计概览
- 总计: ${results.total} 个待办注释
- 高优先级: ${results.byPriority.high.length}
- 中优先级: ${results.byPriority.medium.length}
- 低优先级: ${results.byPriority.low.length}

## 类型分布
${Object.entries(results.byType)
  .filter(([_, count]) => count > 0)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

## 高优先级任务

${results.byPriority.high.map(todo => 
  `### ${todo.file}:${todo.line}
- **类型**: ${todo.type}
- **描述**: ${todo.text || '需要处理'}
- **代码**: \`${todo.code}\`
`).join('\n')}

## 任务分类

### 按功能模块
${Object.entries(results.byFile)
  .map(([file, todos]) => `- **${file}**: ${todos.length} 个任务`)
  .join('\n')}

## 行动计划

### 立即处理（本周）
${tasks.filter(t => t.priority === 'HIGH')
  .map(t => `- [ ] [${t.type}] ${t.task} (${t.location})`)
  .join('\n')}

### 计划处理（下周）
${tasks.filter(t => t.priority === 'MEDIUM')
  .slice(0, 5)
  .map(t => `- [ ] [${t.type}] ${t.task} (${t.location})`)
  .join('\n')}

### 建议
1. 优先处理标记为 FIXME 的任务
2. 将 TODO 转换为正式的任务管理
3. 定期清理已完成的 TODO
4. 为新的 TODO 添加完成时间预期

---
生成时间: ${new Date().toLocaleString()}
`;

  fs.writeFileSync('TODO_TASKS.md', report, 'utf8');
  console.log(`\n📄 详细报告已保存至: TODO_TASKS.md`);
  
  // 保存JSON数据
  fs.writeFileSync('todo-tasks.json', JSON.stringify(results, null, 2));
  console.log(`📄 JSON数据已保存至: todo-tasks.json`);
}

// 执行扫描
console.log('🔍 开始扫描TODO/FIXME注释...\n');

scanDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`扫描目录: ${dir}`);
    scanDirectory(dir);
  }
});

// 生成报告
generateReport();