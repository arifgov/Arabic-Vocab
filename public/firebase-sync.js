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
            // Save user email/name to Firestore when user ID is set
            this.saveUserInfo();
            // IMPORTANT: Do NOT process sync queue here!
            // On new device login, the queue might contain empty/stale data
            // that would overwrite good data in Firebase.
            // The sync queue will be processed after syncProgressFromServer() 
            // merges Firebase data with local data.
            console.log('📋 Sync enabled for user, queue has', this.syncQueue.length, 'items (will process after Firebase load)');
        }
    }
    
    // Call this AFTER loading from Firebase to process any pending updates
    processQueueAfterLoad() {
        if (this.syncEnabled && this.syncQueue.length > 0) {
            console.log('📤 Processing sync queue after Firebase load:', this.syncQueue.length, 'items');
            this.processSyncQueue();
        }
    }
    
    async saveUserInfo() {
        if (!this.syncEnabled || !this.userId || !this.db) {
            return;
        }
        
        try {
            // Get current user info from Firebase Auth
            let userEmail = null;
            let userName = null;
            if (window.firebaseAuth) {
                const currentUser = window.firebaseAuth.currentUser;
                if (currentUser && currentUser.uid === this.userId) {
                    userEmail = currentUser.email;
                    userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
                }
            }
            
            if (userEmail) {
                const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const userRef = doc(this.db, 'users', this.userId);
                
                // Update user info without overwriting progress
                await setDoc(userRef, {
                    email: userEmail,
                    name: userName,
                    displayName: userName,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
                
                console.log('✅ User info saved to Firestore:', userEmail);
            }
        } catch (error) {
            console.warn('⚠️ Error saving user info:', error);
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
        // If already syncing, DON'T return false - schedule a retry instead
        if (this.syncing) {
            console.log('⏳ Sync already in progress, will retry after current sync completes');
            // Schedule a retry after a short delay (the current sync will trigger another check)
            if (!this.syncTimer && this.pendingProgress) {
                this.syncTimer = setTimeout(() => {
                    this.performSync();
                }, this.syncDelay);
            }
            return false;
        }
        
        if (!this.pendingProgress) {
            return false;
        }

        this.syncing = true;
        const progressToSync = this.pendingProgress;
        this.pendingProgress = null;
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }

        // Track when this sync started for debugging
        const syncStartTime = Date.now();
        const localModifiedAt = progressToSync.localModifiedAt || syncStartTime;
        
        // Log detailed sync info for debugging
        console.log(`🔄 Starting sync:`);
        console.log(`   - Sync start time: ${new Date(syncStartTime).toLocaleTimeString()}`);
        console.log(`   - Data modified at: ${new Date(localModifiedAt).toLocaleTimeString()}`);
        console.log(`   - Word progress keys: ${Object.keys(progressToSync.wordProgress || {}).length}`);
        
        // Log a sample of the progress data for debugging
        const sampleWordIds = Object.keys(progressToSync.wordProgress || {}).slice(0, 3);
        sampleWordIds.forEach(id => {
            const wp = progressToSync.wordProgress[id];
            console.log(`   - Word ${id}: E→A=${wp.english_arabic_correct}, A→E=${wp.arabic_english_correct}, Mixed=${wp.mixed_correct}`);
        });
        
        // SANITIZE: Clean the progress data to ensure it's valid for Firestore
        // Remove undefined values, session-specific fields, and reduce data size
        const sanitizedProgress = {
            wordProgress: {},
            lessonStatus: progressToSync.lessonStatus || { 1: {}, 2: {} },
            lastBook: progressToSync.lastBook,
            lastLesson: progressToSync.lastLesson,
            lastMode: progressToSync.lastMode
        };
        
        // Only sync essential word progress fields (not session-specific ones)
        // This reduces document size significantly
        for (const [wordId, wp] of Object.entries(progressToSync.wordProgress || {})) {
            // Only include words that have some progress
            if (wp.english_arabic_correct || wp.arabic_english_correct || wp.mixed_correct || 
                wp.mastered || wp.correct_count > 0 || wp.incorrect_count > 0) {
                sanitizedProgress.wordProgress[wordId] = {
                    correct_count: wp.correct_count || 0,
                    incorrect_count: wp.incorrect_count || 0,
                    consecutive_correct: wp.consecutive_correct || 0,
                    mastered: wp.mastered || false,
                    english_arabic_correct: wp.english_arabic_correct || false,
                    arabic_english_correct: wp.arabic_english_correct || false,
                    mixed_correct: wp.mixed_correct || false
                    // Intentionally NOT syncing session_* fields - they're local only
                };
            }
        }
        
        const wordsWithProgress = Object.keys(sanitizedProgress.wordProgress).length;
        console.log(`   - Words with progress to sync: ${wordsWithProgress} (filtered from ${Object.keys(progressToSync.wordProgress || {}).length})`);

        // Check if lesson status has any meaningful data
        const hasLessonProgress = Object.values(sanitizedProgress.lessonStatus || {}).some(book => 
            Object.values(book || {}).some(lesson => 
                lesson.mastered || lesson.final_test_passed
            )
        );
        
        // CRITICAL: Don't write empty data to Firebase - this would overwrite real progress!
        if (wordsWithProgress === 0 && !hasLessonProgress) {
            console.log('⚠️ SKIPPING SYNC - No actual progress to sync (would overwrite server data)');
            this.syncing = false;
            return false;
        }
        
        console.log(`   - Has lesson progress: ${hasLessonProgress}`);

        try {
            const { doc, setDoc, getDoc, getDocFromServer, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userRef = doc(this.db, 'users', this.userId);
            
            // Get current user info from Firebase Auth to save email/name
            let userEmail = null;
            let userName = null;
            if (window.firebaseAuth) {
                const currentUser = window.firebaseAuth.currentUser;
                if (currentUser) {
                    userEmail = currentUser.email;
                    userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
                }
            }
            
            // CRITICAL: Load existing server data to check timestamps and prevent overwriting newer data
            const existingDoc = await getDocFromServer(userRef).catch(() => getDoc(userRef)); // Try server first, fallback to cache
            const existingData = existingDoc.exists() ? existingDoc.data() : {};
            const serverLocalTimestamp = existingData.localTimestamp || 0;
            const serverHasData = existingDoc.exists() && existingData.progress && 
                (Object.keys(existingData.progress.wordProgress || {}).length > 0 ||
                 Object.values(existingData.progress.lessonStatus || {}).some(book => 
                     Object.values(book || {}).some(lesson => lesson.mastered || lesson.final_test_passed)
                 ));
            
            console.log(`   - Server doc exists: ${existingDoc.exists()}`);
            console.log(`   - Server has data: ${serverHasData}`);
            if (serverLocalTimestamp) {
                console.log(`   - Server localTimestamp: ${serverLocalTimestamp} (${new Date(serverLocalTimestamp).toLocaleTimeString()})`);
            }
            console.log(`   - Local modified at: ${localModifiedAt} (${new Date(localModifiedAt).toLocaleTimeString()})`);
            
            // CRITICAL SAFEGUARD: Never overwrite server data if it's newer than local
            if (serverHasData && serverLocalTimestamp > localModifiedAt) {
                console.warn('⚠️ SKIPPING SYNC - Server data is NEWER than local data!');
                console.warn(`   - Server timestamp: ${new Date(serverLocalTimestamp).toLocaleTimeString()}`);
                console.warn(`   - Local timestamp: ${new Date(localModifiedAt).toLocaleTimeString()}`);
                console.warn('   - This prevents older local data from overwriting newer server data');
                this.syncing = false;
                return false;
            }
            
            // Additional safeguard: If server has substantial data but local has very little, be cautious
            const serverWordCount = Object.keys(existingData.progress?.wordProgress || {}).length;
            const localWordCount = wordsWithProgress;
            if (serverHasData && serverWordCount > 10 && localWordCount < 5) {
                console.warn('⚠️ SKIPPING SYNC - Server has substantial data but local has very little');
                console.warn(`   - Server words: ${serverWordCount}, Local words: ${localWordCount}`);
                console.warn('   - This prevents empty/minimal local data from overwriting substantial server data');
                this.syncing = false;
                return false;
            }
            
            // Build complete document - replace progress completely, preserve email/name
            const completeData = {
                progress: sanitizedProgress, // COMPLETE REPLACEMENT - no merging (sanitized to remove undefined)
                lastSync: serverTimestamp(), // Use Firestore serverTimestamp() function for lastSync
                updatedAt: new Date().toISOString(),
                localTimestamp: syncStartTime, // Use sync start time as the version
                // Preserve email/name from existing or use current user info
                email: userEmail || existingData.email || null,
                name: userName || existingData.name || existingData.displayName || null,
                displayName: userName || existingData.displayName || existingData.name || null
            };
            
            console.log('   - Sanitized progress word count:', Object.keys(sanitizedProgress.wordProgress).length);
            
            // Replace entire document - this ensures progress is completely overwritten
            // BUT only if we passed all the safeguards above
            console.log('   - About to write to Firestore (passed all safeguards)...');
            await setDoc(userRef, completeData);

            this.lastSyncTime = Date.now();
            console.log(`✅ Progress synced to Firestore (syncStartTime: ${syncStartTime})`);
            this.syncing = false;
            
            // CRITICAL: Check if new progress arrived while we were syncing
            // This prevents lost updates when user answers questions rapidly
            if (this.pendingProgress) {
                console.log('📤 New progress arrived during sync, syncing again...');
                // Use setTimeout to avoid stack overflow with rapid updates
                setTimeout(() => this.performSync(), 50);
            }
            
            return true;
        } catch (error) {
            // Check for specific Firestore errors
            let shouldRetry = true;
            
            if (error.code === 'permission-denied') {
                console.warn('⚠️ Firestore permission denied. Check your security rules.');
                shouldRetry = false; // Don't retry permission errors
            } else if (error.code === 'invalid-argument') {
                console.warn('⚠️ Firestore invalid-argument error. Data may be too large or contain invalid values.');
                console.warn('   - Progress words count:', Object.keys(sanitizedProgress.wordProgress || {}).length);
                shouldRetry = false; // Don't retry invalid data errors - they'll just fail again
            } else if (error.code === 'unavailable') {
                console.warn('⚠️ Firestore unavailable. Progress will be synced when connection is restored.');
            } else if (error.code === 'resource-exhausted') {
                console.warn('⚠️ Firestore rate limit reached. Will retry later.');
                // Increase delay for next sync
                this.minSyncInterval = Math.min(this.minSyncInterval * 2, 30000); // Max 30 seconds
            } else {
                console.warn('⚠️ Error saving progress to Firestore:', error.code || error.message);
            }
            
            this.syncing = false;
            
            // Only queue for retry on retryable errors
            if (shouldRetry) {
                this.syncQueue.push(progressToSync);
                // Schedule a retry for queued items
                setTimeout(() => this.processSyncQueue(), 1000);
            }
            
            return false;
        }
    }
    
    // Force immediate sync (e.g., when leaving a view or manual sync)
    async forceSync() {
        console.log('🔄 forceSync called:');
        console.log('   - syncEnabled:', this.syncEnabled);
        console.log('   - userId:', this.userId);
        console.log('   - syncing:', this.syncing);
        console.log('   - pendingProgress:', !!this.pendingProgress);
        console.log('   - db:', !!this.db);
        
        // Always load fresh data from localStorage for manual sync
        // This ensures we sync the absolute latest state
        if (this.syncEnabled && this.userId) {
            const currentProgress = localStorage.getItem('madinah_vocab_progress');
            if (currentProgress) {
                try {
                    const progressData = JSON.parse(currentProgress);
                    this.pendingProgress = progressData;
                    console.log('📦 Loaded fresh progress from localStorage for sync');
                    console.log('   - Word progress entries:', Object.keys(progressData.wordProgress || {}).length);
                    console.log('   - localModifiedAt:', progressData.localModifiedAt);
                } catch (e) {
                    console.error('Error parsing progress for sync:', e);
                }
            } else {
                console.warn('⚠️ No progress found in localStorage!');
            }
        } else {
            console.warn('⚠️ Sync not enabled or no userId:', { syncEnabled: this.syncEnabled, userId: this.userId });
        }
        
        // If a sync is already in progress, wait for it to complete then sync again
        if (this.syncing) {
            console.log('⏳ Sync in progress, waiting for completion...');
            // Wait for current sync to complete (up to 10 seconds)
            let waitCount = 0;
            while (this.syncing && waitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            if (this.syncing) {
                console.warn('⚠️ Sync still in progress after 10s, forcing new sync anyway');
                this.syncing = false;
            }
        }
        
        // Clear any pending timer since we're forcing sync now
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }
        
        // If there's pending progress, sync it immediately
        if (this.pendingProgress) {
            return this.performSync();
        }
        
        console.log('📭 No progress to sync');
        return false;
    }

    async loadProgress() {
        if (!this.syncEnabled || !this.userId) {
            return null;
        }

        try {
            // Import with getDocFromServer to bypass cache and get fresh data
            const { doc, getDocFromServer, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userRef = doc(this.db, 'users', this.userId);
            
            let userSnap;
            try {
                // Try to get fresh data from server (bypasses cache)
                console.log('📡 Fetching fresh data from Firestore server...');
                userSnap = await getDocFromServer(userRef);
                console.log('✅ Got fresh data from server');
            } catch (serverError) {
                // If server fetch fails (offline), fall back to cache
                console.log('⚠️ Server fetch failed, using cache:', serverError.message);
                userSnap = await getDoc(userRef);
            }

            if (userSnap.exists()) {
                const data = userSnap.data();
                const wordCount = Object.keys(data.progress?.wordProgress || {}).length;
                console.log(`📥 Progress loaded from Firestore: ${wordCount} words`);
                
                // Log sample of progress for debugging
                const sampleIds = Object.keys(data.progress?.wordProgress || {}).slice(0, 3);
                sampleIds.forEach(id => {
                    const wp = data.progress.wordProgress[id];
                    console.log(`   - ${id}: E→A=${wp.english_arabic_correct}, A→E=${wp.arabic_english_correct}`);
                });
                
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

