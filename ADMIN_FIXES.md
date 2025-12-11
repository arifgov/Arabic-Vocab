# Admin Portal Fixes

## Issues Identified

1. **"Unknown User" Display**: User documents in Firestore don't have `email` and `name` fields saved
2. **Only 2 users showing instead of 4**: Only users who have synced to Firestore will appear
3. **Empty space in layout**: CSS layout issue

## Solutions Applied

### 1. Email/Name Saving
- Updated `firebase-sync.js` to save email/name when syncing progress
- Added `saveUserInfo()` method that saves email/name when user ID is set (on login)
- Future syncs will include email/name in Firestore documents

### 2. User Display
- Shows user ID when email/name is not available
- Better fallback display for users without email/name
- Added logging to debug user loading

### 3. Layout Fixes
- Added proper container styling
- Fixed empty space issue

## Important Notes

**For existing users showing as "Unknown User":**
- These users haven't synced since we added email/name saving
- Once they log in and sync (or you manually sync), their email/name will be saved
- Until then, they'll show with their User ID

**For missing users (only 2 out of 4 showing):**
- Only users who have **logged in and synced** will have documents in Firestore
- Users who haven't logged in yet won't appear in the admin portal
- This is expected behavior - users only get Firestore documents when they first sync

## Next Steps

1. Ask users to log in and sync (or use "Sync to Firebase Now" button)
2. Their email/name will be saved to Firestore
3. They'll then appear properly in the admin portal

## Manual Fix (If Needed)

If you want to manually add email/name for existing users:
1. Go to Firebase Console > Firestore Database
2. Find the user document in the `users` collection
3. Edit the document and add:
   - `email`: user's email address
   - `name`: user's display name
4. Save the document


