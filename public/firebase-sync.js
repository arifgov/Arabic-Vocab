// Firebase Firestore Sync Module
class FirebaseSync {
    constructor() {
        this.db = null;
        this.userId = null;
        this.syncEnabled = false;
        this.syncQueue = [];
        this.syncing = false;
        this.pendingProgress = null;
        this.syncTimer = null;
        this.syncDelay = 200; // Reduced to 200ms for faster sync
        this.lastSyncTime = 0;
        this.minSyncInterval = 500; // Reduced to 500ms for faster sync
    }

    async init() {
        // Wait for Firebase to be initialized
        while (!window.firebaseDb) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.db = window.firebaseDb;
    }

    setUserId(userId) {
        this.userId = userId;
        this.syncEnabled = !!userId;
        if (this.syncEnabled) {
            this.processSyncQueue();
        }
    }

    async saveProgress(progressData) {
        if (!this.syncEnabled || !this.userId) {
            // Queue for later sync
            this.syncQueue.push(progressData);
            return false;
        }

        // Store the latest progress data (debounce - only keep the latest)
        this.pendingProgress = progressData;
        
        // Clear existing timer
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
        }
        
        // Check if we can sync immediately (enough time has passed)
        const now = Date.now();
        const timeSinceLastSync = now - this.lastSyncTime;
        
        if (timeSinceLastSync >= this.minSyncInterval) {
            // Sync immediately
            this.syncTimer = null;
            return this.performSync();
        } else {
            // Schedule sync after delay (debounce)
            this.syncTimer = setTimeout(() => {
                this.performSync();
            }, this.syncDelay);
            return false; // Will sync later
        }
    }
    
    async performSync() {
        if (!this.pendingProgress || this.syncing) {
            return false;
        }

        this.syncing = true;
        const progressToSync = this.pendingProgress;
        this.pendingProgress = null;
        this.syncTimer = null;

        try {
            const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userRef = doc(this.db, 'users', this.userId);
            
            await setDoc(userRef, {
                progress: progressToSync,
                lastSync: serverTimestamp(),
                updatedAt: new Date().toISOString()
            }, { merge: true });

            this.lastSyncTime = Date.now();
            console.log('✅ Progress synced to Firestore');
            this.syncing = false;
            return true;
        } catch (error) {
            // Check for specific Firestore errors
            if (error.code === 'permission-denied') {
                console.warn('⚠️ Firestore permission denied. Check your security rules.');
            } else if (error.code === 'unavailable') {
                console.warn('⚠️ Firestore unavailable. Progress will be synced when connection is restored.');
            } else if (error.code === 'resource-exhausted') {
                console.warn('⚠️ Firestore rate limit reached. Will retry later.');
                // Increase delay for next sync
                this.minSyncInterval = Math.min(this.minSyncInterval * 2, 30000); // Max 30 seconds
            } else {
                console.warn('⚠️ Error saving progress to Firestore:', error.code || error.message);
            }
            // Queue for retry
            this.syncQueue.push(progressToSync);
            this.syncing = false;
            return false;
        }
    }
    
    // Force immediate sync (e.g., when leaving a view or manual sync)
    async forceSync() {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }
        // If there's pending progress, sync it immediately
        if (this.pendingProgress) {
            return this.performSync();
        }
        // If no pending progress but we have a userId, try to load current progress and sync
        // This handles manual sync requests
        if (this.syncEnabled && this.userId) {
            // Try to get current progress from the app
            const currentProgress = localStorage.getItem('madinah_vocab_progress');
            if (currentProgress) {
                try {
                    const progressData = JSON.parse(currentProgress);
                    this.pendingProgress = progressData;
                    return this.performSync();
                } catch (e) {
                    console.error('Error parsing progress for sync:', e);
                }
            }
        }
        return false;
    }

    async loadProgress() {
        if (!this.syncEnabled || !this.userId) {
            return null;
        }

        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userRef = doc(this.db, 'users', this.userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                console.log('📥 Progress loaded from Firestore');
                return data.progress || null;
            }
            console.log('📭 No progress found in Firestore for this user');
            return null;
        } catch (error) {
            console.warn('⚠️ Error loading progress from Firestore (will continue with local storage):', error.code || error.message);
            // Don't throw - gracefully fall back to local storage
            return null;
        }
    }

    async processSyncQueue() {
        if (this.syncing || this.syncQueue.length === 0) {
            return;
        }

        this.syncing = true;
        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const progressData of queue) {
            await this.saveProgress(progressData);
        }

        this.syncing = false;
    }

    clearQueue() {
        this.syncQueue = [];
    }
}

// Global instance
window.firebaseSyncManager = new FirebaseSync();

