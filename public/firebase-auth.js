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
        console.log('📋 Version check: firebase-auth.js v3.0 (with authReady tracking)');
        
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
        
        // Check for redirect result FIRST before setting up listener
        // This ensures we know if this is a redirect login before onAuthStateChanged fires
        let redirectUser = null;
        try {
            console.log('🔄 Checking for redirect result...');
            const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            console.log('✅ getRedirectResult imported, calling it...');
            const redirectResult = await getRedirectResult(this.auth);
            console.log('📋 Redirect result:', redirectResult);
            if (redirectResult && redirectResult.user) {
                console.log('✅ Redirect result found, user:', redirectResult.user.email);
                redirectUser = redirectResult.user;
            } else {
                console.log('ℹ️ No redirect result found');
            }
        } catch (error) {
            console.error('❌ Error checking redirect result:', error);
            console.error('Error details:', error.message, error.stack);
        }
        
        // Now set up auth state listener
        console.log('🔄 Setting up auth state listener...');
        this.auth.onAuthStateChanged((user) => {
            console.log('🔔 Firebase auth state changed:', user ? `user: ${user.email}, uid: ${user.uid}` : 'signed out');
            this.user = user;
            
            // Mark auth as ready on first callback (or if redirect user found)
            if (!this.authReady) {
                this._setAuthReady(user);
            }
            
            if (this.onAuthStateChanged) {
                console.log('📞 Calling onAuthStateChanged callback...');
                this.onAuthStateChanged(user);
            } else {
                console.warn('⚠️ onAuthStateChanged callback not set!');
            }
        });
        console.log('✅ Auth state listener set up');
        
        // If we got a redirect user, make sure it's set and callback is triggered
        if (redirectUser) {
            console.log('🔄 Processing redirect user...');
            this.user = redirectUser;
            this._setAuthReady(redirectUser);
            if (this.onAuthStateChanged) {
                console.log('📞 Manually triggering onAuthStateChanged with redirect user...');
                this.onAuthStateChanged(redirectUser);
            }
        } else {
            // Wait a moment for auth state to be determined, then check currentUser
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (!this.authReady) {
                const currentUser = this.auth.currentUser;
                console.log('📋 Checking auth.currentUser:', currentUser ? `${currentUser.email} (${currentUser.uid})` : 'null');
                this._setAuthReady(currentUser);
                if (currentUser && this.onAuthStateChanged) {
                    console.log('📞 Triggering onAuthStateChanged with currentUser...');
                    this.onAuthStateChanged(currentUser);
                }
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
            const { signInWithRedirect, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            
            console.log('🔄 Creating Google provider...');
            const provider = new GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            
            console.log('🔄 Redirecting to Google sign-in...');
            await signInWithRedirect(this.auth, provider);
            // Return null - the redirect will handle the rest
            return null;
        } catch (error) {
            console.error('❌ Google sign-in error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
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

