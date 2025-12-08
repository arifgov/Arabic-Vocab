#!/usr/bin/env node
/**
 * Version Management Script
 * 
 * This script:
 * 1. Checks if main.js has changed (using file hash)
 * 2. If changed, increments the patch version
 * 3. Updates all files with the new version
 * 
 * Usage:
 *   node scripts/update-version.js          # Auto-increment if main.js changed
 *   node scripts/update-version.js --force  # Force increment
 *   node scripts/update-version.js --patch  # Increment patch version
 *   node scripts/update-version.js --minor  # Increment minor version
 *   node scripts/update-version.js --major  # Increment major version
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION_FILE = path.join(__dirname, '..', 'version.json');
const MAIN_JS = path.join(__dirname, '..', 'public', 'main.js');
const SW_JS = path.join(__dirname, '..', 'public', 'sw.js');
const INDEX_HTML = path.join(__dirname, '..', 'public', 'index.html');
const HASH_FILE = path.join(__dirname, '..', '.mainjs-hash');

// Read current version
function getCurrentVersion() {
    if (fs.existsSync(VERSION_FILE)) {
        const data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
        return data.version;
    }
    return '1.0.0';
}

// Write version to file
function setVersion(version) {
    fs.writeFileSync(VERSION_FILE, JSON.stringify({ version }, null, 2) + '\n');
    console.log(`✅ Version updated to ${version}`);
}

// Increment version
function incrementVersion(currentVersion, type = 'patch') {
    const parts = currentVersion.split('.').map(Number);
    if (type === 'major') {
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
    } else if (type === 'minor') {
        parts[1]++;
        parts[2] = 0;
    } else {
        parts[2]++;
    }
    return parts.join('.');
}

// Calculate file hash
function getFileHash(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

// Check if main.js changed
function hasMainJsChanged() {
    const currentHash = getFileHash(MAIN_JS);
    if (!currentHash) {
        return false;
    }
    
    let previousHash = null;
    if (fs.existsSync(HASH_FILE)) {
        previousHash = fs.readFileSync(HASH_FILE, 'utf8').trim();
    }
    
    if (previousHash === currentHash) {
        return false;
    }
    
    // Save new hash
    fs.writeFileSync(HASH_FILE, currentHash);
    return true;
}

// Update sw.js
function updateSwJs(version) {
    if (!fs.existsSync(SW_JS)) {
        console.warn('⚠️  sw.js not found');
        return;
    }
    
    let content = fs.readFileSync(SW_JS, 'utf8');
    content = content.replace(
        /const APP_VERSION = ['"]([^'"]+)['"]/,
        `const APP_VERSION = '${version}'`
    );
    fs.writeFileSync(SW_JS, content);
    console.log(`✅ Updated sw.js`);
}

// Update index.html
function updateIndexHtml(version) {
    if (!fs.existsSync(INDEX_HTML)) {
        console.warn('⚠️  index.html not found');
        return;
    }
    
    let content = fs.readFileSync(INDEX_HTML, 'utf8');
    // Update all version query parameters
    content = content.replace(
        /\?v=(\d+\.\d+\.\d+)/g,
        `?v=${version}`
    );
    fs.writeFileSync(INDEX_HTML, content);
    console.log(`✅ Updated index.html`);
}

// Update package.json
function updatePackageJson(version) {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json`);
}

// Sync version across all files (without incrementing)
function syncVersion(version) {
    console.log(`🔄 Syncing version ${version} across all files...`);
    updateSwJs(version);
    updateIndexHtml(version);
    updatePackageJson(version);
    console.log(`✅ Version ${version} synced across all files`);
}

// Main function
function main() {
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const patch = args.includes('--patch');
    const minor = args.includes('--minor');
    const major = args.includes('--major');
    const sync = args.includes('--sync');
    
    const currentVersion = getCurrentVersion();
    console.log(`📦 Current version: ${currentVersion}`);
    
    // If --sync flag, just sync without incrementing
    if (sync) {
        syncVersion(currentVersion);
        return;
    }
    
    // Determine if we should increment
    let shouldIncrement = false;
    let incrementType = 'patch';
    
    if (force || major || minor || patch) {
        shouldIncrement = true;
        if (major) incrementType = 'major';
        else if (minor) incrementType = 'minor';
        else incrementType = 'patch';
    } else {
        // Check if main.js changed
        if (hasMainJsChanged()) {
            console.log('📝 main.js has changed, incrementing patch version...');
            shouldIncrement = true;
            incrementType = 'patch';
        } else {
            console.log('✅ main.js unchanged, version not incremented');
            console.log('💡 Use --force to increment anyway, or --patch/--minor/--major for specific increments');
            // Still sync to ensure all files are in sync
            syncVersion(currentVersion);
            return;
        }
    }
    
    if (shouldIncrement) {
        const newVersion = incrementVersion(currentVersion, incrementType);
        console.log(`🔄 Incrementing ${incrementType} version: ${currentVersion} → ${newVersion}`);
        
        setVersion(newVersion);
        updateSwJs(newVersion);
        updateIndexHtml(newVersion);
        updatePackageJson(newVersion);
        
        console.log(`\n✨ Version update complete! New version: ${newVersion}`);
        console.log('📝 Remember to commit the version changes.');
    }
}

main();
