/**
 * AI服务中心代码覆盖率分析
 * 评估提升到100%覆盖率的可行性
 */

const fs = require('fs');
const path = require('path');

// 分析结果
const analysis = {
  totalFiles: 0,
  testedFiles: 0,
  untestedFiles: [],
  partiallyTestedFiles: [],
  coverageEstimate: 0,
  recommendations: []
};

// 获取所有JS文件
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '__tests__') {
        getAllJsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 检查文件是否有对应的测试
function hasTestFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const testPath = path.join('__tests__', relativePath.replace('.js', '.test.js'));
  return fs.existsSync(testPath);
}

// 分析文件复杂度
function analyzeFileComplexity(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+|=>\s*{|async\s+\w+/g) || []).length;
    const branches = (content.match(/if\s*\(|switch\s*\(|try\s*{|catch\s*\(/g) || []).length;
    
    return {
      lines,
      functions,
      branches,
      complexity: functions + branches,
      testDifficulty: branches > 10 ? 'high' : branches > 5 ? 'medium' : 'low'
    };
  } catch (error) {
    return { lines: 0, functions: 0, branches: 0, complexity: 0, testDifficulty: 'unknown' };
  }
}

// 主分析函数
function analyzeCoverage() {
  console.log('🔍 AI服务中心代码覆盖率分析\n');
  console.log('='.repeat(60));
  
  // 获取所有需要测试的文件
  const targetDirs = ['_app', '_core', '_pages', '_utils'];
  let allFiles = [];
  
  targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      allFiles = allFiles.concat(getAllJsFiles(dir));
    }
  });
  
  analysis.totalFiles = allFiles.length;
  
  // 分析每个文件
  const fileAnalysis = [];
  
  allFiles.forEach(file => {
    const hasTest = hasTestFile(file);
    const complexity = analyzeFileComplexity(file);
    const relativePath = path.relative(process.cwd(), file);
    
    const fileInfo = {
      path: relativePath,
      hasTest,
      ...complexity
    };
    
    fileAnalysis.push(fileInfo);
    
    if (hasTest) {
      analysis.testedFiles++;
    } else {
      analysis.untestedFiles.push(fileInfo);
    }
  });
  
  // 计算覆盖率估算
  analysis.coverageEstimate = (analysis.testedFiles / analysis.totalFiles * 100).toFixed(2);
  
  // 输出分析结果
  console.log('\n📊 覆盖率概况:');
  console.log(`总文件数: ${analysis.totalFiles}`);
  console.log(`已测试文件: ${analysis.testedFiles}`);
  console.log(`未测试文件: ${analysis.untestedFiles.length}`);
  console.log(`估计覆盖率: ${analysis.coverageEstimate}%`);
  
  // 未测试文件详情
  if (analysis.untestedFiles.length > 0) {
    console.log('\n❌ 未测试的文件:');
    analysis.untestedFiles
      .sort((a, b) => b.complexity - a.complexity)
      .forEach(file => {
        console.log(`  - ${file.path}`);
        console.log(`    复杂度: ${file.complexity} | 行数: ${file.lines} | 难度: ${file.testDifficulty}`);
      });
  }
  
  // 提升到100%的可行性分析
  console.log('\n🎯 提升到100%覆盖率的可行性分析:');
  
  const totalComplexity = fileAnalysis.reduce((sum, f) => sum + f.complexity, 0);
  const untestedComplexity = analysis.untestedFiles.reduce((sum, f) => sum + f.complexity, 0);
  const estimatedEffort = calculateEffort(analysis.untestedFiles);
  
  console.log(`\n需要测试的复杂度: ${untestedComplexity}/${totalComplexity}`);
  console.log(`预计工作量: ${estimatedEffort.total} 人时`);
  console.log(`  - 简单文件: ${estimatedEffort.easy} 个 (${estimatedEffort.easyHours} 小时)`);
  console.log(`  - 中等文件: ${estimatedEffort.medium} 个 (${estimatedEffort.mediumHours} 小时)`);
  console.log(`  - 复杂文件: ${estimatedEffort.hard} 个 (${estimatedEffort.hardHours} 小时)`);
  
  // 可行性建议
  console.log('\n💡 可行性建议:');
  
  if (analysis.coverageEstimate < 50) {
    console.log('⚠️  当前覆盖率较低，建议分阶段提升:');
    console.log('  1. 第一阶段: 覆盖核心业务逻辑 (目标 70%)');
    console.log('  2. 第二阶段: 覆盖常用功能 (目标 85%)');
    console.log('  3. 第三阶段: 覆盖边缘案例 (目标 95%)');
    console.log('  4. 最终阶段: 达到 100% (如果必要)');
  } else if (analysis.coverageEstimate < 80) {
    console.log('✅ 当前覆盖率中等，建议:');
    console.log('  1. 优先测试高复杂度文件');
    console.log('  2. 为新功能强制要求测试');
    console.log('  3. 逐步补充现有测试');
  } else {
    console.log('🎉 当前覆盖率较高，建议:');
    console.log('  1. 保持现有测试质量');
    console.log('  2. 关注关键路径覆盖');
    console.log('  3. 100%覆盖率可能带来递减收益');
  }
  
  // 100%覆盖率的利弊分析
  console.log('\n📈 达到100%覆盖率的利弊分析:');
  console.log('\n✅ 优势:');
  console.log('  - 极高的代码质量保证');
  console.log('  - 重构时的信心保障');
  console.log('  - 减少生产环境bug');
  console.log('  - 新人上手更容易');
  
  console.log('\n⚠️  劣势:');
  console.log('  - 投入产出比可能不高');
  console.log('  - 某些代码难以测试(如UI交互)');
  console.log('  - 维护成本增加');
  console.log('  - 可能导致过度测试');
  
  // 具体建议
  generateRecommendations(fileAnalysis);
  
  // 生成详细报告
  generateDetailedReport(fileAnalysis, estimatedEffort);
}

