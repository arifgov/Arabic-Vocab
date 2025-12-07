# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: "Arabic Vocab Trainer" (or your choice)
4. Disable Google Analytics (optional, to keep it simple)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** > **Get started**
2. Click **Sign-in method** tab
3. Enable **Google**:
   - Click on Google
   - Toggle "Enable"
   - Set support email
   - Click "Save"
4. Enable **Apple**:
   - Click on Apple
   - Toggle "Enable"
   - You'll need an Apple Developer account for production
   - For testing, you can use the default settings
   - Click "Save"

## Step 3: Create Firestore Database

1. Go to **Firestore Database** > **Create database**
2. Start in **test mode** (for development)
3. Choose a location (closest to your users)
4. Click "Enable"

### Set up Firestore Security Rules

Go to **Firestore Database** > **Rules** and use:

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
      // Admin can read/write any user's data (for admin portal)
      allow read, write: if isAdmin();
      
      // Regular users can only read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click "Publish"

**Note**: These rules allow the admin user (`arif@govani.org`) to access all user data for the admin portal. See `FIRESTORE_RULES.md` for more details.

## Step 4: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`)
4. Register app with nickname: "Arabic Vocab Web"
5. Copy the Firebase configuration object

## Step 5: Update Your Code

Open `public/index.html` and find the Firebase configuration section (around line 20-30). Replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",           // Replace with your API key
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",  // Replace with your auth domain
  projectId: "YOUR_PROJECT_ID",     // Replace with your project ID
  storageBucket: "YOUR_PROJECT_ID.appspot.com",  // Replace with your storage bucket
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with your sender ID
  appId: "YOUR_APP_ID"              // Replace with your app ID
};
```

## Step 6: Configure OAuth Redirect URLs

### For Google:
- In Firebase Console > Authentication > Sign-in method > Google
- Add authorized domains if needed (usually not needed for web apps)

### For Apple:
- Requires Apple Developer account
- Configure Service ID in Apple Developer Console
- Add redirect URLs in Firebase

## Step 7: Test

1. Start your local server
2. Open the app in a browser
3. You should see the login screen
4. Try signing in with Google
5. Check Firestore Database to see if user data is created

## Troubleshooting

### "Firebase: Error (auth/operation-not-allowed)"
- Make sure the sign-in method is enabled in Firebase Console

### "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to authorized domains in Firebase Console > Authentication > Settings

### Apple Sign In not working
- Apple Sign In requires HTTPS (or localhost for development)
- Make sure you've configured Apple Developer account properly

## Production Deployment

1. Update Firestore rules for production (more restrictive)
2. Enable App Check for additional security
3. Set up custom domain if needed
4. Configure CORS if hosting on different domain

## Cost Estimate

- **Free Tier**: 50K MAU (Monthly Active Users), 1GB Firestore storage
- **After Free Tier**: Pay-as-you-go, very affordable for small apps
- Estimated cost for 1000 users: ~$0-5/month



