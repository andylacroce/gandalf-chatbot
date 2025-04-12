const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/$1', // Fixes path alias resolution
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lodash-es)/)', // Ensures Jest doesn't ignore ES modules that need transpiling
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Ensure test setup is loaded
  testMatch: [
    '<rootDir>/tests/**/*.test.(ts|tsx|js|jsx)',
    '<rootDir>/**/__tests__/**/*.(ts|tsx|js|jsx)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/'
  ],
  verbose: true,
  collectCoverage: false, // Set to true to generate coverage reports
  coverageDirectory: '<rootDir>/coverage',
};

module.exports = createJestConfig(customJestConfig);
