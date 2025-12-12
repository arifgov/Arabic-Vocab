# Quick Deployment Guide

## First Time Setup (One-time)

### Option A: Use npx (No Installation Needed - Recommended for Windows)

1. **Login to Firebase:**
   ```bash
   npx firebase-tools login
   ```

2. **Deploy:**
   ```bash
   npx firebase-tools deploy --only hosting
   ```

### Option B: Install Firebase CLI Globally

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```
   
   **⚠️ Windows Note:** After installation, you may need to:
   - Close and reopen PowerShell/Command Prompt, OR
   - Run: `refreshenv` (if you have Chocolatey), OR
   - Restart your computer

2. **Verify installation:**
   ```bash
   firebase --version
   ```

3. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Initialize Hosting (if not done already):**
   ```bash
   firebase init hosting
   ```
   - Select project: `arabic-vocab-trainer`
   - Public directory: `public`
   - Single-page app: `Yes`
   - GitHub: `No`
   - Overwrite index.html: `No`

## Deploy Your App

### Using npx (No Installation):
```bash
npx firebase-tools deploy --only hosting
```

### Using npm script (if Firebase CLI is installed):
```bash
npm run deploy
```

### Using Firebase CLI directly (if installed):
```bash
firebase deploy --only hosting
```

## Your App Will Be Live At:

- **Primary URL**: https://arabic-vocab-trainer.web.app
- **Secondary URL**: https://arabic-vocab-trainer.firebaseapp.com

## Important: Update Authorized Domains

After deploying, make sure Firebase Auth recognizes your domain:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `arabic-vocab-trainer`
3. Go to **Authentication** > **Settings** > **Authorized domains**
4. Your Firebase Hosting domain should be automatically added
5. If not, click **Add domain** and add: `arabic-vocab-trainer.web.app`

## Firestore Security Rules

Make sure your Firestore rules are set (in Firebase Console):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Test Your Live App

1. Visit: https://arabic-vocab-trainer.web.app
2. Try signing in with Google
3. Test creating/saving progress
4. Test on mobile device

## Updating the App

After making changes, simply run:
```bash
npm run deploy
```

Your changes will be live in a few seconds!

## Need Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions.



