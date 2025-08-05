/**
 * Test Issue Analyzer
 * 分析测试文件中可能存在的问题
 */

const fs = require('fs');
const path = require('path');

// Issues found
const issues = {
  total: 0,
  byType: {
    'missing-imports': [],
    'api-dependencies': [],
    'dom-dependencies': [],
    'async-issues': [],
    'mock-issues': []
  }
};

// Test files to analyze
const testFiles = [
  '__tests__/core/api-client.test.js',
  '__tests__/core/router.test.js',
  '__tests__/core/state.test.js',
  '__tests__/core/auth-v3.test.js',
  '__tests__/core/cache.test.js',
  '__tests__/core/load-balance-manager.test.js',
  '__tests__/app/app.test.js',
  '__tests__/pages/dashboard/index.test.js',
  '__tests__/pages/ai-service/provider-config.test.js',
  '__tests__/pages/ai-service/unified-config.test.js',
  '__tests__/pages/ai-service/contract-compliance.test.js',
  '__tests__/pages/ai-service/cost-analysis.test.js',
  '__tests__/pages/ai-service/load-balancing.test.js',
  '__tests__/pages/ai-service/service-status.test.js'
];

// Analyze a test file
function analyzeTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    console.log(`\n🔍 Analyzing: ${fileName}`);
    
    // Check for missing imports
    const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('.')) continue; // Skip external modules
      
      // Resolve the import path
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const possiblePaths = [
        resolvedPath,
        resolvedPath + '.js',
        resolvedPath + '/index.js'
      ];
      
      const exists = possiblePaths.some(p => fs.existsSync(p));
      if (!exists) {
        issues.byType['missing-imports'].push({
          file: fileName,
          import: importPath,
          line: content.substring(0, match.index).split('\n').length
        });
        issues.total++;
      }
    }
    
    // Check for API dependencies
    if (content.includes('fetch(') || content.includes('api.')) {
      const apiCalls = content.match(/(fetch|api\.\w+)\(/g) || [];
      if (apiCalls.length > 0) {
        issues.byType['api-dependencies'].push({
          file: fileName,
          apis: [...new Set(apiCalls)],
          count: apiCalls.length
        });
        issues.total++;
      }
    }
    
    // Check for DOM dependencies
    const domPatterns = [
      'document.',
      'window.',
      'querySelector',
      'getElementById',
      'innerHTML',
      'addEventListener'
    ];
    
    const domUsage = domPatterns.filter(pattern => content.includes(pattern));
    if (domUsage.length > 0) {
      issues.byType['dom-dependencies'].push({
        file: fileName,
        patterns: domUsage
      });
      issues.total++;
    }
    
    // Check for async/await issues
    const asyncTests = content.match(/it\s*\([^)]+async/g) || [];
    const awaitCalls = content.match(/await\s+/g) || [];
    if (asyncTests.length > 0 || awaitCalls.length > 0) {
      issues.byType['async-issues'].push({
        file: fileName,
        asyncTests: asyncTests.length,
        awaitCalls: awaitCalls.length
      });
    }
    
    // Check for mock issues
    const mockPatterns = [
      'jest.mock',
      'mockImplementation',
      'mockReturnValue',
      'spyOn'
    ];
    
    const mockUsage = mockPatterns.filter(pattern => content.includes(pattern));
    if (mockUsage.length > 0) {
      issues.byType['mock-issues'].push({
        file: fileName,
        patterns: mockUsage
      });
    }
    
    console.log(`  ✅ Analysis complete`);
    
  } catch (error) {
    console.error(`  ❌ Error analyzing ${filePath}:`, error.message);
  }
}

// Generate recommendations
function generateRecommendations() {
  const recommendations = [];
  
  if (issues.byType['missing-imports'].length > 0) {
    recommendations.push({
      priority: 'HIGH',
      type: 'Missing Imports',
      action: 'Fix import paths or create missing modules',
      files: issues.byType['missing-imports'].map(i => i.file)
    });
  }
  
  if (issues.byType['api-dependencies'].length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      type: 'API Dependencies',
      action: 'Mock API calls or use test fixtures',
      files: issues.byType['api-dependencies'].map(i => i.file)
    });
  }
  
  if (issues.byType['dom-dependencies'].length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      type: 'DOM Dependencies',
      action: 'Use jsdom or mock DOM elements',
      files: issues.byType['dom-dependencies'].map(i => i.file)
    });
  }
  
  return recommendations;
}

// Main execution
console.log('🧪 Test Issue Analysis\n');
console.log('=' . repeat(60));

// Analyze each test file
testFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    analyzeTestFile(fullPath);
  } else {
    console.log(`\n⚠️ Test file not found: ${file}`);
  }
});

// Generate report
console.log('\n' + '='.repeat(60));
console.log('📊 Analysis Summary\n');

console.log(`Total Issues Found: ${issues.total}\n`);

// Report by issue type
Object.entries(issues.byType).forEach(([type, items]) => {
  if (items.length > 0) {
    console.log(`\n${type.toUpperCase()} (${items.length}):`);
    items.forEach(item => {
      console.log(`  - ${item.file}`);
      if (item.import) {
        console.log(`    Missing: ${item.import} (line ${item.line})`);
      }
      if (item.apis) {
        console.log(`    API calls: ${item.apis.join(', ')} (${item.count} total)`);
      }
      if (item.patterns) {
        console.log(`    DOM usage: ${item.patterns.join(', ')}`);
      }
      if (item.asyncTests !== undefined) {
        console.log(`    Async tests: ${item.asyncTests}, Await calls: ${item.awaitCalls}`);
      }
    });
  }
});

// Generate recommendations
const recommendations = generateRecommendations();
if (recommendations.length > 0) {
  console.log('\n\n🎯 Recommendations:\n');
  recommendations.forEach(rec => {
    console.log(`[${rec.priority}] ${rec.type}`);
    console.log(`  Action: ${rec.action}`);
    console.log(`  Files: ${rec.files.join(', ')}`);
    console.log('');
  });
}

// Save detailed report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalIssues: issues.total,
    testFiles: testFiles.length,
    issueTypes: Object.keys(issues.byType).filter(k => issues.byType[k].length > 0)
  },
  issues: issues.byType,
  recommendations
};

fs.writeFileSync('test-analysis-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Detailed report saved to: test-analysis-report.json');