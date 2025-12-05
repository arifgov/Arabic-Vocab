// Firebase Configuration
// NOTE: In a production environment, these should be loaded from environment variables
// or a secure configuration service. For client-side Firebase apps, these values are
// considered public but should still be managed carefully.

// Firebase config is loaded from window.firebaseConfig set in index.html
// This file exists for documentation and potential future refactoring

export function getFirebaseConfig() {
    // Return config from window if available, otherwise throw error
    if (window.firebaseConfig) {
        return window.firebaseConfig;
    }
    throw new Error('Firebase configuration not found. Please ensure firebase-config is loaded.');
}
