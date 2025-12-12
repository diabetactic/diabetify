const fs = require('fs');
const path = require('path');

// Mock MCP object
const mcp = {
  screenshot: async (options) => console.log(`  [MCP] Screenshot: ${options.name}`),
  tap: async (options) => console.log(`  [MCP] Tap: ${options.element}`),
  type: async (options) => console.log(`  [MCP] Type '${options.text}' into ${options.element}`),
  waitFor: async (options) => console.log(`  [MCP] Wait for: ${options.element}`),
  verify: async (options) => console.log(`  [MCP] Verify: ${options.element}`),
};

// Global runTest function
global.runTest = async (testName, testFn) => {
  console.log(`\nRunning test: ${testName}`);
  try {
    await testFn(mcp);
    console.log(`PASS: ${testName}`);
  } catch (error) {
    console.error(`FAIL: ${testName}`);
    console.error(error);
    process.exit(1);
  }
};

// Find and run all test files
const testsDir = path.join(__dirname, 'tests');

const findTestFiles = (dir) => {
  let testFiles = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      testFiles = testFiles.concat(findTestFiles(filePath));
    } else if (file.endsWith('.test.js')) {
      testFiles.push(filePath);
    }
  }
  return testFiles;
};

const run = async () => {
  const testFiles = findTestFiles(testsDir);
  for (const file of testFiles) {
    console.log(`\nFound test file: ${file}`);
    require(file);
  }
};

run();
