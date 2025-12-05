// Firebase Authentication Module
class FirebaseAuth {
    constructor() {
        this.auth = null;
        this.user = null;
        this.onAuthStateChanged = null;
    }

    async init() {
        // Wait for Firebase to be initialized
        while (!window.firebaseAuth) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.auth = window.firebaseAuth;
        
        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            this.user = user;
            if (this.onAuthStateChanged) {
                this.onAuthStateChanged(user);
            }
        });
    }

    async signInWithGoogle() {
        if (!this.auth) {
            throw new Error('Auth not initialized');
        }
        
        try {
            console.log('🔄 Loading Firebase Auth modules...');
            const { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            
            // First, check if we're returning from a redirect
            try {
                const redirectResult = await getRedirectResult(this.auth);
                if (redirectResult && redirectResult.user) {
                    console.log('✅ Google sign-in successful (redirect)');
                    return redirectResult.user;
                }
            } catch (redirectError) {
                console.log('No redirect result:', redirectError);
            }
            
            console.log('🔄 Creating Google provider...');
            const provider = new GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            
            // Try popup first
            try {
                console.log('🔄 Attempting popup sign-in...');
                const result = await signInWithPopup(this.auth, provider);
                console.log('✅ Google sign-in successful (popup)');
                return result.user;
            } catch (popupError) {
                // If popup is blocked, fall back to redirect
                if (popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' ||
                    popupError.code === 'auth/cancelled-popup-request') {
                    console.log('⚠️ Popup blocked, falling back to redirect...');
                    console.log('🔄 Redirecting to Google sign-in...');
                    await signInWithRedirect(this.auth, provider);
                    // Return null - the redirect will handle the rest
                    return null;
                }
                throw popupError;
            }
        } catch (error) {
            console.error('❌ Google sign-in error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            throw error;
        }
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

