# Quick Deployment Steps

## ✅ Easiest Way: Use npx (No Installation Needed!)

Since Firebase CLI isn't recognized in your PowerShell, we'll use `npx` which doesn't require installation.

### Step 1: Login to Firebase

Run this command in PowerShell:

```powershell
npx firebase-tools login
```

This will:
- Download firebase-tools automatically (first time only)
- Open your browser to authenticate
- Save your credentials

### Step 2: Initialize Hosting (First Time Only)

Run:

```powershell
npx firebase-tools init hosting
```

When prompted:
1. Select project: **arabic-vocab-trainer**
2. Public directory: **public**
3. Single-page app: **Yes**
4. GitHub: **No**
5. Overwrite index.html: **No**

### Step 3: Deploy Your App

Run:

```powershell
npm run deploy
```

Or directly:

```powershell
npx firebase-tools deploy --only hosting
```

### Step 4: Your App is Live!

Visit: **https://arabic-vocab-trainer.web.app**

---

## Alternative: Install Firebase CLI Globally

If you prefer to install Firebase CLI globally:

1. **Install:**
   ```powershell
   npm install -g firebase-tools
   ```

2. **Close and reopen PowerShell** (important on Windows!)

3. **Then use:**
   ```powershell
   firebase login
   firebase deploy --only hosting
   ```

---

## Quick Reference

After first-time setup, just run:

```powershell
npm run deploy
```

Your app will be live at:
- https://arabic-vocab-trainer.web.app
- https://arabic-vocab-trainer.firebaseapp.com
