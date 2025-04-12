const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

// Get the current version from package.json
const version = packageJson.version;
console.log(`Generating documentation for version ${version}`);

// Create the versioned directory structure
const docsBaseDir = path.join(__dirname, '../docs');
const versionedDocsDir = path.join(docsBaseDir, `v${version}`);

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

try {
  // Run TypeDoc with the versioned configuration
  console.log('Running TypeDoc...');
  execSync(`npx typedoc --options ${tempConfigPath}`);
  
  // Create or update the latest symlink
  const latestDir = path.join(docsBaseDir, 'latest');
  if (fs.existsSync(latestDir)) {
    fs.unlinkSync(latestDir);
  }
  
  // On Windows, creating symlinks requires administrator privileges
  // or Developer Mode enabled, so we're just creating a redirect HTML
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
    .map(dir => dir.substring(1));

  fs.writeFileSync(
    path.join(docsBaseDir, 'versions.json'),
    JSON.stringify(versions, null, 2)
  );
  
  console.log(`Documentation for version ${version} generated successfully.`);
  console.log(`Access the latest documentation at: docs/index.html`);
  
} catch (error) {
  console.error('Error generating documentation:', error);
} finally {
  // Clean up the temporary config file
  if (fs.existsSync(tempConfigPath)) {
    fs.unlinkSync(tempConfigPath);
  }
}