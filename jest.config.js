module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**/*.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // 忽略 node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol)/)'
  ]
}; 