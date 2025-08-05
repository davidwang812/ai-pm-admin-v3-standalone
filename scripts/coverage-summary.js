/**
 * Coverage Summary Generator
 * 生成测试覆盖率摘要
 */

const fs = require('fs');
const path = require('path');

// Analyze coverage
function analyzeCoverage() {
  const results = {
    modules: {},
    summary: {
      totalFiles: 0,
      testedFiles: 0,
      coverage: 0
    }
  };
  
  // Source directories
  const sourceDirs = ['_core', '_pages', '_app', '_utils'];
  const testDir = '__tests__';
  
  // Check each source file for corresponding test
  sourceDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    const files = [];
    function scanDir(currentDir) {
      fs.readdirSync(currentDir).forEach(file => {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.js') && !file.includes('.test.') && !file.includes('.spec.')) {
          files.push({
            path: fullPath,
            name: file,
            relativePath: path.relative(process.cwd(), fullPath)
          });
        }
      });
    }
    
    scanDir(dir);
    
    // Check for tests
    const moduleResults = {
      total: files.length,
      tested: 0,
      files: []
    };
    
    files.forEach(file => {
      const baseName = path.basename(file.name, '.js');
      const dirName = dir.replace('_', ''); // Remove underscore for test path
      const relativePath = file.relativePath;
      
      // Generate possible test paths
      const testPaths = [
        // Direct mapping: _core/auth.js -> __tests__/core/auth.test.js
        path.join(testDir, dirName, baseName + '.test.js'),
        path.join(testDir, dirName, baseName + '.spec.js'),
        
        // For nested files: _pages/ai-service/price-standardizer.js -> __tests__/pages/ai-service/price-standardizer.test.js
        path.join(testDir, relativePath.replace('_', '').replace('.js', '.test.js')),
        
        // For deeply nested files: _pages/ai-service/ui/ui-renderer.js -> __tests__/pages/ai-service/ui-renderer.test.js
        path.join(testDir, relativePath.replace('_', '').replace('/ui/', '/').replace('.js', '.test.js')),
        
        // Alternative deep nesting pattern
        path.join(testDir, 'pages', relativePath.replace('_pages/', '').replace('.js', '.test.js')),
        
        // Additional patterns
        path.join(testDir, 'app', baseName + '.test.js'),
        path.join(testDir, 'utils', baseName + '.test.js'),
        path.join(testDir, 'pages', baseName + '.test.js')
      ];
      
      const hasTest = testPaths.some(testPath => fs.existsSync(testPath));
      
      moduleResults.files.push({
        name: file.name,
        path: file.relativePath,
        hasTest
      });
      
      if (hasTest) {
        moduleResults.tested++;
      }
    });
    
    moduleResults.coverage = moduleResults.total > 0 
      ? Math.round((moduleResults.tested / moduleResults.total) * 100)
      : 0;
    
    results.modules[dir] = moduleResults;
    results.summary.totalFiles += moduleResults.total;
    results.summary.testedFiles += moduleResults.tested;
  });
  
  // Calculate overall coverage
  results.summary.coverage = results.summary.totalFiles > 0
    ? Math.round((results.summary.testedFiles / results.summary.totalFiles) * 100)
    : 0;
  
  return results;
}

// Generate report
const coverage = analyzeCoverage();

console.log('📊 Test Coverage Summary\n');
console.log('='.repeat(60));

// Module details
Object.entries(coverage.modules).forEach(([module, data]) => {
  if (data.total === 0) return;
  
  console.log(`\n📁 ${module}/`);
  console.log(`Files: ${data.tested}/${data.total} (${data.coverage}%)`);
  
  // Show untested files
  const untested = data.files.filter(f => !f.hasTest);
  if (untested.length > 0 && untested.length <= 10) {
    console.log('❌ Untested files:');
    untested.forEach(file => {
      console.log(`   - ${file.name}`);
    });
  } else if (untested.length > 10) {
    console.log(`❌ ${untested.length} untested files`);
  }
});

// Overall summary
console.log('\n' + '='.repeat(60));
console.log('📈 Overall Summary\n');
console.log(`Total Files: ${coverage.summary.totalFiles}`);
console.log(`Files with Tests: ${coverage.summary.testedFiles}`);
console.log(`File Coverage: ${coverage.summary.coverage}%`);
console.log(`Estimated Line Coverage: ${Math.round(coverage.summary.coverage * 0.8)}%`);

// Goals
const estimatedCoverage = Math.round(coverage.summary.coverage * 0.8);
console.log('\n🎯 Coverage Goals:');
console.log(`Current: ~${estimatedCoverage}%`);
console.log(`Week 2 Target (70%): ${estimatedCoverage >= 70 ? '✅ Achieved!' : `❌ Need ${70 - estimatedCoverage}% more`}`);
console.log(`Week 3 Target (85%): ${estimatedCoverage >= 85 ? '✅ Achieved!' : `❌ Need ${85 - estimatedCoverage}% more`}`);

// Priority files
const allUntested = [];
Object.values(coverage.modules).forEach(module => {
  module.files.filter(f => !f.hasTest).forEach(file => {
    allUntested.push(file);
  });
});

if (allUntested.length > 0) {
  console.log('\n⚠️ Top Priority Files for Testing:');
  allUntested.slice(0, 10).forEach(file => {
    console.log(`  - ${file.path}`);
  });
  
  if (allUntested.length > 10) {
    console.log(`  ... and ${allUntested.length - 10} more files`);
  }
}

// Save report
fs.writeFileSync('coverage-summary.json', JSON.stringify(coverage, null, 2));
console.log('\n📄 Detailed report saved to: coverage-summary.json');