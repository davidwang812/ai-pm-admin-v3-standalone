/**
 * 检查测试覆盖率
 */

const fs = require('fs');
const path = require('path');

// 统计信息
const stats = {
  totalFiles: 0,
  testedFiles: 0,
  testFiles: 0,
  coverage: 0,
  byCategory: {},
  details: []
};

// 获取所有JS文件
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 检查是否有对应的测试文件
function findTestFile(srcFile) {
  const relativePath = path.relative(process.cwd(), srcFile);
  // 移除开头的 _ 前缀
  const cleanPath = relativePath.replace(/^_/, '');
  const testPath = path.join('__tests__', cleanPath.replace('.js', '.test.js'));
  return fs.existsSync(testPath) ? testPath : null;
}

// 分析覆盖率
function analyzeCoverage() {
  console.log('📊 AI服务中心测试覆盖率分析\n');
  console.log('='.repeat(60));
  
  // 获取源文件
  const srcDirs = ['_app', '_core', '_pages', '_utils'];
  const srcFiles = [];
  
  srcDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      getAllFiles(dir, srcFiles);
    }
  });
  
  // 获取测试文件
  const testFiles = [];
  if (fs.existsSync('__tests__')) {
    getAllFiles('__tests__', testFiles);
  }
  
  stats.totalFiles = srcFiles.length;
  stats.testFiles = testFiles.filter(f => f.endsWith('.test.js')).length;
  
  // 分析每个源文件
  srcFiles.forEach(srcFile => {
    const testFile = findTestFile(srcFile);
    const category = path.dirname(path.relative(process.cwd(), srcFile)).split(path.sep)[0];
    
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = {
        total: 0,
        tested: 0,
        files: []
      };
    }
    
    stats.byCategory[category].total++;
    
    const fileInfo = {
      path: path.relative(process.cwd(), srcFile),
      tested: !!testFile,
      testPath: testFile ? path.relative(process.cwd(), testFile) : null
    };
    
    if (testFile) {
      stats.testedFiles++;
      stats.byCategory[category].tested++;
    }
    
    stats.byCategory[category].files.push(fileInfo);
    stats.details.push(fileInfo);
  });
  
  stats.coverage = ((stats.testedFiles / stats.totalFiles) * 100).toFixed(2);
  
  // 输出结果
  console.log('\n📈 总体统计:');
  console.log(`源文件总数: ${stats.totalFiles}`);
  console.log(`测试文件数: ${stats.testFiles}`);
  console.log(`已测试文件: ${stats.testedFiles}`);
  console.log(`测试覆盖率: ${stats.coverage}%`);
  
  console.log('\n📁 分类统计:');
  Object.entries(stats.byCategory).forEach(([category, data]) => {
    const catCoverage = ((data.tested / data.total) * 100).toFixed(2);
    console.log(`\n${category}:`);
    console.log(`  文件数: ${data.total}`);
    console.log(`  已测试: ${data.tested}`);
    console.log(`  覆盖率: ${catCoverage}%`);
  });
  
  // 未测试的文件
  console.log('\n❌ 未测试的文件:');
  const untestedFiles = stats.details.filter(f => !f.tested);
  untestedFiles.forEach(file => {
    console.log(`  - ${file.path}`);
  });
  
  // 已测试的文件
  console.log('\n✅ 已测试的文件:');
  const testedFiles = stats.details.filter(f => f.tested);
  testedFiles.forEach(file => {
    console.log(`  - ${file.path} -> ${file.testPath}`);
  });
  
  // 生成报告
  generateReport(untestedFiles);
}

// 生成Markdown报告
function generateReport(untestedFiles) {
  const report = `# AI服务中心测试覆盖率报告

## 概览

- **生成时间**: ${new Date().toLocaleString()}
- **源文件总数**: ${stats.totalFiles}
- **测试文件数**: ${stats.testFiles}
- **已测试文件**: ${stats.testedFiles}
- **测试覆盖率**: ${stats.coverage}%

## 分类统计

| 模块 | 文件数 | 已测试 | 覆盖率 |
|------|--------|--------|--------|
${Object.entries(stats.byCategory)
  .map(([cat, data]) => {
    const coverage = ((data.tested / data.total) * 100).toFixed(2);
    return `| ${cat} | ${data.total} | ${data.tested} | ${coverage}% |`;
  })
  .join('\n')}

## 已测试文件列表

${stats.details
  .filter(f => f.tested)
  .map(f => `- ✅ \`${f.path}\``)
  .join('\n')}

## 未测试文件列表

${stats.details
  .filter(f => !f.tested)
  .map(f => `- ❌ \`${f.path}\``)
  .join('\n')}

## 提升建议

### 优先测试的文件（高复杂度）:
${untestedFiles
  .slice(0, 10)
  .map(f => `1. \`${f.path}\``)
  .join('\n')}

### 下一步行动:
1. 继续为核心模块创建测试
2. 优先测试复杂度高的文件
3. 确保新增代码都有对应测试
4. 设置CI/CD中的覆盖率门槛

---
生成时间: ${new Date().toLocaleString()}
`;

  fs.writeFileSync('COVERAGE_REPORT.md', report);
  console.log('\n📄 覆盖率报告已生成: COVERAGE_REPORT.md');
}

// 执行分析
analyzeCoverage();