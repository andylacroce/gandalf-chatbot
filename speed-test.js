// speed-test.js
/**
 * This script runs each test file individually and reports execution times.
 * It helps identify slow test files for targeted optimization.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  
  return testFiles;
};

// Run tests and measure time
const runTests = () => {
  const testFiles = getAllTestFiles();
  console.log(`Found ${testFiles.length} test files.\n`);
  
  const results = [];
  
  for (const file of testFiles) {
    console.log(`Running tests for ${file}...`);
    const start = Date.now();
    
    try {
      execSync(`npx jest ${file} --silent`, { stdio: 'pipe' });
      const duration = Date.now() - start;
      results.push({ file, duration, success: true });
      console.log(`✓ Completed in ${duration}ms\n`);
    } catch (error) {
      const duration = Date.now() - start;
      results.push({ file, duration, success: false });
      console.log(`✗ Failed in ${duration}ms\n`);
    }
  }
  
  // Sort by execution time (slowest first)
  results.sort((a, b) => b.duration - a.duration);
  
  console.log('\nTest Execution Times (slowest first):');
  console.log('=====================================');
  results.forEach(({ file, duration, success }) => {
    console.log(`${success ? '✓' : '✗'} ${file}: ${duration}ms`);
  });
  
  console.log('\nTotal execution time (sequential):', results.reduce((sum, { duration }) => sum + duration, 0), 'ms');
};

runTests();