// 计算工作量估算
function calculateEffort(untestedFiles) {
  const effort = {
    easy: 0,
    medium: 0,
    hard: 0,
    easyHours: 0,
    mediumHours: 0,
    hardHours: 0,
    total: 0
  };
  
  untestedFiles.forEach(file => {
    switch(file.testDifficulty) {
      case 'low':
        effort.easy++;
        effort.easyHours += 0.5; // 半小时一个简单文件
        break;
      case 'medium':
        effort.medium++;
        effort.mediumHours += 2; // 2小时一个中等文件
        break;
      case 'high':
        effort.hard++;
        effort.hardHours += 4; // 4小时一个复杂文件
        break;
    }
  });
  
  effort.total = effort.easyHours + effort.mediumHours + effort.hardHours;
  return effort;
}

// 生成具体建议
function generateRecommendations(fileAnalysis) {
  console.log('\n🎯 具体行动建议:');
  
  // 找出最需要测试的文件
  const criticalFiles = fileAnalysis
    .filter(f => !f.hasTest && f.complexity > 10)
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 5);
  
  if (criticalFiles.length > 0) {
    console.log('\n1. 优先测试这些高复杂度文件:');
    criticalFiles.forEach(file => {
      console.log(`   - ${file.path} (复杂度: ${file.complexity})`);
    });
  }
  
  console.log('\n2. 测试策略建议:');
  console.log('   - 使用测试驱动开发(TDD)方法');
  console.log('   - 设置覆盖率门槛(如PR必须达到80%)');
  console.log('   - 使用覆盖率工具持续监控');
  console.log('   - 定期审查和优化测试');
  
  console.log('\n3. 工具建议:');
  console.log('   - 使用 Jest 的 --coverage 标志');
  console.log('   - 集成 Codecov 或 Coveralls');
  console.log('   - 使用 Stryker 进行变异测试');
  console.log('   - 配置 pre-commit hooks');
}

// 生成详细报告
function generateDetailedReport(fileAnalysis, estimatedEffort) {
  const report = `# AI服务中心代码覆盖率提升计划

## 当前状态
- 总文件数: ${analysis.totalFiles}
- 已测试文件: ${analysis.testedFiles}
- 未测试文件: ${analysis.untestedFiles.length}
- 当前覆盖率: ${analysis.coverageEstimate}%

## 达到100%覆盖率的可行性评估

### 工作量估算
- 预计总工时: ${estimatedEffort.total} 小时
- 简单文件: ${estimatedEffort.easy} 个 (${estimatedEffort.easyHours} 小时)
- 中等文件: ${estimatedEffort.medium} 个 (${estimatedEffort.mediumHours} 小时)
- 复杂文件: ${estimatedEffort.hard} 个 (${estimatedEffort.hardHours} 小时)

### 可行性结论
${analysis.coverageEstimate < 30 ? '⚠️ 当前覆盖率过低，建议分阶段实施' : 
  analysis.coverageEstimate < 70 ? '✅ 可以实现，但需要合理规划' : 
  '🎉 已接近目标，最后冲刺即可'}

## 实施路线图

### 第一阶段 (2周) - 核心功能覆盖
目标: 70% 覆盖率
- 测试所有API客户端
- 测试路由系统
- 测试核心业务逻辑

### 第二阶段 (2周) - 完善覆盖
目标: 85% 覆盖率
- 测试所有页面组件
- 测试工具函数
- 测试错误处理

### 第三阶段 (1周) - 边缘案例
目标: 95% 覆盖率
- 测试异常流程
- 测试边界条件
- 测试并发场景

### 第四阶段 (1周) - 最终冲刺
目标: 100% 覆盖率
- 处理难测试的代码
- 重构不可测试的部分
- 完善测试文档

## 需要测试的文件列表

${analysis.untestedFiles
  .sort((a, b) => b.complexity - a.complexity)
  .map(f => `- [ ] ${f.path} (复杂度: ${f.complexity}, 难度: ${f.testDifficulty})`)
  .join('\n')}

## 建议

1. **是否应该追求100%覆盖率？**
   - 对于核心业务逻辑：是的，应该100%覆盖
   - 对于UI组件：80-90%即可
   - 对于工具函数：90-95%合理
   - 对于配置文件：可以忽略

2. **最佳实践**
   - 新代码必须有测试
   - 修bug必须先写测试
   - 重构前必须有测试
   - 定期审查测试质量

3. **投资回报分析**
   - 70-80%覆盖率：高回报
   - 80-90%覆盖率：中等回报
   - 90-100%覆盖率：递减回报

---
生成时间: ${new Date().toLocaleString()}
`;

  const reportPath = path.join(__dirname, '..', 'COVERAGE_IMPROVEMENT_PLAN.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 详细计划已保存至: ${reportPath}`);
}

// 执行分析
analyzeCoverage();