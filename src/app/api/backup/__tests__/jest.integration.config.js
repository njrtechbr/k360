module.exports = {
  displayName: 'Backup API Integration Tests',
  testEnvironment: 'node',
  rootDir: process.cwd(),
  testMatch: [
    '<rootDir>/src/app/api/backup/__tests__/*.integration.test.ts'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  testTimeout: 30000,
  maxWorkers: 2,
  collectCoverageFrom: [
    'src/app/api/backup/**/*.ts',
    'src/services/backup*.ts',
    '!src/app/api/backup/__tests__/**',
    '!**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  clearMocks: true,
  restoreMocks: true,
  verbose: true
};