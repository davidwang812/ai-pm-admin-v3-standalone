/**
 * Simplified Jest Configuration
 * For running tests without jsdom
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  setupFiles: ['<rootDir>/scripts/test-setup-simple.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  clearMocks: true,
  verbose: true
};