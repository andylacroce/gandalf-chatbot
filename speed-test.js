// speed-test.js
/**
 * This script runs test files and reports execution times.
 * It supports both sequential and parallel test execution.
 * It helps identify slow test files for targeted optimization.
 */

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const parallelMode = args.includes('--parallel') || args.includes('-p');
const maxConcurrency = (() => {
  const index = args.findIndex(arg => arg === '--concurrency' || arg === '-c');
  return index >= 0 && args[index + 1] ? parseInt(args[index + 1], 10) : 
    Math.max(1, Math.floor(require('os').cpus().length / 2));
})();
const filter = (() => {
  const index = args.findIndex(arg => arg === '--filter' || arg === '-f');
  return index >= 0 && args[index + 1] ? new RegExp(args[index + 1]) : null;
})();
const showHelp = args.includes('--help') || args.includes('-h');

// Display help
if (showHelp) {
  console.log(`
Speed Test Runner
================
Options:
  --parallel, -p       Run tests in parallel
  --concurrency, -c N  Set max concurrent tests (default: half of CPU cores)
  --filter, -f REGEX   Only run tests matching the regular expression
  --help, -h           Show this help message

Examples:
  node speed-test.js                   # Run sequentially
  node speed-test.js -p                # Run in parallel
  node speed-test.js -p -c 4           # Run in parallel with max 4 concurrent tests
  node speed-test.js -f "Chat.*\\.test" # Only run tests with filenames matching regex
  `);
  process.exit(0);
}

// Get all test files
const getAllTestFiles = () => {
  let testFiles = [];
  
  const testsDir = path.join(__dirname, 'tests');
  if (fs.existsSync(testsDir)) {
    const files = fs.readdirSync(testsDir);
    testFiles = files
      .filter(file => file.endsWith('.test.tsx') || file.endsWith('.test.ts'))
      .map(file => path.join('tests', file));
  }
  
  // Apply filter if specified
  if (filter) {
    testFiles = testFiles.filter(file => filter.test(file));
  }
  
  return testFiles;
};

// Run a single test and return result
const runSingleTest = (file) => {
  return new Promise((resolve) => {
    console.log(`Running tests for ${file}...`);
    const start = Date.now();
    
    try {
      // Fixed CWE-78 vulnerability by using execFileSync with array arguments
      // instead of string command which could allow command injection
      execFileSync('npx', ['jest', file, '--silent'], { stdio: 'pipe' });
      const duration = Date.now() - start;
      console.log(`✓ ${file} completed in ${duration}ms`);
      resolve({ file, duration, success: true });
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`✗ ${file} failed in ${duration}ms`);
      resolve({ file, duration, success: false, error: error.message });
    }
  });
};

// Run tests in parallel
const runParallel = async (testFiles) => {
  console.log(`Running ${testFiles.length} test files in parallel (max ${maxConcurrency} at once)...\n`);
  
  const results = [];
  const runningTests = new Set();
  const queue = [...testFiles];
  
  const startNextTest = async () => {
    if (queue.length === 0) return;
    
    const file = queue.shift();
    runningTests.add(file);
    
    const result = await runSingleTest(file);
    results.push(result);
    runningTests.delete(file);
    
    // Start next test
    await startNextTest();
  };
  
  // Start initial batch of tests
  const initialBatch = Math.min(maxConcurrency, testFiles.length);
  const startPromises = [];
  
  for (let i = 0; i < initialBatch; i++) {
    startPromises.push(startNextTest());
  }
  
  // Wait for all tests to complete
  await Promise.all(startPromises);
  
  return results;
};

// Run tests sequentially
const runSequential = async (testFiles) => {
  console.log(`Running ${testFiles.length} test files sequentially...\n`);
  
  const results = [];
  
  for (const file of testFiles) {
    const result = await runSingleTest(file);
    results.push(result);
  }
  
  return results;
};

// Generate a simple horizontal bar chart
const generateBarChart = (results, maxBarLength = 40) => {
  const maxDuration = Math.max(...results.map(r => r.duration));
  
  console.log('\nPerformance Visualization:');
  console.log('=========================');
  
  results.slice(0, 10).forEach(({ file, duration, success }) => {
    const barLength = Math.max(1, Math.round((duration / maxDuration) * maxBarLength));
    const bar = '█'.repeat(barLength);
    const label = `${success ? '✓' : '✗'} ${file} (${duration}ms)`;
    console.log(`${label.padEnd(50)} ${bar}`);
  });
  
  if (results.length > 10) {
    console.log(`... and ${results.length - 10} more`);
  }
};

// Main function
const runTests = async () => {
  const testFiles = getAllTestFiles();
  
  if (testFiles.length === 0) {
    console.log('No test files found or matched the filter.');
    return;
  }
  
  console.log(`Found ${testFiles.length} test files.\n`);
  
  const startTime = Date.now();
  
  // Run tests in parallel or sequentially
  const results = parallelMode 
    ? await runParallel(testFiles)
    : await runSequential(testFiles);
  
  const totalTime = Date.now() - startTime;
  
  // Sort by execution time (slowest first)
  results.sort((a, b) => b.duration - a.duration);
  
  console.log('\nTest Execution Times (slowest first):');
  console.log('=====================================');
  results.forEach(({ file, duration, success }) => {
    console.log(`${success ? '✓' : '✗'} ${file}: ${duration}ms`);
  });
  
  // Show performance visualization
  generateBarChart(results);
  
  // Calculate stats
  const totalTestTime = results.reduce((sum, { duration }) => sum + duration, 0);
  const averageTime = Math.round(totalTestTime / results.length);
  const failedTests = results.filter(r => !r.success);
  
  console.log('\nSummary:');
  console.log('========');
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.length - failedTests.length}`);
  console.log(`Failed: ${failedTests.length}`);
  console.log(`Average test time: ${averageTime}ms`);
  console.log(`Total test time: ${totalTestTime}ms (sum of individual tests)`);
  console.log(`Total execution time: ${totalTime}ms (actual wall clock time)`);
  
  if (parallelMode && totalTestTime > 0 && totalTime > 0) {
    const speedup = (totalTestTime / totalTime).toFixed(2);
    console.log(`Speedup from parallelization: ${speedup}x`);
  }
  
  // Exit with error if any tests failed
  if (failedTests.length > 0) {
    process.exit(1);
  }
};

runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});