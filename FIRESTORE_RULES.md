# Firestore Security Rules - Updated for Admin Portal

## Current Rules (With Admin Access)

Go to [Firebase Console](https://console.firebase.google.com/) > Your Project > **Firestore Database** > **Rules** and paste these rules:

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

## How to Update

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **arabic-vocab-trainer**
3. Navigate to **Firestore Database** > **Rules**
4. Replace the existing rules with the rules above
5. Click **Publish**

## Security Explanation

- **Admin Access**: The admin user (`arif@govani.org`) can read all users and write to any user's document. This allows the admin portal to:
  - List all users in the system
  - View any user's progress
  - Mark tests as complete on behalf of users
  
- **Regular User Access**: Regular users can only read/write their own data (their own user document). This ensures privacy and security for all users.

- **Authentication Required**: All operations require authentication (`request.auth != null`)

## Testing

After updating the rules:
1. Log in as `arif@govani.org`
2. Go to Admin Portal (`/admin`)
3. You should now be able to see all users
4. Try viewing a user's progress and marking tests as complete

## Important Notes

- ⚠️ These rules allow the admin to access all user data. Make sure only the admin email is trusted.
- To add more admins in the future, you can modify the `isAdmin()` function to check multiple emails or use a custom claim.
