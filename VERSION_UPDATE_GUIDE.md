# Version Update Guide

When releasing a new version of the app, follow these steps to ensure users get the latest version:

## Steps to Update Version

1. **Update Service Worker Version** (`public/sw.js`):
   - Change `APP_VERSION` constant (line 3)
   - Example: `const APP_VERSION = '1.0.1';`

2. **Update HTML Cache Busting** (`public/index.html`):
   - Update version query parameters in all script and link tags:
     - `styles.css?v=1.0.0` → `styles.css?v=1.0.1`
     - `firebase-auth.js?v=1.0.0` → `firebase-auth.js?v=1.0.1`
     - `firebase-sync.js?v=1.0.0` → `firebase-sync.js?v=1.0.1`
     - `main.js?v=1.0.0` → `main.js?v=1.0.1`
     - `admin.js?v=1.0.0` → `admin.js?v=1.0.1`
     - `sw.js?v=1.0.0` → `sw.js?v=1.0.1`
     - `manifest.json?v=1.0.0` → `manifest.json?v=1.0.1`

3. **Deploy to Firebase**:
   ```bash
   firebase deploy
   ```

## How It Works

- **Service Worker**: When the version changes, old caches are deleted and new ones are created
- **Cache Busting**: Query parameters (`?v=X.X.X`) force browsers to fetch new files instead of using cached versions
- **Auto-Update**: The service worker checks for updates every minute and prompts users to reload when a new version is detected

## Testing

After updating the version:
1. Clear your browser cache or use incognito mode
2. Load the app and check the console for version logs
3. Verify that new files are being loaded (check Network tab in DevTools)

## Version Numbering

Use semantic versioning:
- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features
- **Patch** (1.0.0 → 1.0.1): Bug fixes
