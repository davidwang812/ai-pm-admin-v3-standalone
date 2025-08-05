/**
 * Simple Coverage Analysis Script
 * Analyzes test coverage by counting test files vs source files
 */

const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern, exclude = []) {
  const results = [];
  
  function walk(currentPath) {
    if (exclude.some(ex => currentPath.includes(ex))) return;
    
    try {
      const files = fs.readdirSync(currentPath);
      
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walk(filePath);
        } else if (pattern.test(file)) {
          results.push(filePath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  walk(dir);
  return results;
}

// Find all source files - exclude more patterns
const sourceFiles = findFiles('.', /\.js$/, ['node_modules', '__tests__', '.test.js', 'scripts', 'docs', 'dist', 'build', 'coverage', '.git', 'public']);

// Find all test files
const testFiles = findFiles('__tests__', /\.test\.js$/);

// Create a map of source files to their test files
const coverageMap = new Map();

// Initialize all source files as uncovered
sourceFiles.forEach(file => {
  const normalizedPath = file.replace(/\\/g, '/');
  coverageMap.set(normalizedPath, null);
});

// Match test files to source files
testFiles.forEach(testFile => {
  const testPath = testFile.replace(/\\/g, '/');
  
  // Try multiple matching strategies
  const possiblePaths = [
    // Direct match: __tests__/pages/... -> _pages/...
    testPath.replace('__tests__/pages/', './_pages/').replace('.test.js', '.js'),
    // Direct match: __tests__/utils/... -> _utils/...
    testPath.replace('__tests__/utils/', './_utils/').replace('.test.js', '.js'),
    // Direct match: __tests__/app/... -> _app/...
    testPath.replace('__tests__/app/', './_app/').replace('.test.js', '.js'),
    // Standard match
    './' + testPath.replace('__tests__/', '').replace('.test.js', '.js')
  ];
  
  // Check each possible path
  for (const sourcePath of possiblePaths) {
    if (coverageMap.has(sourcePath)) {
      coverageMap.set(sourcePath, testPath);
      break;
    }
  }
});

// Categorize files by directory
const byDirectory = new Map();

coverageMap.forEach((testFile, sourceFile) => {
  const dir = path.dirname(sourceFile);
  if (!byDirectory.has(dir)) {
    byDirectory.set(dir, { total: 0, covered: 0, files: [] });
  }
  
  const dirStats = byDirectory.get(dir);
  dirStats.total++;
  if (testFile) dirStats.covered++;
  dirStats.files.push({ source: sourceFile, test: testFile });
});

// Calculate overall statistics
let totalFiles = 0;
let coveredFiles = 0;

console.log('\n📊 Test Coverage Analysis Report');
console.log('================================\n');

// Sort directories by path
const sortedDirs = Array.from(byDirectory.entries()).sort((a, b) => a[0].localeCompare(b[0]));

sortedDirs.forEach(([dir, stats]) => {
  if (stats.total === 0) return;
  
  totalFiles += stats.total;
  coveredFiles += stats.covered;
  
  const coverage = ((stats.covered / stats.total) * 100).toFixed(1);
  const emoji = coverage >= 80 ? '✅' : coverage >= 60 ? '⚠️' : '❌';
  
  console.log(`${emoji} ${dir}`);
  console.log(`   Coverage: ${stats.covered}/${stats.total} (${coverage}%)`);
  
  if (coverage < 100) {
    const uncovered = stats.files.filter(f => !f.test);
    if (uncovered.length > 0) {
      console.log('   Uncovered files:');
      uncovered.forEach(f => {
        console.log(`   - ${path.basename(f.source)}`);
      });
    }
  }
  console.log('');
});

// Overall summary
const overallCoverage = ((coveredFiles / totalFiles) * 100).toFixed(1);
const emoji = overallCoverage >= 85 ? '🎉' : overallCoverage >= 70 ? '✅' : overallCoverage >= 50 ? '⚠️' : '❌';

console.log('📊 Overall Coverage Summary');
console.log('===========================');
console.log(`Total source files: ${totalFiles}`);
console.log(`Files with tests: ${coveredFiles}`);
console.log(`${emoji} Coverage: ${overallCoverage}%`);
console.log('');

// Target analysis
console.log('🎯 Target Analysis');
console.log('==================');
console.log(`Week 2 Target (70%): ${overallCoverage >= 70 ? '✅ ACHIEVED' : '❌ Not reached'}`);
console.log(`Week 3 Target (85%): ${overallCoverage >= 85 ? '✅ ACHIEVED' : '❌ Not reached'}`);

if (overallCoverage < 85) {
  const filesNeeded = Math.ceil((0.85 * totalFiles) - coveredFiles);
  console.log(`\nFiles needed for 85%: ${filesNeeded} more test files`);
}

// Show priority directories for testing
if (overallCoverage < 85) {
  console.log('\n🎯 Priority Directories for Testing:');
  const priorities = sortedDirs
    .filter(([dir, stats]) => stats.covered < stats.total)
    .sort((a, b) => {
      const coverageA = (a[1].covered / a[1].total) * 100;
      const coverageB = (b[1].covered / b[1].total) * 100;
      return coverageA - coverageB;
    })
    .slice(0, 5);
  
  priorities.forEach(([dir, stats]) => {
    const coverage = ((stats.covered / stats.total) * 100).toFixed(1);
    const uncovered = stats.total - stats.covered;
    console.log(`  - ${dir}: ${uncovered} files need tests (currently ${coverage}%)`);
  });
}