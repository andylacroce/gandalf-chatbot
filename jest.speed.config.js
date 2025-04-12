/**
 * @fileoverview Jest speed configuration for optimized test runs
 * 
 * This configuration file extends the base Jest configuration to optimize for performance.
 * It's designed to be used during active development with the `npm run test:dev` command.
 */

const baseConfig = require('./jest.config');

/**
 * Speed-optimized Jest configuration
 * Extends the base configuration with performance-focused settings
 * 
 * Key optimizations:
 * - Uses maximum CPU cores (100% of available workers)
 * - Skips coverage reporting to reduce overhead
 * - Minimizes console output
 * - Implements efficient caching strategies
 * - Bails on first test failure for immediate feedback
 * 
 * Usage:
 * ```
 * npm run test:dev
 * ```
 * 
 * @type {Function}
 * @returns {Promise<Object>} The resolved Jest configuration object
 */
module.exports = async () => {
  const config = await baseConfig();
  
  return {
    ...config,
    // Run with higher concurrency
    maxWorkers: '100%',
    
    // Skip coverage calculations to speed up tests
    collectCoverage: false,
    
    // Reduce console output to speed up tests
    verbose: false,
    
    // Use in-memory cache for faster execution
    cache: true,
    
    // Don't run watch mode
    watch: false,
    
    // Focus on core test functionality
    notify: false,
    
    // Bail after first failure to get quicker feedback
    bail: 1,
    
    // Additional speed optimizations
    
    // Set a larger cacheDirectory for better caching
    cacheDirectory: '<rootDir>/.jest-cache',
    
    // Speed up by avoiding unnecessary operations
    restoreMocks: false,
    
    // Avoid re-initialization between tests
    resetModules: false,
    
    // Ensure the transform properly processes JS/TS files
    transform: {
      '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest'],
    },
    
    // Make sure Jest can handle ES module syntax in the setup file
    transformIgnorePatterns: [
      '/node_modules/(?!(lodash-es)/)'
    ],
    
    // Disable automatic mocks which add overhead
    automock: false,
    
    // Skip console method mocks which add overhead
    clearMocks: false,
    
    // Run slow tests in parallel when possible
    testSequencer: '@jest/test-sequencer',
  };
};