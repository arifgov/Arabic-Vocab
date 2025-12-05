// Firebase Authentication Module
console.log('📦 firebase-auth.js loaded');

class FirebaseAuth {
    constructor() {
        console.log('🔧 FirebaseAuth constructor called');
        this.auth = null;
        this.user = null;
        this.onAuthStateChanged = null;
    }

    async init() {
        console.log('🔄 Firebase Auth init() started...');
        console.log('📋 Version check: firebase-auth.js v2.0');
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
        
        // Listen for auth state changes FIRST
        // This will fire immediately if user is already authenticated (including from redirect)
        console.log('🔄 Setting up auth state listener...');
        this.auth.onAuthStateChanged((user) => {
            console.log('🔔 Firebase auth state changed:', user ? `user: ${user.email}, uid: ${user.uid}` : 'signed out');
            this.user = user;
            if (this.onAuthStateChanged) {
                console.log('📞 Calling onAuthStateChanged callback...');
                this.onAuthStateChanged(user);
            } else {
                console.warn('⚠️ onAuthStateChanged callback not set!');
            }
        });
        console.log('✅ Auth state listener set up');
        
        // Check for redirect result AFTER setting up listener
        // getRedirectResult can only be called once per redirect, so we do it here
        try {
            console.log('🔄 Checking for redirect result...');
            const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            console.log('✅ getRedirectResult imported, calling it...');
            const redirectResult = await getRedirectResult(this.auth);
            console.log('📋 Redirect result:', redirectResult);
            if (redirectResult && redirectResult.user) {
                console.log('✅ Redirect result found, user:', redirectResult.user.email);
                this.user = redirectResult.user;
                // Manually trigger the callback since auth state might have already fired
                if (this.onAuthStateChanged) {
                    console.log('📞 Manually triggering onAuthStateChanged with redirect user...');
                    this.onAuthStateChanged(redirectResult.user);
                }
            } else {
                console.log('ℹ️ No redirect result found (redirectResult:', redirectResult, ')');
                // Even if no redirect result, check current user
                const currentUser = this.auth.currentUser;
                console.log('📋 Checking auth.currentUser:', currentUser ? `${currentUser.email} (${currentUser.uid})` : 'null');
                if (currentUser) {
                    this.user = currentUser;
                    if (this.onAuthStateChanged) {
                        console.log('📞 Triggering onAuthStateChanged with currentUser...');
                        this.onAuthStateChanged(currentUser);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error checking redirect result:', error);
            console.error('Error details:', error.message, error.stack);
            // Fallback: check current user
            const currentUser = this.auth.currentUser;
            console.log('📋 Fallback: Checking auth.currentUser:', currentUser ? `${currentUser.email} (${currentUser.uid})` : 'null');
            if (currentUser) {
                this.user = currentUser;
                if (this.onAuthStateChanged) {
                    console.log('📞 Triggering onAuthStateChanged with fallback currentUser...');
                    this.onAuthStateChanged(currentUser);
                }
            }
        }
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

