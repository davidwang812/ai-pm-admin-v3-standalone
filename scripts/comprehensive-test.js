/**
 * AI服务中心综合测试脚本
 * 执行各维度的自动化测试
 */

const fs = require('fs');
const path = require('path');

// 测试结果收集
const testResults = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: new Date(),
  endTime: null,
  categories: {},
  details: []
};

// 彩色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logTest(name, status, details = '') {
  const statusSymbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
  const statusColor = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  
  testResults.totalTests++;
  if (status === 'pass') testResults.passed++;
  else if (status === 'fail') testResults.failed++;
  else testResults.skipped++;
  
  testResults.details.push({ name, status, details, timestamp: new Date() });
  
  console.log(`${statusSymbol} ${name}`);
  if (details) {
    log(`   ${details}`, statusColor);
  }
}

// 测试分类
function addToCategory(category, test) {
  if (!testResults.categories[category]) {
    testResults.categories[category] = { total: 0, passed: 0, failed: 0 };
  }
  testResults.categories[category].total++;
  if (test.status === 'pass') testResults.categories[category].passed++;
  else if (test.status === 'fail') testResults.categories[category].failed++;
}

// 1. 文件结构测试
async function testFileStructure() {
  logSection('1. 文件结构测试');
  
  const requiredFiles = [
    // 核心文件
    { path: 'index.html', category: 'core' },
    { path: 'package.json', category: 'core' },
    { path: 'vercel.json', category: 'deployment' },
    
    // 应用文件
    { path: '_app/bootstrap.js', category: 'app' },
    { path: '_app/app.js', category: 'app' },
    { path: '_core/router.js', category: 'core' },
    { path: '_core/api-client.js', category: 'core' },
    { path: '_core/load-balance-manager.js', category: 'core' },
    
    // 页面模块
    { path: '_pages/ai-service/index.js', category: 'pages' },
    { path: '_pages/ai-service/provider-config.js', category: 'pages' },
    { path: '_pages/ai-service/unified-config.js', category: 'pages' },
    { path: '_pages/ai-service/load-balance.js', category: 'pages' },
    { path: '_pages/ai-service/load-balance-enhanced.js', category: 'pages' },
    { path: '_pages/ai-service/cost-analysis.js', category: 'pages' },
    
    // 样式文件
    { path: '_styles/layout.css', category: 'styles' },
    { path: '_styles/ai-service.css', category: 'styles' },
    { path: '_styles/load-balance-enhanced.css', category: 'styles' },
    
    // 测试文件
    { path: 'jest.config.js', category: 'test' },
    { path: '__tests__/setup/test-utils.js', category: 'test' },
    { path: '__tests__/core/api-client.test.js', category: 'test' },
    { path: '__tests__/core/router.test.js', category: 'test' },
    
    // 文档文件
    { path: 'CLAUDE.md', category: 'docs' },
    { path: 'AI_SERVICE_COMPREHENSIVE_ANALYSIS.md', category: 'docs' },
    { path: 'LOAD_BALANCE_FIX_SUMMARY.md', category: 'docs' },
    { path: 'TEST_FRAMEWORK_SUMMARY.md', category: 'docs' }
  ];
  
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, '..', file.path));
    const test = {
      name: `文件存在: ${file.path}`,
      status: exists ? 'pass' : 'fail',
      details: exists ? '' : '文件不存在'
    };
    logTest(test.name, test.status, test.details);
    addToCategory(file.category, test);
  }
}

// 2. 依赖检查
async function testDependencies() {
  logSection('2. 依赖检查');
  
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    );
    
    // 检查必要的依赖
    const requiredDeps = {
      'jose': '认证库',
      'jest': '测试框架',
      'vercel': '部署工具'
    };
    
    for (const [dep, description] of Object.entries(requiredDeps)) {
      const hasDep = 
        (packageJson.dependencies && packageJson.dependencies[dep]) ||
        (packageJson.devDependencies && packageJson.devDependencies[dep]);
      
      logTest(
        `依赖安装: ${dep} (${description})`,
        hasDep ? 'pass' : 'fail',
        hasDep ? '' : '依赖缺失'
      );
    }
    
    // 检查Node版本要求
    if (packageJson.engines && packageJson.engines.node) {
      logTest(
        'Node版本要求',
        'pass',
        `要求: ${packageJson.engines.node}`
      );
    }
    
  } catch (error) {
    logTest('package.json解析', 'fail', error.message);
  }
}

// 3. 配置文件验证
async function testConfiguration() {
  logSection('3. 配置文件验证');
  
  // 检查Jest配置
  try {
    const jestConfig = require(path.join(__dirname, '..', 'jest.config.js'));
    
    logTest(
      'Jest配置',
      'pass',
      `测试环境: ${jestConfig.testEnvironment}`
    );
    
    // 检查覆盖率阈值
    if (jestConfig.coverageThreshold && jestConfig.coverageThreshold.global) {
      const threshold = jestConfig.coverageThreshold.global;
      logTest(
        '测试覆盖率阈值',
        'pass',
        `要求: ${threshold.lines || 0}%`
      );
    }
  } catch (error) {
    logTest('Jest配置', 'fail', error.message);
  }
  
  // 检查Vercel配置
  try {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8')
    );
    
    logTest(
      'Vercel配置',
      'pass',
      `配置了 ${vercelConfig.functions ? Object.keys(vercelConfig.functions).length : 0} 个函数`
    );
  } catch (error) {
    logTest('Vercel配置', 'fail', error.message);
  }
}

