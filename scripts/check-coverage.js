#!/usr/bin/env node
/**
 * Coverage Summary Script
 * Shows actual test coverage by matching test files to source files
 */

const fs = require('fs');
const path = require('path');

console.log('\n📊 Test Coverage Summary Report');
console.log('================================\n');

// Main source directories to analyze
const sourceDirs = ['_utils', '_pages', '_app', '_core'];
let totalSourceFiles = 0;
let totalTestedFiles = 0;
let untested = [];

sourceDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  
  console.log(`\n📁 ${dir}/`);
  console.log('-'.repeat(40));
  
  let dirSourceFiles = 0;
  let dirTestedFiles = 0;
  
  // Find all JS files in this directory
  function findSourceFiles(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findSourceFiles(filePath);
      } else if (file.endsWith('.js') && !file.includes('.test.')) {
        dirSourceFiles++;
        totalSourceFiles++;
        
        // Check if test file exists
        const relativePath = filePath.substring(dir.length + 1);
        const testPath1 = path.join('__tests__', dir.substring(1), relativePath.replace('.js', '.test.js'));
        const testPath2 = path.join('__tests__', relativePath.replace('.js', '.test.js'));
        
        let hasTest = false;
        if (fs.existsSync(testPath1) || fs.existsSync(testPath2)) {
          dirTestedFiles++;
          totalTestedFiles++;
          hasTest = true;
          console.log(`  ✅ ${relativePath}`);
        } else {
          console.log(`  ❌ ${relativePath} (no test)`);
          untested.push(path.join(dir, relativePath));
        }
      }
    });
  }
  
  findSourceFiles(dir);
  
  const coverage = dirSourceFiles > 0 ? ((dirTestedFiles / dirSourceFiles) * 100).toFixed(1) : 0;
  console.log(`\n  Coverage: ${dirTestedFiles}/${dirSourceFiles} files (${coverage}%)`);
});

// Overall summary
console.log('\n\n📊 Overall Summary');
console.log('==================');
console.log(`Total source files: ${totalSourceFiles}`);
console.log(`Files with tests: ${totalTestedFiles}`);

const overallCoverage = totalSourceFiles > 0 ? ((totalTestedFiles / totalSourceFiles) * 100).toFixed(1) : 0;
console.log(`Coverage: ${overallCoverage}%`);

// Progress indicators
console.log('\n🎯 Progress Targets:');
console.log(`Week 2 (70%): ${overallCoverage >= 70 ? '✅ ACHIEVED!' : '❌ Not yet'}`);
console.log(`Week 3 (85%): ${overallCoverage >= 85 ? '✅ ACHIEVED!' : '❌ Not yet'}`);

if (overallCoverage >= 85) {
  console.log('\n🎉 Congratulations! You\'ve reached the Week 3 target of 85% coverage!');
} else if (overallCoverage >= 70) {
  console.log('\n✅ Great job! You\'ve reached the Week 2 target of 70% coverage!');
  const filesNeeded = Math.ceil(0.85 * totalSourceFiles - totalTestedFiles);
  console.log(`   ${filesNeeded} more test files needed to reach 85%`);
}

// Show untested files if not at target
if (overallCoverage < 85 && untested.length > 0) {
  console.log('\n📝 Priority files to test (first 10):');
  untested.slice(0, 10).forEach(file => {
    console.log(`  - ${file}`);
  });
  
  if (untested.length > 10) {
    console.log(`  ... and ${untested.length - 10} more files`);
  }
}

console.log('\n');