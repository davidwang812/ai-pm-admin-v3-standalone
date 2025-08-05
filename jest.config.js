/**
 * Jest Configuration
 * 前端测试框架配置
 */
module.exports = {
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 根目录
  roots: ['<rootDir>'],
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // 忽略路径
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/api/'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 覆盖率配置
  collectCoverage: false,
  collectCoverageFrom: [
    '_core/**/*.js',
    '_pages/**/*.js',
    '_components/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/test/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 转换器配置
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 全局变量
  globals: {
    'window': {},
    'document': {},
    'localStorage': {},
    'Chart': {}
  },
  
  // 清除模拟
  clearMocks: true,
  
  // 恢复模拟
  restoreMocks: true,
  
  // 显示测试报告
  verbose: true
};