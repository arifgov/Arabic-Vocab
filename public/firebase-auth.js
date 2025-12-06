// Firebase Authentication Module
console.log('📦 firebase-auth.js loaded');

class FirebaseAuth {
    constructor() {
        console.log('🔧 FirebaseAuth constructor called');
        this.auth = null;
        this.user = null;
        this.onAuthStateChanged = null;
        this.authReady = false;  // Track if initial auth state is determined
        this._authReadyPromise = null;
        this._authReadyResolve = null;
    }

    // Returns a promise that resolves when auth state is first determined
    waitForAuthReady() {
        if (this.authReady) {
            return Promise.resolve(this.user);
        }
        if (!this._authReadyPromise) {
            this._authReadyPromise = new Promise(resolve => {
                this._authReadyResolve = resolve;
            });
        }
        return this._authReadyPromise;
    }

    _setAuthReady(user) {
        console.log('🎯 Setting auth ready with user:', user ? user.email : 'null');
        this.authReady = true;
        this.user = user;
        if (this._authReadyResolve) {
            this._authReadyResolve(user);
        }
    }

    async init() {
        console.log('🔄 Firebase Auth init() started...');
        console.log('📋 Version check: firebase-auth.js v5.0 (persistent auth)');
        
        // Wait for Firebase to be initialized
        let waitCount = 0;
        while (!window.firebaseAuth) {
            waitCount++;
            if (waitCount > 50) {
                console.error('❌ Timeout waiting for window.firebaseAuth');
                throw new Error('Firebase Auth not available');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.auth = window.firebaseAuth;
        console.log('✅ Firebase Auth initialized, auth object:', this.auth);
        
        // Check if there's already a current user (restored from persistence)
        // This can happen if Firebase already restored the session from IndexedDB
        if (this.auth.currentUser) {
            console.log('✅ Found existing user from persistence:', this.auth.currentUser.email);
            this.user = this.auth.currentUser;
            this._setAuthReady(this.auth.currentUser);
        }
        
        // Set up auth state listener
        console.log('🔄 Setting up auth state listener...');
        
        // Create a promise that resolves when we get the first auth state
        const firstAuthState = new Promise((resolve) => {
            this.auth.onAuthStateChanged((user) => {
                console.log('🔔 Firebase auth state changed:', user ? `user: ${user.email}, uid: ${user.uid}` : 'signed out');
                this.user = user;
                
                // Only resolve on first callback
                if (!this.authReady) {
                    console.log('🎯 First auth state received, setting ready...');
                    this._setAuthReady(user);
                    resolve(user);
                }
                
                if (this.onAuthStateChanged) {
                    console.log('📞 Calling onAuthStateChanged callback...');
                    this.onAuthStateChanged(user);
                } else {
                    console.warn('⚠️ onAuthStateChanged callback not set!');
                }
            });
        });
        console.log('✅ Auth state listener set up');
        
        // Check for redirect result (fallback for when popup was blocked)
        try {
            console.log('🔄 Checking for redirect result...');
            const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const redirectResult = await getRedirectResult(this.auth);
            if (redirectResult && redirectResult.user) {
                console.log('✅ Redirect result found, user:', redirectResult.user.email);
                // Auth state listener will handle this
            } else {
                console.log('ℹ️ No redirect result');
            }
        } catch (error) {
            console.error('❌ Error checking redirect result:', error.message);
        }
        
        // If not already ready, wait for first auth state (with longer timeout for slow connections)
        if (!this.authReady) {
            console.log('🔄 Waiting for auth state from persistence...');
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
            await Promise.race([firstAuthState, timeoutPromise]);
            
            // If still not ready, set it now
            if (!this.authReady) {
                console.log('⏰ Timeout waiting for auth state, using currentUser:', this.auth.currentUser?.email || 'null');
                this._setAuthReady(this.auth.currentUser);
            }
        }
        
        console.log('✅ Firebase Auth init() completed, authReady:', this.authReady, 'user:', this.user?.email);
    }

    async signInWithGoogle() {
        if (!this.auth) {
            throw new Error('Auth not initialized');
        }
        
        try {
            console.log('🔄 Loading Firebase Auth modules...');
            const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            
            console.log('🔄 Creating Google provider...');
            const provider = new GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            
            console.log('🔄 Opening Google sign-in popup...');
            const result = await signInWithPopup(this.auth, provider);
            console.log('✅ Google sign-in successful:', result.user.email);
            return result.user;
        } catch (error) {
            console.error('❌ Google sign-in error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // If popup blocked, fall back to redirect
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                console.log('🔄 Popup blocked/closed, trying redirect...');
                const { signInWithRedirect, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                const redirectProvider = new GoogleAuthProvider();
                redirectProvider.addScope('profile');
                redirectProvider.addScope('email');
                await signInWithRedirect(this.auth, redirectProvider);
                return null;
            }
            throw error;
        }
    }
    
    async checkRedirectResult() {
        // Note: getRedirectResult can only be called once per redirect
        // It's already called in init(), so this method just returns the current user
        // if they were authenticated via redirect
        if (!this.auth) {
            return null;
        }
        
        // Return the current user if they exist (they were set during init if redirect happened)
        return this.user;
    }

    async signInWithApple() {
        try {
            const { signInWithPopup, OAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const provider = new OAuthProvider('apple.com');
            provider.addScope('email');
            provider.addScope('name');
            
            const result = await signInWithPopup(this.auth, provider);
            return result.user;
        } catch (error) {
            console.error('Apple sign-in error:', error);
            // Apple Sign In might require redirect on some browsers
            if (error.code === 'auth/operation-not-supported-in-this-environment') {
                const { signInWithRedirect, getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                const provider = new OAuthProvider('apple.com');
                await signInWithRedirect(this.auth, provider);
                return null; // Will be handled by redirect result
            }
            throw error;
        }
    }

    async signOut() {
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(this.auth);
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    getCurrentUser() {
        return this.user;
    }

    isAuthenticated() {
        return this.user !== null;
    }
}

// Global instance
window.firebaseAuthManager = new FirebaseAuth();

