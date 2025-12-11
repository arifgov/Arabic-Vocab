# Deployment Guide - Making Your App Live

This guide will help you deploy your Arabic Vocab Trainer app to Firebase Hosting, making it accessible to users worldwide.

## Prerequisites

1. **Firebase Account**: You already have one (since Auth/Firestore are configured)
2. **Firebase CLI**: Need to install if you haven't already
3. **Node.js**: Already installed (for running scripts)

## Step 1: Install Firebase CLI

Open PowerShell or Command Prompt and run:

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open your browser to authenticate. Make sure you're logging in with the same Google account that has access to your Firebase project (`arabic-vocab-trainer`).

## Step 3: Initialize Firebase Hosting

Navigate to your project directory:
```bash
cd "d:\MyApps\Arabic Vocab"
```

Initialize Firebase Hosting:
```bash
firebase init hosting
```

**Configuration prompts:**
1. **Select Firebase project**: Choose `arabic-vocab-trainer` (or your project)
2. **What do you want to use as your public directory?**: Type `public`
3. **Configure as a single-page app (rewrite all urls to /index.html)?**: Type `Yes`
4. **Set up automatic builds and deploys with GitHub?**: Type `No` (for now)
5. **File public/index.html already exists. Overwrite?**: Type `No`

This will create `firebase.json` and `.firebaserc` files.

## Step 4: Configure Firebase Hosting

The `firebase.json` file should look like this (already created):

```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|js|css|json)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "/sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      }
    ]
  }
}
```

## Step 5: Test Locally (Optional)

Test the production build locally:

```bash
firebase serve
```

Then open `http://localhost:5000` to test.

## Step 6: Deploy to Firebase Hosting

Deploy your app:

```bash
firebase deploy --only hosting
```

This will:
1. Upload all files in the `public` folder
2. Make your app available at: `https://arabic-vocab-trainer.web.app`
3. Also available at: `https://arabic-vocab-trainer.firebaseapp.com`

## Step 7: Set Up Custom Domain (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Hosting** in the left menu
4. Click **Add custom domain**
5. Follow the instructions to add your domain

## Step 8: Update Authorized Domains

Since your app uses Firebase Auth, you need to authorize your hosting domain:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** > **Settings** > **Authorized domains**
4. Add your Firebase Hosting domain (it should already be there automatically)
5. If using a custom domain, add that too

## Step 9: Update Firestore Security Rules (Important!)

Make sure your Firestore rules are set for production:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** > **Rules**
4. Use these rules (includes admin portal access):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'arif@govani.org';
    }
    
    // Users collection
    match /users/{userId} {
      // Admin can read/write any user's data
      allow read, write: if isAdmin();
      
      // Regular users can only read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish**.

**Note**: These rules allow the admin user (`arif@govani.org`) to access all user data for the admin portal functionality.

## Step 10: Verify Deployment

1. Visit your app: `https://arabic-vocab-trainer.web.app`
2. Test login functionality
3. Test progress saving/syncing
4. Test on mobile devices

## Future Updates

To update your app after making changes:

```bash
firebase deploy --only hosting
```

## Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Go to Firebase Console > Authentication > Settings > Authorized domains
- Add your Firebase Hosting domain

### "Permission denied" when deploying
- Make sure you're logged in: `firebase login`
- Verify you have access to the Firebase project

### Service Worker not working
- Check browser console for errors
- Clear browser cache and reload
- Service Worker should work automatically on Firebase Hosting

## Quick Deploy Command

After initial setup, you can deploy with one command:

```bash
cd "d:\MyApps\Arabic Vocab" && firebase deploy --only hosting
```

## Monitoring

- **Firebase Console** > **Hosting**: View deployment history and analytics
- **Firebase Console** > **Authentication**: Monitor user sign-ins
- **Firebase Console** > **Firestore**: Monitor database usage

## Cost

- **Firebase Hosting Free Tier**: 10 GB storage, 360 MB/day transfer
- **Firebase Auth**: Free (50K MAU)
- **Firestore**: Free tier (1 GB storage, 50K reads/day)

For a small app like this, you should stay well within the free tier!


