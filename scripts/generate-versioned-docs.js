const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const packageJson = require('../package.json');

const execFileAsync = promisify(execFile);

// Get the current version from package.json
const version = packageJson.version;
console.log(`Generating documentation for version ${version}`);

// Validate the version string to prevent path traversal or injection attacks
function isValidVersion(ver) {
  // Allow only semantic versioning format (numbers and dots)
  return /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.]+)?(?:\+[a-zA-Z0-9.]+)?$/.test(ver);
}

if (!isValidVersion(version)) {
  console.error('Invalid version format in package.json');
  process.exit(1);
}

// Create the versioned directory structure
const docsBaseDir = path.join(__dirname, '../docs');
const versionedDocsDir = path.join(docsBaseDir, `v${version}`);

// Function to delete old versions if needed
function cleanupOldVersions() {
  console.log('Checking for old documentation versions to clean up...');
  
  // Get all version directories
  const versionDirs = fs.readdirSync(docsBaseDir)
    .filter(dir => dir.startsWith('v') && fs.statSync(path.join(docsBaseDir, dir)).isDirectory())
    .map(dir => ({ 
      name: dir, 
      version: dir.substring(1),
      path: path.join(docsBaseDir, dir)
    }))
    .filter(dir => isValidVersion(dir.version));
  
  // Check if current version already exists (to be replaced)
  const currentVersionDir = versionDirs.find(dir => dir.version === version);
  if (currentVersionDir) {
    console.log(`Removing existing documentation for version ${version}`);
    fs.rmSync(currentVersionDir.path, { recursive: true, force: true });
  }
  
  console.log('Old documentation cleanup completed.');
}

// Run TypeDoc with a temporary configuration
const tempConfigPath = path.join(__dirname, '../typedoc.versioned.json');

// Create a modified TypeDoc config with the versioned output directory
const typeDocConfig = require('../typedoc.json');
const versionedConfig = {
  ...typeDocConfig,
  out: `docs/v${version}`
};

// Write the temporary config file
fs.writeFileSync(tempConfigPath, JSON.stringify(versionedConfig, null, 2));

async function generateDocs() {
  try {
    // Clean up old versions first
    cleanupOldVersions();
    
    // Run TypeDoc with the versioned configuration - SECURE VERSION
    console.log('Running TypeDoc...');
    // Use execFile to avoid shell injection vulnerabilities (CWE-78)
    const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    await execFileAsync(npxPath, ['typedoc', '--options', tempConfigPath], {
      stdio: 'inherit' // Show output in console
    });
    
    // Create or update the index.html redirect
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0; url=./v${version}/index.html">
        </head>
        <body>
          <p>Redirecting to the latest version...</p>
          <script>
            window.location.href = "./v${version}/index.html";
          </script>
        </body>
      </html>
    `;
    
    fs.writeFileSync(path.join(docsBaseDir, 'index.html'), redirectHtml);
    
    // Create a versions.json file that lists all available versions
    const versions = fs.readdirSync(docsBaseDir)
      .filter(dir => dir.startsWith('v') && fs.statSync(path.join(docsBaseDir, dir)).isDirectory())
      .map(dir => dir.substring(1))
      .filter(isValidVersion); // Filter out any invalid versions for added security

    fs.writeFileSync(
      path.join(docsBaseDir, 'versions.json'),
      JSON.stringify(versions, null, 2)
    );
    
    console.log(`Documentation for version ${version} generated successfully.`);
    console.log(`Access the latest documentation at: docs/index.html`);
    
  } catch (error) {
    console.error('Error generating documentation:', error);
    process.exit(1);
  } finally {
    // Clean up the temporary config file
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath);
    }
  }
}

// Execute the async function
generateDocs();