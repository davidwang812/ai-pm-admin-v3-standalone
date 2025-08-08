/**
 * 测试Step 2: localhost硬编码修复后的影响
 */

const fs = require('fs');
const path = require('path');

const testResults = [];

// 测试1: 检查bootstrap.js是否还有硬编码的localhost
function testBootstrapFile() {
  try {
    const bootstrapPath = path.join(__dirname, '_app', 'bootstrap.js');
    const content = fs.readFileSync(bootstrapPath, 'utf8');
    
    // 检查是否还有硬编码的localhost:3001
    const lines = content.split('\n');
    const problematicLines = [];
    
    lines.forEach((line, index) => {
      if (line.includes('localhost:3001') && !line.includes('||') && !line.includes('window.LOCAL_API_URL')) {
        problematicLines.push(`Line ${index + 1}: ${line.trim()}`);
      }
    });
    
    if (problematicLines.length > 0) {
      return {
        test: 'Bootstrap.js Hardcoding',
        status: '❌ FAIL',
        message: `Still has hardcoded localhost: ${problematicLines.join('; ')}`
      };
    }
    
    // 检查是否正确使用了环境变量
    if (content.includes('window.LOCAL_API_URL ||')) {
      return {
        test: 'Bootstrap.js Hardcoding',
        status: '✅ PASS',
        message: 'Correctly uses environment variable with fallback'
      };
    }
    
    return {
      test: 'Bootstrap.js Hardcoding',
      status: '⚠️ WARNING',
      message: 'File modified but pattern not found'
    };
  } catch (error) {
    return {
      test: 'Bootstrap.js Hardcoding',
      status: '❌ FAIL',
      message: `Could not check file: ${error.message}`
    };
  }
}

// 测试2: 检查dist目录同步
function testDistSync() {
  try {
    const srcPath = path.join(__dirname, '_app', 'bootstrap.js');
    const distPath = path.join(__dirname, 'dist', '_app', 'bootstrap.js');
    
    const srcContent = fs.readFileSync(srcPath, 'utf8');
    const distContent = fs.readFileSync(distPath, 'utf8');
    
    if (srcContent === distContent) {
      return {
        test: 'Dist Directory Sync',
        status: '✅ PASS',
        message: 'Source and dist are synchronized'
      };
    } else {
      return {
        test: 'Dist Directory Sync',
        status: '⚠️ WARNING',
        message: 'Source and dist files differ - may need sync'
      };
    }
  } catch (error) {
    return {
      test: 'Dist Directory Sync',
      status: '⚠️ WARNING',
      message: `Could not verify sync: ${error.message}`
    };
  }
}

// 测试3: 检查其他文件的localhost引用
function testOtherLocalhostReferences() {
  const filesToCheck = [
    '_core/api-client.js',
    '_app/config.js',
    '_utils/logger.js'
  ];
  
  const filesWithLocalhost = [];
  
  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
      // 只检查非条件性的localhost引用
      if (content.match(/['"]localhost(?!.*\|\|)/)) {
        filesWithLocalhost.push(file);
      }
    } catch (error) {
      // File doesn't exist, skip
    }
  }
  
  if (filesWithLocalhost.length > 0) {
    return {
      test: 'Other Localhost References',
      status: '⚠️ WARNING',
      message: `Files may have localhost references: ${filesWithLocalhost.join(', ')}`
    };
  }
  
  return {
    test: 'Other Localhost References',
    status: '✅ PASS',
    message: 'No problematic localhost references found'
  };
}

// 运行所有测试
async function runAllTests() {
  console.log('🧪 Testing Step 2: Localhost Hardcoding Fix\n');
  console.log('=' .repeat(50));
  
  testResults.push(testBootstrapFile());
  testResults.push(testDistSync());
  testResults.push(testOtherLocalhostReferences());
  
  // 显示结果
  console.log('\n📊 Test Results:\n');
  for (const result of testResults) {
    console.log(`${result.status} ${result.test}`);
    console.log(`   ${result.message}\n`);
  }
  
  // 总结
  const failed = testResults.filter(r => r.status.includes('❌')).length;
  const warnings = testResults.filter(r => r.status.includes('⚠️')).length;
  const passed = testResults.filter(r => r.status.includes('✅')).length;
  
  console.log('=' .repeat(50));
  console.log('\n📈 Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ⚠️ Warnings: ${warnings}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n🚨 CRITICAL: Some tests failed! Fix before proceeding.');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('\n⚠️ WARNING: Review warnings. May proceed with caution.');
  } else {
    console.log('\n✅ SUCCESS: All tests passed! Safe to proceed to Step 3.');
  }
}

// 执行测试
runAllTests().catch(console.error);