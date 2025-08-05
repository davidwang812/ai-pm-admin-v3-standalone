/**
 * Test Coverage Analyzer
 * 分析测试覆盖率（基于文件和函数分析）
 */

const fs = require('fs');
const path = require('path');

// Coverage data
const coverage = {
  totalFiles: 0,
  testedFiles: 0,
  totalFunctions: 0,
  testedFunctions: 0,
  totalLines: 0,
  modules: {}
};

// Directories to analyze
const sourceDirs = ['_core', '_pages', '_app', '_utils'];
const testDir = '__tests__';

// Parse source file to extract functions/methods
function analyzeSourceFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.relative(process.cwd(), filePath);
  
  // Count lines
  const lines = content.split('\n').length;
  
  // Extract functions and methods
  const functions = [];
  
  // Match function declarations
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      type: 'function',
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  // Match method definitions
  const methodRegex = /(\w+)\s*\([^)]*\)\s*{/g;
  while ((match = methodRegex.exec(content)) !== null) {
    if (!match[1].match(/^(if|for|while|switch|catch)$/)) {
      functions.push({
        name: match[1],
        type: 'method',
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  // Match arrow functions
  const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      type: 'arrow',
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return {
    fileName,
    lines,
    functions: Array.from(new Set(functions.map(f => f.name))).map(name => 
      functions.find(f => f.name === name)
    )
  };
}

// Check if test file exists for source file
function findTestFile(sourceFile) {
  const relativePath = path.relative(process.cwd(), sourceFile);
  const parts = relativePath.split(path.sep);
  const fileName = path.basename(sourceFile, '.js');
  
  // Possible test file paths
  const testPaths = [
    path.join(testDir, ...parts.slice(0, -1), `${fileName}.test.js`),
    path.join(testDir, ...parts.slice(0, -1), `${fileName}.spec.js`),
    path.join(testDir, parts[0], `${fileName}.test.js`),
    path.join(testDir, `${fileName}.test.js`)
  ];
  
  for (const testPath of testPaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }
  
  return null;
}

// Analyze test file to find tested functions
function analyzeTestFile(filePath) {
  if (!fs.existsSync(filePath)) return { testedFunctions: [] };
  
  const content = fs.readFileSync(filePath, 'utf8');
  const testedFunctions = new Set();
  
  // Look for function calls in test assertions
  const callRegex = /(?:expect|assert)[^;]*?(\w+)\s*\(/g;
  let match;
  while ((match = callRegex.exec(content)) !== null) {
    testedFunctions.add(match[1]);
  }
  
  // Look for method calls
  const methodCallRegex = /\.\s*(\w+)\s*\(/g;
  while ((match = methodCallRegex.exec(content)) !== null) {
    testedFunctions.add(match[1]);
  }
  
  // Look for describe/it blocks mentioning functions
  const describeRegex = /(?:describe|it)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = describeRegex.exec(content)) !== null) {
    const desc = match[1];
    const funcMatch = desc.match(/(\w+)(?:\s+method|\s+function)?/);
    if (funcMatch) {
      testedFunctions.add(funcMatch[1]);
    }
  }
  
  return {
    testedFunctions: Array.from(testedFunctions)
  };
}

// Calculate coverage for a module
function calculateModuleCoverage(sourceFile) {
  const source = analyzeSourceFile(sourceFile);
  const testFile = findTestFile(sourceFile);
  const test = testFile ? analyzeTestFile(testFile) : { testedFunctions: [] };
  
  const testedFunctions = source.functions.filter(func => 
    test.testedFunctions.includes(func.name)
  );
  
  const functionCoverage = source.functions.length > 0 
    ? (testedFunctions.length / source.functions.length) * 100 
    : 100;
  
  return {
    sourceFile: source.fileName,
    testFile: testFile ? path.relative(process.cwd(), testFile) : null,
    hasTest: !!testFile,
    lines: source.lines,
    functions: source.functions,
    testedFunctions,
    functionCoverage: functionCoverage.toFixed(1),
    estimatedLineCoverage: (functionCoverage * 0.8).toFixed(1) // Rough estimate
  };
}

// Scan directory for source files
function scanDirectory(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) return files;
  
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...scanDirectory(fullPath));
    } else if (file.endsWith('.js') && !file.endsWith('.test.js') && !file.endsWith('.spec.js')) {
      files.push(fullPath);
    }
  });
  
  return files;
}

