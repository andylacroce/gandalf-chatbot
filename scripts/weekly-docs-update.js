/**
 * Weekly documentation update script
 * 
 * This script checks if documentation needs to be regenerated
 * based on file changes and elapsed time since last update.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const UPDATE_INTERVAL_DAYS = 7; // How often to update docs if files changed
const DOCS_DIR = path.join(__dirname, '../docs');
const LAST_UPDATE_FILE = path.join(__dirname, '.last-docs-update');

function getLastModifiedDate(directory) {
  // Get the most recent modification time of any source file
  try {
    // Find the most recently modified files in the source directories
    const sources = [
      '../app',
      '../pages',
      '../src'
    ];
    
    let lastModified = 0;
    
    for (const source of sources) {
      const result = execSync(
        `git ls-files --full-name ${source} | xargs -I{} git log -1 --format="%at" -- {}`,
        { encoding: 'utf-8' }
      );
      
      const timestamps = result.trim().split('\n')
        .filter(ts => ts.trim() !== '')
        .map(ts => parseInt(ts.trim(), 10));
      
      if (timestamps.length > 0) {
        const maxTimestamp = Math.max(...timestamps);
        if (maxTimestamp > lastModified) {
          lastModified = maxTimestamp;
        }
      }
    }
    
    return lastModified * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error determining last modified date:', error);
    // In case of error, return current time to ensure docs are regenerated
    return Date.now();
  }
}

function getLastUpdateTime() {
  try {
    if (fs.existsSync(LAST_UPDATE_FILE)) {
      const content = fs.readFileSync(LAST_UPDATE_FILE, 'utf-8');
      return parseInt(content.trim(), 10);
    }
  } catch (error) {
    console.error('Error reading last update time:', error);
  }
  
  return 0; // If file doesn't exist or can't be read, return 0
}

function saveLastUpdateTime(timestamp) {
  try {
    fs.writeFileSync(LAST_UPDATE_FILE, timestamp.toString(), 'utf-8');
  } catch (error) {
    console.error('Error saving last update time:', error);
  }
}

function main() {
  // Ensure the docs directory exists
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const now = Date.now();
  const lastUpdateTime = getLastUpdateTime();
  const lastModified = getLastModifiedDate();
  
  // Check if update is needed
  const daysSinceLastUpdate = (now - lastUpdateTime) / (1000 * 60 * 60 * 24);
  const hasChanges = lastModified > lastUpdateTime;
  
  if (daysSinceLastUpdate >= UPDATE_INTERVAL_DAYS || hasChanges) {
    console.log('Generating updated documentation...');
    try {
      // Run the versioned docs generator
      execSync('npm run docs:versioned', { stdio: 'inherit' });
      
      // Save the current time as last update time
      saveLastUpdateTime(now);
      
      console.log('Documentation updated successfully.');
    } catch (error) {
      console.error('Error updating documentation:', error);
    }
  } else {
    console.log('Documentation is up to date. No update needed.');
  }
}

main();