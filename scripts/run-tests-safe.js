#!/usr/bin/env node
/**
 * Safe Test Runner
 * 安全地运行测试，即使没有完整的Jest环境
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Attempting to run tests...\n');

// Check if node_modules exists
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ node_modules not found. Please run: npm install');
  process.exit(1);
}

// Check if jest is installed
const jestPath = path.join(nodeModulesPath, '.bin', 'jest');
const jestPathWindows = path.join(nodeModulesPath, '.bin', 'jest.cmd');

let jestCommand = 'jest';
if (fs.existsSync(jestPath)) {
  jestCommand = jestPath;
} else if (fs.existsSync(jestPathWindows)) {
  jestCommand = jestPathWindows;
} else {
  console.warn('⚠️ Jest not found in node_modules, trying global jest...');
}

// Run tests with error handling
const testProcess = spawn(jestCommand, ['--no-coverage', '--detectOpenHandles'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to run tests:', error.message);
  
  // Provide alternative testing approach
  console.log('\n📋 Alternative: Running basic test validation...\n');
  
  // Basic test file validation
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
  
  let validTests = 0;
  let invalidTests = 0;
  
  testFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Basic validation
      const hasDescribe = content.includes('describe(');
      const hasIt = content.includes('it(') || content.includes('test(');
      const hasExpect = content.includes('expect(');
      
      if (hasDescribe && hasIt && hasExpect) {
        console.log(`✅ ${path.basename(file)} - Valid test structure`);
        validTests++;
      } else {
        console.log(`❌ ${path.basename(file)} - Missing test structure`);
        invalidTests++;
      }
    } else {
      console.log(`⚠️ ${path.basename(file)} - File not found`);
      invalidTests++;
    }
  });
  
  console.log('\n📊 Test File Validation Summary:');
  console.log(`Valid test files: ${validTests}`);
  console.log(`Invalid test files: ${invalidTests}`);
  console.log(`Total test files: ${testFiles.length}`);
  
  process.exit(1);
});

testProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log(`\n❌ Tests failed with exit code: ${code}`);
  }
  process.exit(code);
});