// Generate coverage report
function generateReport() {
  console.log('📊 Test Coverage Analysis\n');
  console.log('='.repeat(60));
  
  // Analyze each source directory
  sourceDirs.forEach(dir => {
    const files = scanDirectory(dir);
    
    if (files.length === 0) return;
    
    console.log(`\n📁 ${dir}/`);
    console.log('-'.repeat(60));
    
    const moduleCoverage = {
      totalFiles: 0,
      testedFiles: 0,
      totalFunctions: 0,
      testedFunctions: 0,
      totalLines: 0
    };
    
    files.forEach(file => {
      const result = calculateModuleCoverage(file);
      
      moduleCoverage.totalFiles++;
      if (result.hasTest) moduleCoverage.testedFiles++;
      moduleCoverage.totalFunctions += result.functions.length;
      moduleCoverage.testedFunctions += result.testedFunctions.length;
      moduleCoverage.totalLines += result.lines;
      
      // Update global coverage
      coverage.totalFiles++;
      if (result.hasTest) coverage.testedFiles++;
      coverage.totalFunctions += result.functions.length;
      coverage.testedFunctions += result.testedFunctions.length;
      coverage.totalLines += result.lines;
      
      // Store module data
      if (!coverage.modules[dir]) {
        coverage.modules[dir] = [];
      }
      coverage.modules[dir].push(result);
      
      // Display file coverage
      const status = result.hasTest ? '✅' : '❌';
      const coverage = result.hasTest ? `${result.functionCoverage}%` : '0%';
      console.log(`${status} ${path.basename(file)} - Coverage: ${coverage}`);
      
      if (result.functions.length > 0) {
        console.log(`   Functions: ${result.testedFunctions.length}/${result.functions.length}`);
        
        // Show untested functions
        const untestedFunctions = result.functions.filter(f => 
          !result.testedFunctions.find(tf => tf.name === f.name)
        );
        
        if (untestedFunctions.length > 0 && untestedFunctions.length <= 5) {
          console.log(`   Untested: ${untestedFunctions.map(f => f.name).join(', ')}`);
        }
      }
    });
    
    // Module summary
    const moduleFileCoverage = ((moduleCoverage.testedFiles / moduleCoverage.totalFiles) * 100).toFixed(1);
    const moduleFuncCoverage = moduleCoverage.totalFunctions > 0
      ? ((moduleCoverage.testedFunctions / moduleCoverage.totalFunctions) * 100).toFixed(1)
      : '100.0';
    
    console.log(`\n📊 Module Summary:`);
    console.log(`   Files: ${moduleCoverage.testedFiles}/${moduleCoverage.totalFiles} (${moduleFileCoverage}%)`);
    console.log(`   Functions: ${moduleCoverage.testedFunctions}/${moduleCoverage.totalFunctions} (${moduleFuncCoverage}%)`);
  });
  
  // Overall summary
  const overallFileCoverage = ((coverage.testedFiles / coverage.totalFiles) * 100).toFixed(1);
  const overallFuncCoverage = coverage.totalFunctions > 0
    ? ((coverage.testedFunctions / coverage.totalFunctions) * 100).toFixed(1)
    : '100.0';
  const estimatedLineCoverage = (parseFloat(overallFuncCoverage) * 0.8).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 Overall Coverage Summary\n');
  console.log(`Total Files: ${coverage.totalFiles}`);
  console.log(`Files with Tests: ${coverage.testedFiles} (${overallFileCoverage}%)`);
  console.log(`Total Functions: ${coverage.totalFunctions}`);
  console.log(`Tested Functions: ${coverage.testedFunctions} (${overallFuncCoverage}%)`);
  console.log(`Total Lines: ${coverage.totalLines}`);
  console.log(`Estimated Line Coverage: ${estimatedLineCoverage}%`);
  
  // Coverage goals
  console.log('\n🎯 Coverage Goals:');
  console.log(`Current: ~${estimatedLineCoverage}%`);
  console.log(`Week 2 Target: 70% ${parseFloat(estimatedLineCoverage) >= 70 ? '✅' : '❌'}`);
  console.log(`Week 3 Target: 85% ${parseFloat(estimatedLineCoverage) >= 85 ? '✅' : '❌'}`);
  
  // Priority files for testing
  const untested = [];
  Object.entries(coverage.modules).forEach(([dir, files]) => {
    files.forEach(file => {
      if (!file.hasTest && file.functions.length > 3) {
        untested.push({
          file: file.sourceFile,
          functions: file.functions.length,
          lines: file.lines
        });
      }
    });
  });
  
  if (untested.length > 0) {
    console.log('\n⚠️ Priority Files for Testing:');
    untested
      .sort((a, b) => b.functions - a.functions)
      .slice(0, 10)
      .forEach(file => {
        console.log(`  - ${file.file} (${file.functions} functions, ${file.lines} lines)`);
      });
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: coverage.totalFiles,
      testedFiles: coverage.testedFiles,
      fileCoverage: overallFileCoverage,
      totalFunctions: coverage.totalFunctions,
      testedFunctions: coverage.testedFunctions,
      functionCoverage: overallFuncCoverage,
      totalLines: coverage.totalLines,
      estimatedLineCoverage
    },
    modules: coverage.modules,
    untested
  };
  
  fs.writeFileSync('coverage-analysis.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: coverage-analysis.json');
}

// Run analysis
generateReport();