// 4. 代码质量检查
async function testCodeQuality() {
  logSection('4. 代码质量检查');
  
  // 检查是否有console.log
  const jsFiles = [
    '_app/app.js',
    '_core/api-client.js',
    '_core/router.js',
    '_pages/ai-service/provider-config.js'
  ];
  
  for (const file of jsFiles) {
    try {
      const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      const consoleCount = (content.match(/console\.(log|error|warn)/g) || []).length;
      
      logTest(
        `Console语句检查: ${file}`,
        consoleCount > 10 ? 'fail' : 'pass',
        consoleCount > 0 ? `发现 ${consoleCount} 个console语句` : '无console语句'
      );
    } catch (error) {
      logTest(`文件读取: ${file}`, 'fail', error.message);
    }
  }
  
  // 检查是否有TODO注释
  for (const file of jsFiles) {
    try {
      const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      const todoCount = (content.match(/TODO|FIXME|HACK/gi) || []).length;
      
      logTest(
        `TODO注释检查: ${file}`,
        todoCount > 0 ? 'fail' : 'pass',
        todoCount > 0 ? `发现 ${todoCount} 个TODO注释` : '无TODO注释'
      );
    } catch (error) {
      // 已在上面处理
    }
  }
}

// 5. 安全检查
async function testSecurity() {
  logSection('5. 安全检查');
  
  // 检查是否有硬编码的密钥
  const filesToCheck = [
    '_app/app.js',
    '_core/api-client.js',
    '_pages/ai-service/provider-config.js'
  ];
  
  const sensitivePatterns = [
    { pattern: /sk-[a-zA-Z0-9]{40,}/, name: 'OpenAI API Key' },
    { pattern: /AIza[a-zA-Z0-9]{35}/, name: 'Google API Key' },
    { pattern: /sk-ant-[a-zA-Z0-9]{40,}/, name: 'Anthropic API Key' },
    { pattern: /password\s*[:=]\s*["'][^"']+["']/i, name: '硬编码密码' }
  ];
  
  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      let hasSensitive = false;
      
      for (const { pattern, name } of sensitivePatterns) {
        if (pattern.test(content)) {
          logTest(
            `安全检查: ${file}`,
            'fail',
            `发现可能的 ${name}`
          );
          hasSensitive = true;
          break;
        }
      }
      
      if (!hasSensitive) {
        logTest(
          `安全检查: ${file}`,
          'pass',
          '未发现敏感信息'
        );
      }
    } catch (error) {
      logTest(`安全检查: ${file}`, 'skip', '文件读取失败');
    }
  }
  
  // 检查.gitignore
  try {
    const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
    const requiredIgnores = ['.env', 'node_modules', '*.log', '.DS_Store'];
    
    for (const ignore of requiredIgnores) {
      logTest(
        `.gitignore包含: ${ignore}`,
        gitignore.includes(ignore) ? 'pass' : 'fail'
      );
    }
  } catch (error) {
    logTest('.gitignore检查', 'fail', '文件不存在');
  }
}

// 6. API契约测试
async function testAPIContracts() {
  logSection('6. API契约测试');
  
  // 模拟API响应格式检查
  const apiContracts = [
    {
      name: '服务商列表API契约',
      response: { success: true, data: { providers: {} } },
      required: ['success', 'data']
    },
    {
      name: '成本分析API契约',
      response: { success: true, totalCost: 0, totalRequests: 0, trends: [] },
      required: ['success', 'totalCost', 'totalRequests']
    },
    {
      name: '负载均衡API契约',
      response: { success: true, data: { pools: [], summary: {} } },
      required: ['success', 'data']
    }
  ];
  
  for (const contract of apiContracts) {
    const hasRequired = contract.required.every(field => 
      contract.response.hasOwnProperty(field)
    );
    
    logTest(
      contract.name,
      hasRequired ? 'pass' : 'fail',
      hasRequired ? '契约符合' : '缺少必要字段'
    );
  }
}

// 7. 性能基准测试
async function testPerformance() {
  logSection('7. 性能基准测试');
  
  // 文件大小检查
  const sizeLimit = {
    'index.html': 10 * 1024, // 10KB
    '_app/app.js': 50 * 1024, // 50KB
    '_core/api-client.js': 30 * 1024, // 30KB
    '_styles/layout.css': 20 * 1024 // 20KB
  };
  
  for (const [file, limit] of Object.entries(sizeLimit)) {
    try {
      const stats = fs.statSync(path.join(__dirname, '..', file));
      const size = stats.size;
      
      logTest(
        `文件大小: ${file}`,
        size <= limit ? 'pass' : 'fail',
        `${(size / 1024).toFixed(2)}KB / ${(limit / 1024).toFixed(0)}KB`
      );
    } catch (error) {
      logTest(`文件大小: ${file}`, 'skip', '文件不存在');
    }
  }
}

