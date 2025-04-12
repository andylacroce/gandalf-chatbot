const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const packageJson = require('../package.json');

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
const projectRoot = path.resolve(__dirname, '..');
const docsBaseDir = path.join(projectRoot, 'docs');
const versionedDocsDir = path.join(docsBaseDir, `v${version}`);

// Make sure docs directory exists
if (!fs.existsSync(docsBaseDir)) {
  fs.mkdirSync(docsBaseDir, { recursive: true });
}

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

// Create a modified TypeDoc config with the versioned output directory
const typeDocConfigPath = path.join(projectRoot, 'typedoc.json');

if (!fs.existsSync(typeDocConfigPath)) {
  console.error(`TypeDoc config file not found at ${typeDocConfigPath}`);
  process.exit(1);
}

const typeDocConfig = require(typeDocConfigPath);
const versionedConfig = {
  ...typeDocConfig,
  out: `docs/v${version}`
};

// Write the config file to the project root
const tempConfigPath = path.join(projectRoot, 'typedoc.versioned.json');

// Write the temporary config file
fs.writeFileSync(tempConfigPath, JSON.stringify(versionedConfig, null, 2));

async function generateDocs() {
  try {
    // Clean up old versions first
    cleanupOldVersions();
    
    // Run TypeDoc with the versioned configuration
    console.log('Running TypeDoc...');
    
    // Use spawn for better cross-platform compatibility
    return new Promise((resolve, reject) => {
      // Ensure we're using the right command based on the platform
      const isWindows = process.platform === 'win32';
      
      // Run typedoc directly with the configured options
      const cmd = isWindows ? 'npx.cmd' : 'npx';
      const args = ['typedoc', '--options', 'typedoc.versioned.json'];
      
      console.log(`Executing: ${cmd} ${args.join(' ')}`);
      
      const child = spawn(cmd, args, {
        stdio: 'inherit', // Show output in console
        cwd: projectRoot // Run from project root to ensure relative paths work
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`TypeDoc process exited with code ${code}`));
        }
      });
      
      child.on('error', (err) => {
        console.error('TypeDoc process failed to start:', err);
        reject(err);
      });
    })
    .then(() => {
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
    });
    
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