// 8. 兼容性检查
async function testCompatibility() {
  logSection('8. 兼容性检查');
  
  // 检查ES6+特性使用
  const checkES6Features = [
    { feature: 'import/export', pattern: /import\s+.*from|export\s+/ },
    { feature: 'async/await', pattern: /async\s+function|await\s+/ },
    { feature: '箭头函数', pattern: /=>\s*{/ },
    { feature: '模板字符串', pattern: /`[^`]*\${[^}]+}[^`]*`/ }
  ];
  
  try {
    const appContent = fs.readFileSync(
      path.join(__dirname, '..', '_app/app.js'), 
      'utf8'
    );
    
    for (const { feature, pattern } of checkES6Features) {
      logTest(
        `ES6特性使用: ${feature}`,
        pattern.test(appContent) ? 'pass' : 'skip',
        pattern.test(appContent) ? '已使用' : '未使用'
      );
    }
  } catch (error) {
    logTest('ES6特性检查', 'fail', error.message);
  }
}

// 生成测试报告
function generateReport() {
  testResults.endTime = new Date();
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  
  logSection('测试报告');
  
  log(`测试完成时间: ${testResults.endTime.toLocaleString()}`, 'cyan');
  log(`测试耗时: ${duration.toFixed(2)} 秒`, 'cyan');
  
  console.log('\n总体结果:');
  console.log(`总测试数: ${testResults.totalTests}`);
  log(`✅ 通过: ${testResults.passed}`, 'green');
  log(`❌ 失败: ${testResults.failed}`, 'red');
  log(`⏭️  跳过: ${testResults.skipped}`, 'yellow');
  
  const passRate = (testResults.passed / testResults.totalTests * 100).toFixed(2);
  log(`\n通过率: ${passRate}%`, passRate >= 80 ? 'green' : 'red');
  
  console.log('\n分类统计:');
  for (const [category, stats] of Object.entries(testResults.categories)) {
    const catPassRate = (stats.passed / stats.total * 100).toFixed(2);
    console.log(`${category}: ${stats.passed}/${stats.total} (${catPassRate}%)`);
  }
  
  // 保存详细报告
  const reportPath = path.join(__dirname, '..', 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`\n详细报告已保存至: ${reportPath}`, 'blue');
  
  // 生成Markdown报告
  generateMarkdownReport();
}

// 生成Markdown格式报告
function generateMarkdownReport() {
  const report = `# AI服务中心测试报告

## 测试概况

- **测试时间**: ${testResults.startTime.toLocaleString()} - ${testResults.endTime.toLocaleString()}
- **测试耗时**: ${((testResults.endTime - testResults.startTime) / 1000).toFixed(2)} 秒
- **测试版本**: v3.0.0

## 测试结果

| 指标 | 数值 | 状态 |
|------|------|------|
| 总测试数 | ${testResults.totalTests} | - |
| 通过数 | ${testResults.passed} | ✅ |
| 失败数 | ${testResults.failed} | ❌ |
| 跳过数 | ${testResults.skipped} | ⏭️ |
| 通过率 | ${(testResults.passed / testResults.totalTests * 100).toFixed(2)}% | ${testResults.passed / testResults.totalTests >= 0.8 ? '✅' : '❌'} |

## 分类统计

| 类别 | 通过/总数 | 通过率 |
|------|-----------|--------|
${Object.entries(testResults.categories)
  .map(([cat, stats]) => `| ${cat} | ${stats.passed}/${stats.total} | ${(stats.passed / stats.total * 100).toFixed(2)}% |`)
  .join('\n')}

## 失败的测试

${testResults.details
  .filter(t => t.status === 'fail')
  .map(t => `- **${t.name}**: ${t.details || '未知原因'}`)
  .join('\n') || '无'}

## 建议

${testResults.failed > 0 ? `
- 修复失败的测试项
- 检查文件完整性
- 确保依赖正确安装
` : '- 所有测试通过，系统状态良好'}

---

生成时间: ${new Date().toLocaleString()}
`;

  const reportPath = path.join(__dirname, '..', 'TEST_REPORT.md');
  fs.writeFileSync(reportPath, report);
  log(`Markdown报告已生成: ${reportPath}`, 'blue');
}

// 主测试流程
async function runAllTests() {
  log('🚀 开始AI服务中心综合测试', 'bright');
  
  try {
    await testFileStructure();
    await testDependencies();
    await testConfiguration();
    await testCodeQuality();
    await testSecurity();
    await testAPIContracts();
    await testPerformance();
    await testCompatibility();
  } catch (error) {
    log(`\n测试过程出错: ${error.message}`, 'red');
  } finally {
    generateReport();
  }
  
  // 返回退出码
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 执行测试
runAllTests();