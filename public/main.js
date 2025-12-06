// Madinah Arabic Vocab Trainer - Main Application Logic

class VocabTrainer {
    constructor() {
        this.books = { 1: [], 2: [] };
        this.currentBook = 1;
        this.currentLesson = null;
        this.currentMode = 'english-arabic';
        this.currentQuestion = null;
        this.questionPool = [];
        this.totalQuestions = 0; // Total questions in current session
        this.currentQuestionMode = null;
        this.reviewMistakesOnly = false;
        this.isFinalTest = false;
        this.sessionStats = {
            attempted: 0,
            correct: 0,
            incorrect: 0,
            weakWords: []
        };
        // Load progress immediately
        this.progress = this.loadProgress();
        console.log('Initial progress loaded:', this.progress);
        
        this.init();
    }
    
    async init() {
        console.log('🚀 App init() started');
        // Initialize Firebase
        await this.initFirebase();
        console.log('✅ initFirebase() completed');
        
        // Check auth state and show login if needed
        // This waits for auth to be fully ready before deciding what to show
        console.log('🔄 Calling checkAuthState()...');
        await this.checkAuthState();
        console.log('✅ checkAuthState() completed');
        
        await this.loadData();
        this.setupEventListeners();
        await this.showDashboard();
        this.updateGlobalStats();
    }
    
    async checkRedirectResult() {
        try {
            // Redirect result is already checked in firebase-auth.js init()
            // Just verify the user state and ensure UI is updated
            const user = window.firebaseAuthManager?.getCurrentUser();
            if (user) {
                console.log('✅ User is authenticated in checkRedirectResult:', user.email);
                // Ensure UI is updated (handleAuthStateChange should have done this, but double-check)
                this.updateUserUI(user);
                window.firebaseSyncManager.setUserId(user.uid);
                await this.syncProgressFromServer();
                this.hideLoginView();
                return true;
            } else {
                console.log('ℹ️ No user found in checkRedirectResult');
            }
        } catch (error) {
            console.error('❌ Error checking auth state:', error);
        }
        return false;
    }
    
    async initFirebase() {
        try {
            console.log('🔄 initFirebase() started');
            // Set up auth state listener FIRST, before init()
            // This ensures the callback is ready when redirect result is processed
            console.log('🔄 Setting up onAuthStateChanged callback...');
            window.firebaseAuthManager.onAuthStateChanged = (user) => {
                console.log('📞 onAuthStateChanged callback triggered with user:', user ? user.email : 'null');
                this.handleAuthStateChange(user);
            };
            
            // Initialize Firebase Auth (this will check redirect result and trigger callbacks)
            console.log('🔄 Calling firebaseAuthManager.init()...');
            console.log('📋 firebaseAuthManager exists?', !!window.firebaseAuthManager);
            console.log('📋 firebaseAuthManager.init exists?', typeof window.firebaseAuthManager?.init);
            try {
                await window.firebaseAuthManager.init();
                console.log('✅ firebaseAuthManager.init() completed');
            } catch (error) {
                console.error('❌ Error in firebaseAuthManager.init():', error);
                console.error('Error stack:', error.stack);
                throw error;
            }
            
            // Check current auth state directly from Firebase as a fallback
            console.log('🔄 Checking current auth state directly from Firebase...');
            if (window.firebaseAuth) {
                const currentUser = window.firebaseAuth.currentUser;
                console.log('📋 Firebase currentUser:', currentUser ? `${currentUser.email} (${currentUser.uid})` : 'null');
                if (currentUser && !window.firebaseAuthManager.getCurrentUser()) {
                    console.log('⚠️ Firebase has user but firebaseAuthManager doesn\'t - syncing state...');
                    window.firebaseAuthManager.user = currentUser;
                    if (window.firebaseAuthManager.onAuthStateChanged) {
                        window.firebaseAuthManager.onAuthStateChanged(currentUser);
                    }
                }
            }
            
            // Initialize Firebase Sync
            await window.firebaseSyncManager.init();
            
            console.log('✅ Firebase initialized');
        } catch (error) {
            console.error('Firebase initialization error:', error);
            console.error('Error stack:', error.stack);
            // Continue without Firebase if it fails
        }
    }
    
    async checkAuthState() {
        console.log('🔄 checkAuthState() called');
        
        // Wait for auth state to be fully determined (important after redirects)
        let user = null;
        if (window.firebaseAuthManager) {
            console.log('🔄 Waiting for auth to be ready...');
            user = await window.firebaseAuthManager.waitForAuthReady();
            console.log('✅ Auth ready, user:', user ? `${user.email} (${user.uid})` : 'null');
        } else {
            console.log('⚠️ firebaseAuthManager not available');
        }
        
        if (!user) {
            // Check if user previously skipped login
            const skippedLogin = localStorage.getItem('skipped_login');
            console.log('📋 Skipped login flag:', skippedLogin);
            if (!skippedLogin) {
                console.log('👤 No user and no skipped login - showing login view');
                this.showLoginView();
            } else {
                console.log('👤 No user but login was skipped - continuing without auth');
            }
        } else {
            console.log('✅ User is authenticated in checkAuthState, setting up sync...');
            // User is authenticated, set up sync
            window.firebaseSyncManager.setUserId(user.uid);
            // Try to load progress from Firestore
            await this.syncProgressFromServer();
            // Ensure UI is updated
            this.updateUserUI(user);
            this.hideLoginView();
        }
    }
    
    async handleAuthStateChange(user) {
        console.log('🔄 handleAuthStateChange called:', user ? `user: ${user.email}, uid: ${user.uid}` : 'signed out');
        if (user) {
            console.log('✅ User is authenticated, updating UI and syncing...');
            window.firebaseSyncManager.setUserId(user.uid);
            this.updateUserUI(user);
            // Sync progress from server when user signs in
            try {
                await this.syncProgressFromServer();
            } catch (error) {
                console.error('Error syncing progress:', error);
            }
            this.hideLoginView();
            console.log('✅ Login complete, UI updated');
        } else {
            console.log('ℹ️ User signed out');
            window.firebaseSyncManager.setUserId(null);
            this.hideUserUI();
        }
    }
    
    showLoginView() {
        const loginView = document.getElementById('login-view');
        loginView.style.display = 'flex';
        loginView.style.pointerEvents = 'auto';
        document.getElementById('app').style.display = 'none';
    }
    
    hideLoginView() {
        const loginView = document.getElementById('login-view');
        loginView.style.display = 'none';
        loginView.style.pointerEvents = 'none';
        document.getElementById('app').style.display = 'block';
    }
    
    updateUserUI(user) {
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        const dropdownUserName = document.getElementById('dropdown-user-name');
        const dropdownUserEmail = document.getElementById('dropdown-user-email');
        
        if (userMenu) userMenu.style.display = 'flex';
        if (userName) userName.textContent = user.displayName || 'User';
        if (userAvatar) userAvatar.textContent = user.displayName?.[0]?.toUpperCase() || '👤';
        if (dropdownUserName) dropdownUserName.textContent = user.displayName || 'User';
        if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || '';
    }
    
    hideUserUI() {
        const userMenu = document.getElementById('user-menu');
        if (userMenu) userMenu.style.display = 'none';
    }
    
    async syncProgressFromServer() {
        try {
            if (!window.firebaseSyncManager || !window.firebaseSyncManager.syncEnabled) {
                console.log('📭 Sync not enabled, skipping server sync');
                return;
            }
            
            const serverProgress = await window.firebaseSyncManager.loadProgress();
            if (serverProgress) {
                // Merge server progress with local (server wins on conflicts)
                console.log('📥 Merging server progress with local...');
                this.progress = this.mergeProgress(this.progress, serverProgress);
                this.saveProgress();
            } else {
                console.log('📭 No server progress found, using local storage');
            }
        } catch (error) {
            console.warn('⚠️ Error syncing from server (continuing with local storage):', error);
            // Don't throw - app should work with local storage only
        }
    }
    
    mergeProgress(local, server) {
        // Merge strategy: preserve progress (true values win over false)
        const merged = {
            wordProgress: {},
            lessonStatus: { 1: {}, 2: {} },
            lastBook: server.lastBook || local.lastBook,
            lastLesson: server.lastLesson || local.lastLesson,
            lastMode: server.lastMode || local.lastMode
        };
        
        // Merge word progress - true values win
        const allWordIds = new Set([
            ...Object.keys(local.wordProgress || {}),
            ...Object.keys(server.wordProgress || {})
        ]);
        
        allWordIds.forEach(id => {
            const localWp = local.wordProgress?.[id] || {};
            const serverWp = server.wordProgress?.[id] || {};
            merged.wordProgress[id] = {
                correct_count: Math.max(localWp.correct_count || 0, serverWp.correct_count || 0),
                incorrect_count: Math.max(localWp.incorrect_count || 0, serverWp.incorrect_count || 0),
                consecutive_correct: Math.max(localWp.consecutive_correct || 0, serverWp.consecutive_correct || 0),
                mastered: localWp.mastered || serverWp.mastered || false,
                english_arabic_correct: localWp.english_arabic_correct || serverWp.english_arabic_correct || false,
                arabic_english_correct: localWp.arabic_english_correct || serverWp.arabic_english_correct || false,
                mixed_correct: localWp.mixed_correct || serverWp.mixed_correct || false,
                session_english_arabic: localWp.session_english_arabic || false,
                session_arabic_english: localWp.session_arabic_english || false,
                session_mixed: localWp.session_mixed || false
            };
        });
        
        // Merge lesson status - final_test_passed true wins
        for (const book of [1, 2]) {
            const localLessons = local.lessonStatus?.[book] || {};
            const serverLessons = server.lessonStatus?.[book] || {};
            const allLessons = new Set([
                ...Object.keys(localLessons),
                ...Object.keys(serverLessons)
            ]);
            
            allLessons.forEach(lesson => {
                const localStatus = localLessons[lesson] || {};
                const serverStatus = serverLessons[lesson] || {};
                merged.lessonStatus[book][lesson] = {
                    mastered: localStatus.mastered || serverStatus.mastered || false,
                    final_test_passed: localStatus.final_test_passed || serverStatus.final_test_passed || false,
                    date_completed: localStatus.date_completed || serverStatus.date_completed || null
                };
            });
        }
        
        console.log('🔀 Merged progress - preserving all true values');
        return merged;
    }
    
    async loadData() {
        try {
            console.log('📥 Loading vocabulary data...');
            const [book1Res, book2Res] = await Promise.all([
                fetch('data/book1.json'),
                fetch('data/book2.json')
            ]);
            
            if (!book1Res.ok || !book2Res.ok) {
                throw new Error(`Failed to fetch data: Book1=${book1Res.status}, Book2=${book2Res.status}`);
            }
            
            this.books[1] = await book1Res.json();
            this.books[2] = await book2Res.json();
            
            console.log(`✅ Loaded Book 1: ${this.books[1].length} lessons`);
            console.log(`✅ Loaded Book 2: ${this.books[2].length} lessons`);
            
            // Initialize progress for all words
            this.initializeProgress();
        } catch (error) {
            console.error('❌ Error loading data:', error);
            alert('Failed to load vocabulary data. Please check that book1.json and book2.json exist in the data folder.\n\nError: ' + error.message);
        }
    }
    
    initializeProgress() {
        let initialized = false;
        
        for (const bookNum of [1, 2]) {
            this.books[bookNum].forEach(lesson => {
                lesson.items.forEach(item => {
                    if (!this.progress.wordProgress[item.id]) {
                        this.progress.wordProgress[item.id] = {
                            correct_count: 0,
                            incorrect_count: 0,
                            consecutive_correct: 0,
                            mastered: false,
                            english_arabic_correct: false,
                            arabic_english_correct: false,
                            mixed_correct: false,
                            session_english_arabic: false,
                            session_arabic_english: false,
                            session_mixed: false
                        };
                        initialized = true;
                    }
                });
            });
        }
        
        if (initialized) {
            this.saveProgress();
        }
    }
    
    // LocalStorage Management
    loadProgress() {
        const stored = localStorage.getItem('madinah_vocab_progress');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure structure is valid
                if (!parsed.wordProgress) parsed.wordProgress = {};
                if (!parsed.lessonStatus) parsed.lessonStatus = { 1: {}, 2: {} };
                if (!parsed.lessonStatus[1]) parsed.lessonStatus[1] = {};
                if (!parsed.lessonStatus[2]) parsed.lessonStatus[2] = {};
                return parsed;
            } catch (e) {
                console.error('Error parsing progress:', e);
            }
        }
        
        return {
            wordProgress: {},
            lessonStatus: { 1: {}, 2: {} },
            lastBook: 1,
            lastLesson: 1,
            lastMode: 'english-arabic',
            sessionState: null // Store session state for resume
        };
    }
    
    saveProgress() {
        if (!this.progress) {
            this.progress = this.loadProgress();
        }
        try {
            localStorage.setItem('madinah_vocab_progress', JSON.stringify(this.progress));
            console.log('💾 Progress saved to localStorage');
            
            // Also sync to Firestore if authenticated (non-blocking)
            if (window.firebaseSyncManager?.syncEnabled) {
                window.firebaseSyncManager.saveProgress(this.progress).catch(error => {
                    // Silently fail - local storage is the source of truth
                    console.warn('Background sync failed (local storage saved):', error.code || error.message);
                });
            }
        } catch (e) {
            console.error('❌ Error saving progress:', e);
            alert('Warning: Could not save progress. Check if localStorage is enabled.');
        }
    }
    
    getWordProgress(id) {
        // Always reload from localStorage to get latest data
        const latestProgress = this.loadProgress();
        this.progress = latestProgress;
        
        // Ensure wordProgress structure exists
        if (!this.progress.wordProgress) {
            this.progress.wordProgress = {};
        }
        
        const wp = this.progress.wordProgress[id];
        if (wp) {
            return wp;
        }
        
        // Return default if not found
        return {
            correct_count: 0,
            incorrect_count: 0,
            consecutive_correct: 0,
            mastered: false,
            // Track all three modes separately
            english_arabic_correct: false,  // Correct in English→Arabic mode
            arabic_english_correct: false,  // Correct in Arabic→English mode
            mixed_correct: false,           // Correct in Mixed mode
            // Session tracking for "in one go" mastery
            session_english_arabic: false,
            session_arabic_english: false,
            session_mixed: false
        };
    }
    
    setWordProgress(id, data) {
        // Always reload to get latest data first
        this.progress = this.loadProgress();
        
        // Ensure wordProgress object exists
        if (!this.progress.wordProgress) {
            this.progress.wordProgress = {};
        }
        
        // Merge with existing data
        const existing = this.progress.wordProgress[id] || {
            correct_count: 0,
            incorrect_count: 0,
            consecutive_correct: 0,
            mastered: false
        };
        
        // Update with new data
        this.progress.wordProgress[id] = { ...existing, ...data };
        
        // Save to localStorage and Firebase
        this.saveProgress();
        console.log('✅ Saved progress for', id, ':', this.progress.wordProgress[id]);
        console.log('📦 Total words in progress:', Object.keys(this.progress.wordProgress).length);
    }
    
    getLessonStatus(book, lesson) {
        return this.progress.lessonStatus[book]?.[lesson] || {
            mastered: false,
            final_test_passed: false,
            date_completed: null
        };
    }
    
    setLessonStatus(book, lesson, data) {
        if (!this.progress.lessonStatus[book]) {
            this.progress.lessonStatus[book] = {};
        }
        this.progress.lessonStatus[book][lesson] = {
            ...this.getLessonStatus(book, lesson),
            ...data
        };
        this.saveProgress();
    }
    
    resetAllProgress() {
        if (confirm('Are you sure you want to reset ALL progress? This cannot be undone.')) {
            localStorage.removeItem('madinah_vocab_progress');
            this.progress = this.loadProgress();
            this.initializeProgress();
            this.showDashboard();
            this.updateGlobalStats();
        }
    }
    
    resetLessonProgress(book, lesson) {
        if (confirm(`Are you sure you want to reset progress for Book ${book}, ${this.getLessonLabel(book, lesson)}?`)) {
            const lessonData = this.books[book].find(l => l.lesson === lesson);
            if (lessonData) {
                lessonData.items.forEach(item => {
                    this.setWordProgress(item.id, {
                        correct_count: 0,
                        incorrect_count: 0,
                        consecutive_correct: 0,
                        mastered: false,
                        english_arabic_correct: false,
                        arabic_english_correct: false,
                        mixed_correct: false,
                        session_english_arabic: false,
                        session_arabic_english: false,
                        session_mixed: false
                    });
                });
                this.setLessonStatus(book, lesson, { 
                    mastered: false, 
                    final_test_passed: false,
                    date_completed: null 
                });
                this.showLessonView(book, lesson);
            }
        }
    }
    
    // Mastery Logic
    isWordMastered(id) {
        // Always get fresh data
        const wp = this.getWordProgress(id);
        // Word is mastered if all three modes are correct
        return wp.mastered || (wp.english_arabic_correct && wp.arabic_english_correct && wp.mixed_correct);
    }
    
    updateWordMastery(id, mode, isCorrect) {
        const wp = this.getWordProgress(id);
        
        // Track session performance for this mode
        if (mode === 'english-arabic') {
            wp.session_english_arabic = isCorrect;
            if (isCorrect) {
                wp.english_arabic_correct = true;
            } else {
                // English-Arabic is STRICT: reset progress on wrong answer
                wp.english_arabic_correct = false;
                // Only reset mastered status if it was previously mastered
                if (wp.mastered) {
                    wp.mastered = false;
                }
            }
        } else if (mode === 'arabic-english') {
            wp.session_arabic_english = isCorrect;
            if (isCorrect) {
                wp.arabic_english_correct = true;
            }
            // Arabic-English is LENIENT: wrong answers don't reset progress
            // The word will still appear in weak words list and can be practiced again
            // but progress bar won't go backwards
        } else if (mode === 'mixed') {
            wp.session_mixed = isCorrect;
            if (isCorrect) {
                wp.mixed_correct = true;
            }
            // Mixed mode is LENIENT: wrong answers don't reset progress
            // The word will still appear in weak words list and can be practiced again
        }
        
        // Check if mastered (all three modes correct)
        // A word is mastered when you've answered it correctly in ALL three modes
        if (wp.english_arabic_correct && wp.arabic_english_correct && wp.mixed_correct && !wp.mastered) {
            wp.mastered = true;
            console.log(`✅ Word ${id} mastered! All three modes correct.`);
        }
        
        this.setWordProgress(id, wp);
    }
    
    // Check if lesson has passed final test
    hasPassedFinalTest(book, lesson) {
        const status = this.getLessonStatus(book, lesson);
        return status.final_test_passed || false;
    }
    
    // Check if lesson is ready for final test (all words mastered)
    isReadyForFinalTest(book, lesson) {
        const lessonData = this.books[book].find(l => l.lesson === lesson);
        if (!lessonData) return false;
        
        return lessonData.items.every(item => this.isWordMastered(item.id));
    }
    
    isLessonMastered(book, lesson) {
        // Lesson is mastered only if final test is passed
        return this.hasPassedFinalTest(book, lesson);
    }
    
    updateLessonMastery(book, lesson) {
        // This is now handled by final test completion
    }
    
    passFinalTest(book, lesson) {
        console.log(`🎯 Passing final test for Book ${book}, Lesson ${lesson}`);
        this.setLessonStatus(book, lesson, {
            final_test_passed: true,
            date_completed: new Date().toISOString().split('T')[0]
        });
        // Immediately reload progress to ensure it's in memory
        this.progress = this.loadProgress();
        console.log(`✅ Final test passed status saved:`, this.getLessonStatus(book, lesson));
        
        // Force sync to Firebase
        if (window.firebaseSyncManager?.syncEnabled) {
            window.firebaseSyncManager.forceSync();
        }
    }
    
    isLessonUnlocked(book, lesson) {
        // Lesson 1 is always unlocked
        if (lesson === 1) {
            console.log(`  ✅ Lesson 1 is always unlocked`);
            return true;
        }
        
        // Check if previous lesson has passed final test
        const prevLesson = this.books[book].find(l => l.lesson === lesson - 1);
        if (!prevLesson) {
            console.log(`  ⚠️ Previous lesson ${lesson - 1} not found, unlocking lesson ${lesson}`);
            return true;
        }
        
        const prevPassed = this.hasPassedFinalTest(book, lesson - 1);
        console.log(`  ${prevPassed ? '✅' : '❌'} Lesson ${lesson} unlock status: previous lesson passed = ${prevPassed}`);
        return prevPassed;
    }
    
    // UI Navigation
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    }
    
    async showDashboard() {
        // Reload progress to ensure we have latest data (from both localStorage and Firebase)
        this.progress = this.loadProgress();
        
        // If authenticated, try to sync from Firebase
        if (window.firebaseSyncManager?.syncEnabled) {
            try {
                const serverProgress = await window.firebaseSyncManager.loadProgress();
                if (serverProgress) {
                    // Merge server progress (server wins on conflicts)
                    this.progress = this.mergeProgress(this.progress, serverProgress);
                    // Save merged progress to localStorage
                    localStorage.setItem('madinah_vocab_progress', JSON.stringify(this.progress));
                }
            } catch (error) {
                console.warn('Could not load from Firebase, using local:', error);
            }
        }
        
        console.log('🏠 Dashboard: Reloaded progress,', Object.keys(this.progress.wordProgress || {}).length, 'words tracked');
        this.showView('dashboard-view');
        this.renderLessonsList();
        this.updateGlobalStats();
    }
    
    async showLessonView(book, lesson) {
        console.log(`📖 Showing lesson view: Book ${book}, Lesson ${lesson}`);
        this.currentBook = book;
        this.currentLesson = lesson;
        
        // Reload progress from localStorage to ensure we have latest data
        this.progress = this.loadProgress();
        
        this.showView('lesson-view');
        
        const lessonData = this.books[book].find(l => l.lesson === lesson);
        if (!lessonData) {
            console.error(`❌ Lesson ${lesson} not found in Book ${book}`);
            alert(`Lesson ${lesson} not found in Book ${book}`);
            await this.showDashboard();
            return;
        }
        
        console.log(`✅ Lesson data loaded: ${lessonData.lesson_label} with ${lessonData.items.length} words`);
        
        document.getElementById('lesson-title').textContent = 
            `Book ${book} – ${lessonData.lesson_label}`;
        
        this.updateLessonProgress(book, lesson);
        
        // Show/hide final test button
        const finalTestBtn = document.getElementById('final-test-btn');
        if (this.isReadyForFinalTest(book, lesson) && !this.hasPassedFinalTest(book, lesson)) {
            finalTestBtn.style.display = 'block';
        } else {
            finalTestBtn.style.display = 'none';
        }
    }
    
    showQuestionView() {
        this.showView('question-view');
        
        // Always reload progress before starting/resuming
        this.progress = this.loadProgress();
        
        // Check if we have a saved session state to resume
        const sessionKey = `session_${this.currentBook}_${this.currentLesson}_${this.currentMode}_${this.isFinalTest ? 'final' : 'normal'}`;
        const savedSession = localStorage.getItem(sessionKey);
        
        console.log('🔍 Checking for saved session:', sessionKey, savedSession ? 'Found' : 'Not found');
        
        if (savedSession && !this.reviewMistakesOnly && !this.isFinalTest) {
            try {
                const session = JSON.parse(savedSession);
                // Resume if there are remaining questions (even if mistakes were made, we can continue)
                if (session.questionPoolIds && session.questionPoolIds.length > 0) {
                    console.log('📂 Resuming previous session...');
                    this.sessionStats = {
                        attempted: session.attempted || 0,
                        correct: session.correct || 0,
                        incorrect: session.incorrect || 0,
                        weakWords: []
                    };
                    
                    // Reconstruct question pool from IDs
                    const lessonData = this.books[this.currentBook].find(l => l.lesson === this.currentLesson);
                    if (lessonData) {
                        this.questionPool = session.questionPoolIds
                            .map(id => lessonData.items.find(item => item.id === id))
                            .filter(item => item !== undefined); // Remove any not found
                        
                        // Reconstruct weak words from IDs
                        if (session.weakWords && Array.isArray(session.weakWords)) {
                            this.sessionStats.weakWords = session.weakWords
                                .map(id => lessonData.items.find(item => item.id === id))
                                .filter(item => item !== undefined);
                        }
                    }
                    
                    this.totalQuestions = session.totalQuestions || this.questionPool.length;
                    console.log(`✅ Resumed: ${this.sessionStats.attempted} attempted, ${this.questionPool.length} questions remaining`);
                    // Keep the session key - we'll update it as we progress
                } else {
                    // Start fresh if no questions remaining
                    console.log('📭 No questions remaining in saved session, starting fresh');
                    this.initializeNewSession();
                }
            } catch (e) {
                console.error('Error loading session state:', e);
                this.initializeNewSession();
            }
        } else {
            // Start fresh session
            this.initializeNewSession();
        }
        
        // Show/hide final test banner
        const finalTestBanner = document.getElementById('final-test-banner');
        if (this.isFinalTest) {
            finalTestBanner.style.display = 'flex';
        } else {
            finalTestBanner.style.display = 'none';
        }
        
        this.nextQuestion();
    }
    
    initializeNewSession() {
        this.sessionStats = {
            attempted: 0,
            correct: 0,
            incorrect: 0,
            weakWords: []
        };
        
        // Reset question pool to start fresh
        this.questionPool = [];
        
        // Reset session tracking for all words in current lesson (only if not final test)
        if (!this.isFinalTest) {
            this.resetSessionTracking();
        }
        
        // Initialize question pool and get total count
        this.questionPool = this.buildQuestionPool(
            this.currentBook,
            this.currentLesson,
            this.reviewMistakesOnly,
            this.isFinalTest || false,
            this.currentMode
        );
        this.totalQuestions = this.questionPool.length;
    }
    
    saveSessionState() {
        // Save session state if there are remaining questions (for resume functionality)
        // Save even if mistakes were made - user can continue where they left off
        if (!this.currentBook || !this.currentLesson) {
            return; // Can't save if we don't have book/lesson info
        }
        
        if (this.questionPool.length > 0 && !this.isFinalTest) {
            const sessionKey = `session_${this.currentBook}_${this.currentLesson}_${this.currentMode}_${this.isFinalTest ? 'final' : 'normal'}`;
            // Store question pool as IDs only (we'll reconstruct from lesson data)
            const questionPoolIds = this.questionPool.map(q => q.id);
            const sessionState = {
                sessionStats: { ...this.sessionStats },
                questionPoolIds: questionPoolIds, // Store IDs instead of full objects
                totalQuestions: this.totalQuestions,
                attempted: this.sessionStats.attempted,
                correct: this.sessionStats.correct,
                incorrect: this.sessionStats.incorrect,
                weakWords: this.sessionStats.weakWords.map(w => w.id) // Store IDs only
            };
            localStorage.setItem(sessionKey, JSON.stringify(sessionState));
            console.log('💾 Session state saved for resume:', questionPoolIds.length, 'questions remaining, attempted:', this.sessionStats.attempted);
        } else if (this.questionPool.length === 0) {
            // Clear session state if all questions are done
            const sessionKey = `session_${this.currentBook}_${this.currentLesson}_${this.currentMode}_${this.isFinalTest ? 'final' : 'normal'}`;
            localStorage.removeItem(sessionKey);
            console.log('🗑️ Session completed, cleared saved state');
        }
    }
    
    resetSessionTracking() {
        const lessonData = this.books[this.currentBook].find(l => l.lesson === this.currentLesson);
        if (lessonData) {
            lessonData.items.forEach(item => {
                const wp = this.getWordProgress(item.id);
                // Reset only temporary session tracking flags
                // DO NOT reset english_arabic_correct, arabic_english_correct, or mixed_correct - these track
                // permanent progress across sessions and should only be reset when a mistake is made
                wp.session_english_arabic = false;
                wp.session_arabic_english = false;
                wp.session_mixed = false;
                this.setWordProgress(item.id, wp);
            });
        }
    }
    
    showSummaryView() {
        // Check if this was a final test BEFORE showing summary
        if (this.isFinalTest) {
            const totalQuestions = this.sessionStats.attempted;
            const correctAnswers = this.sessionStats.correct;
            const passRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
            
            if (passRate === 100 && totalQuestions > 0) {
                // Passed final test!
                this.passFinalTest(this.currentBook, this.currentLesson);
                const message = `🎉 Congratulations!\n\nYou passed the final test with ${correctAnswers}/${totalQuestions} correct (100%)!\n\nYou can now proceed to the next lesson.`;
                alert(message);
                this.showLessonView(this.currentBook, this.currentLesson);
                return; // Don't show summary, go back to lesson view
            } else {
                // Failed - restart test (handled in nextQuestion)
                // Don't show summary, just restart
                return;
            }
        }
        
        // Regular session summary
        this.showView('summary-view');
        this.updateSummaryStats();
        this.renderWeakWords();
        
        // Show "Next Lesson" button if lesson is mastered
        const nextLessonBtn = document.getElementById('next-lesson-btn');
        if (this.isLessonMastered(this.currentBook, this.currentLesson)) {
            nextLessonBtn.style.display = 'block';
        } else {
            nextLessonBtn.style.display = 'none';
        }
    }
    
    // Rendering
    renderLessonsList() {
        const container = document.getElementById('lessons-list');
        if (!container) {
            console.error('❌ Lessons list container not found!');
            return;
        }
        
        container.innerHTML = '';
        
        // Always reload progress to ensure we have latest data
        this.progress = this.loadProgress();
        
        const lessons = this.books[this.currentBook];
        
        if (!lessons || lessons.length === 0) {
            console.error('❌ No lessons found for book', this.currentBook);
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-light);">No lessons available. Please check data files.</div>';
            return;
        }
        
        console.log(`📚 Rendering ${lessons.length} lessons for Book ${this.currentBook}`);
        
        lessons.forEach(lessonData => {
            const card = document.createElement('div');
            card.className = 'lesson-card';
            
            // Reload progress for each lesson check to ensure fresh data
            this.progress = this.loadProgress();
            
            const mastered = this.isLessonMastered(this.currentBook, lessonData.lesson);
            const unlocked = this.isLessonUnlocked(this.currentBook, lessonData.lesson);
            
            console.log(`  Lesson ${lessonData.lesson}: unlocked=${unlocked}, mastered=${mastered}`);
            
            // Count mastered words and correct answers
            let masteredCount = 0;
            let correctCount = 0;
            let attemptedCount = 0;
            
            lessonData.items.forEach(item => {
                const wp = this.getWordProgress(item.id);
                if (this.isWordMastered(item.id)) {
                    masteredCount++;
                }
                if (wp.correct_count > 0) {
                    correctCount++;
                }
                if (wp.correct_count > 0 || wp.incorrect_count > 0) {
                    attemptedCount++;
                }
            });
            
            let status = 'locked';
            let statusText = 'Locked';
            
            const finalTestPassed = this.hasPassedFinalTest(this.currentBook, lessonData.lesson);
            const readyForTest = this.isReadyForFinalTest(this.currentBook, lessonData.lesson);
            
            if (finalTestPassed) {
                status = 'completed';
                statusText = 'Completed';
                card.classList.add('completed');
            } else if (readyForTest) {
                status = 'in-progress';
                statusText = 'Final Test Ready';
                card.classList.add('in-progress');
            } else if (unlocked) {
                status = 'in-progress';
                statusText = 'In Progress';
                card.classList.add('in-progress');
            } else {
                card.classList.add('locked');
            }
            
            // Build stats text
            let statsText = `Mastered: ${masteredCount} / ${lessonData.items.length} words`;
            if (correctCount > masteredCount) {
                statsText += ` (${correctCount} correct`;
                if (attemptedCount > correctCount) {
                    statsText += `, ${attemptedCount} attempted`;
                }
                statsText += ')';
            } else if (attemptedCount > masteredCount) {
                statsText += ` (${attemptedCount} attempted)`;
            }
            
            card.innerHTML = `
                <div class="lesson-header">
                    <span class="lesson-title">${lessonData.lesson_label}</span>
                    <span class="lesson-status ${status}">${statusText}</span>
                </div>
                <div class="lesson-stats">
                    ${statsText}
                </div>
            `;
            
            if (unlocked) {
                card.style.cursor = 'pointer';
                // Use both click and mousedown to ensure it works
                const handleClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🖱️ Clicked on lesson ${lessonData.lesson} (Book ${this.currentBook})`);
                    try {
                        this.showLessonView(this.currentBook, lessonData.lesson);
                    } catch (error) {
                        console.error('Error showing lesson view:', error);
                        alert('Error loading lesson: ' + error.message);
                    }
                };
                card.addEventListener('click', handleClick);
                card.addEventListener('mousedown', (e) => {
                    if (e.button === 0) { // Left click only
                        e.preventDefault();
                    }
                });
            } else {
                card.style.cursor = 'not-allowed';
                // Add a tooltip or message for locked lessons
                card.title = 'Complete the previous lesson to unlock this one';
            }
            
            container.appendChild(card);
        });
        
        console.log('✅ Lessons list rendered');
    }
    
    updateGlobalStats() {
        let totalWords = 0;
        let totalMastered = 0;
        
        for (const bookNum of [1, 2]) {
            this.books[bookNum].forEach(lesson => {
                totalWords += lesson.items.length;
                totalMastered += lesson.items.filter(item => 
                    this.isWordMastered(item.id)
                ).length;
            });
        }
        
        document.getElementById('total-words').textContent = totalWords;
        document.getElementById('total-mastered').textContent = totalMastered;
    }
    
    updateLessonProgress(book, lesson) {
        const lessonData = this.books[book].find(l => l.lesson === lesson);
        if (!lessonData) return;
        
        // Always reload from localStorage to get latest data
        this.progress = this.loadProgress();
        
        const total = lessonData.items.length;
        
        // Calculate progress for each mode
        const englishArabicProgress = this.calculateModeProgress(lessonData.items, 'english-arabic');
        const arabicEnglishProgress = this.calculateModeProgress(lessonData.items, 'arabic-english');
        const mixedProgress = this.calculateModeProgress(lessonData.items, 'mixed');
        
        // Update English-Arabic progress
        this.updateModeProgress('english-arabic', englishArabicProgress, total);
        
        // Update Arabic-English progress
        this.updateModeProgress('arabic-english', arabicEnglishProgress, total);
        
        // Update Mixed progress
        this.updateModeProgress('mixed', mixedProgress, total);
    }
    
    calculateModeProgress(items, mode) {
        let completed = 0;
        
        items.forEach(item => {
            const wp = this.getWordProgress(item.id);
            
            if (mode === 'english-arabic') {
                // Completed if english_arabic_correct is true
                if (wp.english_arabic_correct) {
                    completed++;
                }
            } else if (mode === 'arabic-english') {
                // Completed if arabic_english_correct is true
                if (wp.arabic_english_correct) {
                    completed++;
                }
            } else if (mode === 'mixed') {
                // Completed if mixed_correct is true (independent tracking)
                if (wp.mixed_correct) {
                    completed++;
                }
            }
        });
        
        return completed;
    }
    
    updateModeProgress(mode, completed, total) {
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        const isCompleted = completed === total && total > 0;
        
        // Update progress bar
        const progressFill = document.getElementById(`progress-${mode}`);
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        // Update text
        const progressText = document.getElementById(`text-${mode}`);
        if (progressText) {
            progressText.textContent = `${completed} / ${total} words`;
        }
        
        // Update Go button
        const goButton = document.getElementById(`go-${mode}-btn`);
        if (goButton) {
            if (isCompleted) {
                goButton.disabled = true;
                goButton.textContent = '✓ Completed';
                goButton.classList.add('completed');
            } else {
                goButton.disabled = false;
                goButton.textContent = 'Go';
                goButton.classList.remove('completed');
            }
        }
        
        // Update card styling
        const card = goButton?.closest('.mode-progress-card');
        if (card) {
            if (isCompleted) {
                card.classList.add('completed');
            } else {
                card.classList.remove('completed');
            }
        }
    }
    
    // Question Generation
    buildQuestionPool(book, lesson, reviewMistakesOnly = false, isFinalTest = false, mode = null) {
        const lessonData = this.books[book].find(l => l.lesson === lesson);
        if (!lessonData) return [];
        
        let pool = lessonData.items;
        
        if (isFinalTest) {
            // Final test: use 75% of words, randomly selected
            const totalWords = pool.length;
            const testWordCount = Math.ceil(totalWords * 0.75);
            pool = [...pool].sort(() => Math.random() - 0.5).slice(0, testWordCount);
        } else if (mode === 'mixed') {
            // Mixed mode: use 75% of words, randomly selected
            const totalWords = pool.length;
            const testWordCount = Math.ceil(totalWords * 0.75);
            pool = [...pool].sort(() => Math.random() - 0.5).slice(0, testWordCount);
        } else if (reviewMistakesOnly) {
            pool = pool.filter(item => {
                const wp = this.getWordProgress(item.id);
                return !wp.mastered && wp.incorrect_count > 0;
            });
        } else {
            // Regular practice: use all words (each word shown once)
            // Don't filter by mastery - show all words once per session
            pool = [...lessonData.items];
        }
        
        // If all words are mastered and not final test, still use all words for practice
        if (pool.length === 0 && !isFinalTest) {
            pool = [...lessonData.items];
        }
        
        // Weight by difficulty (higher incorrect_count, lower consecutive_correct)
        pool.sort((a, b) => {
            const wpA = this.getWordProgress(a.id);
            const wpB = this.getWordProgress(b.id);
            const difficultyA = wpA.incorrect_count - wpA.consecutive_correct;
            const difficultyB = wpB.incorrect_count - wpB.consecutive_correct;
            return difficultyB - difficultyA;
        });
        
        return pool;
    }
    
    nextQuestion() {
        // Check if we've completed all questions
        if (this.questionPool.length === 0) {
            // If final test failed (made a mistake), restart it
            if (this.isFinalTest && this.sessionStats.incorrect > 0) {
                const message = `❌ Final Test Failed\n\nYou got ${this.sessionStats.incorrect} question(s) wrong.\n\nRestarting the final test...`;
                alert(message);
                // Restart final test - reset pool and stats
                this.sessionStats = {
                    attempted: 0,
                    correct: 0,
                    incorrect: 0,
                    weakWords: []
                };
                this.questionPool = this.buildQuestionPool(
                    this.currentBook,
                    this.currentLesson,
                    false,
                    true,
                    'mixed'
                );
                this.totalQuestions = this.questionPool.length;
                // Continue to next question
            } else {
                // Session complete - show summary
                this.showSummaryView();
                return;
            }
        }
        
        // Select random question from top 5 hardest (or all if less than 5)
        const topN = Math.min(5, this.questionPool.length);
        const randomIndex = Math.floor(Math.random() * topN);
        this.currentQuestion = this.questionPool.splice(randomIndex, 1)[0];
        
        // Determine mode
        let mode = this.currentMode;
        if (mode === 'mixed') {
            mode = Math.random() < 0.5 ? 'english-arabic' : 'arabic-english';
        }
        
        // Store current mode for mastery tracking
        this.currentQuestionMode = mode;
        
        this.renderQuestion(mode);
        this.updateQuestionStats();
    }
    
    getCurrentQuestionMode() {
        // Determine the actual mode being used for the current question
        if (this.currentMode === 'mixed') {
            // Check which UI is displayed
            if (document.getElementById('mcq-options').style.display !== 'none') {
                return 'english-arabic';
            } else {
                return 'arabic-english';
            }
        }
        return this.currentMode;
    }
    
    renderQuestion(mode) {
        const promptEl = document.getElementById('question-prompt');
        const mcqContainer = document.getElementById('mcq-options');
        const typingContainer = document.getElementById('typing-input-container');
        const feedbackEl = document.getElementById('feedback');
        const checkBtn = document.getElementById('check-btn');
        const nextBtn = document.getElementById('next-btn');
        
        // Reset UI
        feedbackEl.innerHTML = '';
        feedbackEl.className = 'feedback';
        checkBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        document.getElementById('answer-input').value = '';
        
        if (mode === 'english-arabic') {
            // English → Arabic MCQ
            promptEl.textContent = this.currentQuestion.english;
            promptEl.className = 'prompt';
            
            mcqContainer.style.display = 'block';
            typingContainer.style.display = 'none';
            
            this.renderMCQOptions();
        } else {
            // Arabic → English Typing
            promptEl.innerHTML = `
                <span class="arabic-text">${this.currentQuestion.arabic}</span>
                <!-- <span class="transliteration">${this.currentQuestion.transliteration}</span> -->
            `;
            promptEl.className = 'prompt arabic';
            
            mcqContainer.style.display = 'none';
            typingContainer.style.display = 'block';
            
            document.getElementById('answer-input').focus();
        }
    }
    
    renderMCQOptions() {
        const container = document.getElementById('mcq-options');
        container.innerHTML = '';
        
        const lessonData = this.books[this.currentBook].find(l => l.lesson === this.currentLesson);
        const correctId = this.currentQuestion.id;
        
        // Get distractors from same lesson
        const distractors = lessonData.items
            .filter(item => item.id !== correctId)
            .sort(() => Math.random() - 0.5)
            .slice(0, 4);
        
        const options = [this.currentQuestion, ...distractors]
            .sort(() => Math.random() - 0.5);
        
        options.forEach((item, index) => {
            const option = document.createElement('div');
            option.className = 'mcq-option';
            option.dataset.id = item.id;
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'answer';
            radio.value = item.id;
            radio.id = `option-${index}`;
            
            const label = document.createElement('label');
            label.className = 'mcq-option-label';
            label.htmlFor = `option-${index}`;
            label.innerHTML = `
                <span class="arabic-text">${item.arabic}</span>
                <!-- <span class="transliteration">${item.transliteration}</span> -->
            `;
            
            option.appendChild(radio);
            option.appendChild(label);
            
            option.addEventListener('click', () => {
                document.querySelectorAll('.mcq-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                radio.checked = true;
            });
            
            container.appendChild(option);
        });
    }
    
    // Lenient answer checking with fuzzy matching
    checkAnswerLenient(userAnswer, correctAnswer) {
        // Normalize both answers
        const normalizeText = (text) => {
            let normalized = text.toLowerCase().trim();
            
            // Remove all punctuation (including question marks, parentheses, etc.)
            normalized = normalized.replace(/[.,;:!?()[\]{}'"]/g, '');
            
            // Normalize gender markers - expand abbreviations
            normalized = normalized
                .replace(/\b(m)\b/g, 'masculine')
                .replace(/\bmasc\b/g, 'masculine')
                .replace(/\b(f)\b/g, 'feminine')
                .replace(/\bfem\b/g, 'feminine');
            
            // Normalize whitespace (collapse multiple spaces, trim)
            normalized = normalized.replace(/\s+/g, ' ').trim();
            
            return normalized;
        };
        
        const normalizedUser = normalizeText(userAnswer);
        const normalizedCorrect = normalizeText(correctAnswer);
        
        // Exact match after normalization
        if (normalizedUser === normalizedCorrect) {
            return true;
        }
        
        // Check if user answer contains the core meaning (without gender markers)
        const coreCorrect = normalizedCorrect
            .replace(/masculine/g, '')
            .replace(/feminine/g, '')
            .trim();
        const coreUser = normalizedUser
            .replace(/masculine/g, '')
            .replace(/feminine/g, '')
            .trim();
        
        if (coreUser === coreCorrect) {
            return true;
        }
        
        // Fuzzy match using Levenshtein distance
        // Allow up to 2 character differences for short words, more for longer words
        const maxDistance = Math.max(2, Math.floor(normalizedCorrect.length * 0.25));
        const distance = this.levenshteinDistance(normalizedUser, normalizedCorrect);
        
        if (distance <= maxDistance) {
            return true;
        }
        
        // Also check against core answer (without gender) with fuzzy matching
        const coreDistance = this.levenshteinDistance(coreUser, coreCorrect);
        if (coreDistance <= maxDistance) {
            return true;
        }
        
        return false;
    }
    
    // Levenshtein distance algorithm for fuzzy matching
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        
        // Create matrix
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Initialize first column and row
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        // Fill the matrix
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,      // deletion
                    dp[i][j - 1] + 1,      // insertion
                    dp[i - 1][j - 1] + cost // substitution
                );
            }
        }
        
        return dp[m][n];
    }
    
    checkAnswer() {
        const feedbackEl = document.getElementById('feedback');
        const checkBtn = document.getElementById('check-btn');
        const nextBtn = document.getElementById('next-btn');
        
        let isCorrect = false;
        const actualMode = this.getCurrentQuestionMode();
        
        if (actualMode === 'english-arabic') {
            // MCQ mode
            const selected = document.querySelector('input[name="answer"]:checked');
            if (!selected) {
                alert('Please select an answer');
                return;
            }
            
            isCorrect = selected.value === this.currentQuestion.id;
            
            // Highlight correct/incorrect
            document.querySelectorAll('.mcq-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.id === this.currentQuestion.id) {
                    opt.classList.add('correct');
                } else if (opt.dataset.id === selected.value && !isCorrect) {
                    opt.classList.add('incorrect');
                }
            });
        } else if (actualMode === 'arabic-english') {
            // Typing mode with lenient matching
            const userAnswer = document.getElementById('answer-input').value.trim();
            const correctAnswer = this.currentQuestion.english;
            
            isCorrect = this.checkAnswerLenient(userAnswer, correctAnswer);
        }
        
        // Update progress
        this.sessionStats.attempted++;
        
        // Get current progress
        const currentProgress = this.getWordProgress(this.currentQuestion.id);
        
        // Create updated progress object
        const updatedProgress = {
            correct_count: currentProgress.correct_count,
            incorrect_count: currentProgress.incorrect_count,
            consecutive_correct: currentProgress.consecutive_correct,
            mastered: currentProgress.mastered
        };
        
        if (isCorrect) {
            updatedProgress.correct_count++;
            updatedProgress.consecutive_correct++;
            this.sessionStats.correct++;
            feedbackEl.className = 'feedback correct';
            feedbackEl.innerHTML = '<strong>🎉 Correct! Well done!</strong>';
        } else {
            updatedProgress.incorrect_count++;
            updatedProgress.consecutive_correct = 0;
            this.sessionStats.incorrect++;
            this.sessionStats.weakWords.push(this.currentQuestion);
            feedbackEl.className = 'feedback incorrect';
            feedbackEl.innerHTML = '<strong>❌ Incorrect - Keep practicing!</strong>';
        }
        
        // Save updated progress (this also syncs to Firebase)
        this.setWordProgress(this.currentQuestion.id, updatedProgress);
        
        // Update mastery - use currentMode (not actualMode) so mixed mode tracks independently
        // actualMode is the UI mode (english-arabic or arabic-english randomly chosen for mixed)
        // but we want to track progress for the mode the user selected (mixed)
        this.updateWordMastery(this.currentQuestion.id, this.currentMode, isCorrect);
        
        // Save session state after each answer (for resume functionality)
        this.saveSessionState();
        
        // Update lesson mastery (for final test eligibility)
        if (this.isReadyForFinalTest(this.currentBook, this.currentLesson)) {
            // Lesson is ready for final test, but not yet mastered until test is passed
        }
        
        // Show correct answer with additional info
        const correctAnswerDiv = document.createElement('div');
        correctAnswerDiv.className = 'correct-answer';
        
        // Build the answer display
        let answerHTML = `<div><strong>${this.currentQuestion.english}</strong></div>`;
        answerHTML += `<div class="arabic-text">${this.currentQuestion.arabic}</div>`;
        
        // Show plural if available
        if (this.currentQuestion.plural) {
            answerHTML += `<div class="plural-info">Plural: <span class="arabic-text">${this.currentQuestion.plural}</span></div>`;
        }
        
        // If user got it wrong in typing mode, show what they typed
        if (!isCorrect && actualMode === 'arabic-english') {
            const userTyped = document.getElementById('answer-input').value.trim();
            if (userTyped) {
                answerHTML += `<div class="user-answer">You typed: "${userTyped}"</div>`;
            }
        }
        
        correctAnswerDiv.innerHTML = answerHTML;
        feedbackEl.appendChild(correctAnswerDiv);
        
        checkBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        
        this.updateQuestionStats();
    }
    
    updateQuestionStats() {
        const questionNumber = this.sessionStats.attempted + 1;
        const totalQuestions = this.totalQuestions || 0;
        const remaining = this.questionPool.length;
        
        // Show progress: "Question X / Total" or "Question X" if total not set
        if (totalQuestions > 0) {
            document.getElementById('question-number').textContent = `Question ${questionNumber} / ${totalQuestions}`;
        } else {
            document.getElementById('question-number').textContent = `Question ${questionNumber}`;
        }
        
        document.getElementById('question-correct-count').textContent = this.sessionStats.correct;
        document.getElementById('question-incorrect-count').textContent = this.sessionStats.incorrect;
    }
    
    updateSummaryStats() {
        document.getElementById('summary-attempted').textContent = this.sessionStats.attempted;
        document.getElementById('summary-correct').textContent = this.sessionStats.correct;
        document.getElementById('summary-incorrect').textContent = this.sessionStats.incorrect;
    }
    
    renderWeakWords() {
        const container = document.getElementById('weak-words-list');
        const uniqueWeakWords = Array.from(
            new Map(this.sessionStats.weakWords.map(w => [w.id, w])).values()
        );
        
        if (uniqueWeakWords.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--success-color); font-size: 1.125rem; font-weight: 500;">🎉 No weak words in this session. Great job!</div>';
            return;
        }
        
        // Keep the h3 that's already in HTML, just clear the rest
        const existingH3 = container.querySelector('h3');
        if (!existingH3) {
            container.innerHTML = '<h3>📌 Words to Review</h3>';
        }
        
        uniqueWeakWords.forEach(item => {
            const wordEl = document.createElement('div');
            wordEl.className = 'weak-word-item';
            wordEl.innerHTML = `
                <div>
                    <span class="english">${item.english}</span>
                </div>
                <div>
                    <span class="arabic-text">${item.arabic}</span>
                    <!-- <span class="transliteration">${item.transliteration}</span> -->
                </div>
            `;
            container.appendChild(wordEl);
        });
    }
    
    getLessonLabel(book, lesson) {
        const lessonData = this.books[book].find(l => l.lesson === lesson);
        return lessonData ? lessonData.lesson_label : `Lesson ${lesson}`;
    }
    
    // Event Listeners
    setupEventListeners() {
        // Single document-level click handler for all click events
        document.addEventListener('click', (e) => {
            // Login buttons
            if (e.target.closest('#google-login-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleGoogleLogin();
                return;
            }
            // Apple login disabled
            // if (e.target.closest('#apple-login-btn')) {
            //     e.preventDefault();
            //     e.stopPropagation();
            //     this.handleAppleLogin();
            //     return;
            // }
            if (e.target.closest('#skip-login-btn')) {
                e.preventDefault();
                e.stopPropagation();
                localStorage.setItem('skipped_login', 'true');
                this.hideLoginView();
                return;
            }
            
            // User dropdown - close if clicking outside
            const dropdown = document.getElementById('user-dropdown');
            const userBtn = document.getElementById('user-btn');
            if (dropdown && userBtn && !userBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        
        // User menu button - toggle dropdown
        const userBtn = document.getElementById('user-btn');
        if (userBtn) {
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('user-dropdown');
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                }
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                // Close dropdown first
                const dropdown = document.getElementById('user-dropdown');
                if (dropdown) dropdown.style.display = 'none';
                this.handleLogout();
            });
        }
        
        // Navigation home button
        const homeBtn = document.getElementById('nav-home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🏠 Home button clicked');
                await this.showDashboard();
                this.updateGlobalStats();
            });
        } else {
            console.error('❌ nav-home-btn not found!');
        }
        
        // Also make the nav brand clickable as home (common UX pattern)
        const navBrand = document.querySelector('.nav-brand');
        if (navBrand) {
            navBrand.style.cursor = 'pointer';
            navBrand.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🏠 Nav brand clicked');
                await this.showDashboard();
                this.updateGlobalStats();
            });
        }
        
        // Book selector
        document.querySelectorAll('.book-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.book-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentBook = parseInt(btn.dataset.book);
                this.showDashboard();
            });
        });
        
        // Back buttons
        document.getElementById('back-to-dashboard').addEventListener('click', async () => {
            // Force sync to Firebase before leaving
            if (window.firebaseSyncManager?.syncEnabled) {
                await window.firebaseSyncManager.forceSync();
            }
            await this.showDashboard();
            this.updateGlobalStats();
        });
        
        document.getElementById('back-to-lesson').addEventListener('click', async () => {
            // Save session state before leaving (so we can resume)
            this.saveSessionState();
            // Force sync to Firebase before leaving
            if (window.firebaseSyncManager?.syncEnabled) {
                await window.firebaseSyncManager.forceSync();
            }
            // Reload progress to ensure we have latest data
            this.progress = this.loadProgress();
            // Update lesson progress display
            this.updateLessonProgress(this.currentBook, this.currentLesson);
            this.showLessonView(this.currentBook, this.currentLesson);
        });
        
        document.getElementById('back-to-lesson-summary').addEventListener('click', async () => {
            // Save session state before leaving
            this.saveSessionState();
            // Force sync to Firebase before leaving
            if (window.firebaseSyncManager?.syncEnabled) {
                await window.firebaseSyncManager.forceSync();
            }
            // Reload progress to ensure we have latest data
            this.progress = this.loadProgress();
            this.showLessonView(this.currentBook, this.currentLesson);
        });
        
        // Back to Lesson button in summary actions
        document.getElementById('back-to-lesson-btn').addEventListener('click', async () => {
            // Save session state before leaving
            this.saveSessionState();
            // Force sync to Firebase before leaving
            if (window.firebaseSyncManager?.syncEnabled) {
                await window.firebaseSyncManager.forceSync();
            }
            // Reload progress to ensure we have latest data
            this.progress = this.loadProgress();
            this.showLessonView(this.currentBook, this.currentLesson);
        });
        
        // Mode Go buttons
        document.getElementById('go-english-arabic-btn').addEventListener('click', () => {
            this.startMode('english-arabic');
        });
        
        document.getElementById('go-arabic-english-btn').addEventListener('click', () => {
            this.startMode('arabic-english');
        });
        
        document.getElementById('go-mixed-btn').addEventListener('click', () => {
            this.startMode('mixed');
        });
        
        document.getElementById('review-mistakes-btn').addEventListener('click', () => {
            // Use the last mode or default to english-arabic
            this.currentMode = this.progress.lastMode || 'english-arabic';
            this.progress.lastMode = this.currentMode;
            this.saveProgress();
            this.reviewMistakesOnly = true;
            this.isFinalTest = false;
            this.questionPool = [];
            // Don't resume for review mistakes mode
            this.showQuestionView();
        });
        
        document.getElementById('final-test-btn').addEventListener('click', () => {
            if (confirm('Ready for the final test? This will test 75% of words in mixed mode (English→Arabic and Arabic→English). You need to pass to unlock the next lesson.')) {
                this.currentMode = 'mixed';
                this.reviewMistakesOnly = false;
                this.isFinalTest = true;
                this.questionPool = [];
                // Clear any saved session state for final test
                const sessionKey = `session_${this.currentBook}_${this.currentLesson}_mixed_final`;
                localStorage.removeItem(sessionKey);
                this.showQuestionView();
            }
        });
        
        document.getElementById('reset-lesson-btn').addEventListener('click', () => {
            this.resetLessonProgress(this.currentBook, this.currentLesson);
        });
        
        // Question actions
        document.getElementById('check-btn').addEventListener('click', () => {
            this.checkAnswer();
        });
        
        document.getElementById('next-btn').addEventListener('click', () => {
            // Save session state after each question (for resume)
            this.saveSessionState();
            this.nextQuestion();
        });
        
        // Enter key for typing mode
        document.getElementById('answer-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const checkBtn = document.getElementById('check-btn');
                if (checkBtn.style.display !== 'none') {
                    this.checkAnswer();
                } else {
                    this.nextQuestion();
                }
            }
        });
        
        // Summary actions
        document.getElementById('review-again-btn').addEventListener('click', () => {
            this.reviewMistakesOnly = true;
            this.questionPool = [];
            this.showQuestionView();
        });
        
        document.getElementById('next-lesson-btn').addEventListener('click', () => {
            const nextLesson = this.currentLesson + 1;
            const lessonData = this.books[this.currentBook].find(l => l.lesson === nextLesson);
            if (lessonData) {
                this.showLessonView(this.currentBook, nextLesson);
            } else {
                // Move to next book
                if (this.currentBook === 1) {
                    this.currentBook = 2;
                    this.showLessonView(2, 1);
                } else {
                    alert('Congratulations! You have completed all lessons!');
                    this.showDashboard();
                }
            }
        });
        
        // Reset all
        document.getElementById('reset-all-btn').addEventListener('click', () => {
            this.resetAllProgress();
        });
    }
    
    // Authentication handlers
    async handleGoogleLogin() {
        console.log('🔄 Google login clicked');
        const button = document.getElementById('google-login-btn');
        
        try {
            if (button) {
                button.disabled = true;
                button.innerHTML = '<span class="login-icon">🔵</span><span>Signing in...</span>';
            }
            
            // Check if Firebase Auth Manager is ready
            if (!window.firebaseAuthManager || !window.firebaseAuthManager.auth) {
                console.error('Firebase Auth Manager not ready');
                throw new Error('Firebase Auth Manager not initialized');
            }
            
            console.log('🔄 Opening Google sign-in popup...');
            const user = await window.firebaseAuthManager.signInWithGoogle();
            
            if (user) {
                console.log('✅ Google sign-in successful:', user.email);
                // The onAuthStateChanged callback will handle the UI update
            } else {
                // Redirect was used (popup blocked) - page will reload
                console.log('ℹ️ Redirect initiated, waiting for page reload...');
            }
        } catch (error) {
            console.error('❌ Google login error:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                email: error.email,
                credential: error.credential
            });
            
            let errorMessage = 'Failed to sign in with Google. ';
            if (error.code === 'auth/operation-not-allowed') {
                errorMessage += 'Google sign-in is not enabled. Please contact support.';
            } else if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Sign-in cancelled.';
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please try again.';
            }
            
            alert(errorMessage);
            
            // Re-enable button on error
            if (button) {
                button.disabled = false;
                button.innerHTML = '<span class="login-icon">🔵</span><span>Continue with Google</span>';
            }
        }
    }
    
    // Apple login disabled for now
    // async handleAppleLogin() {
    //     try {
    //         const button = document.getElementById('apple-login-btn');
    //         if (button) {
    //             button.disabled = true;
    //             button.textContent = 'Signing in...';
    //         }
    //         
    //         const user = await window.firebaseAuthManager.signInWithApple();
    //         if (user) {
    //             console.log('✅ Signed in with Apple:', user.email);
    //             this.hideLoginView();
    //             this.updateUserUI(user);
    //             window.firebaseSyncManager.setUserId(user.uid);
    //             await this.syncProgressFromServer();
    //         }
    //     } catch (error) {
    //         console.error('Apple login error:', error);
    //         alert('Failed to sign in with Apple. Please try again.');
    //     } finally {
    //         const button = document.getElementById('apple-login-btn');
    //         if (button) {
    //             button.disabled = false;
    //             button.innerHTML = '<span class="login-icon">⚫</span><span>Continue with Apple</span>';
    //         }
    //     }
    // }
    
    async handleLogout() {
        if (confirm('Are you sure you want to sign out? Your progress will still be saved locally.')) {
            try {
                await window.firebaseAuthManager.signOut();
                window.firebaseSyncManager.setUserId(null);
                this.hideUserUI();
                localStorage.removeItem('skipped_login');
                this.showLoginView();
            } catch (error) {
                console.error('Logout error:', error);
                alert('Failed to sign out. Please try again.');
            }
        }
    }
    
    startMode(mode) {
        this.currentMode = mode;
        this.progress.lastMode = mode;
        this.saveProgress();
        this.reviewMistakesOnly = false;
        
        // Check if there's a saved session to resume
        const sessionKey = `session_${this.currentBook}_${this.currentLesson}_${mode}_normal`;
        const savedSession = localStorage.getItem(sessionKey);
        
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.questionPoolIds && session.questionPoolIds.length > 0) {
                    // There's a saved session - resume it automatically
                    console.log('📂 Found saved session, resuming...');
                    this.showQuestionView();
                    return; // showQuestionView will handle the resume
                }
            } catch (e) {
                console.error('Error parsing saved session:', e);
            }
        }
        
        // No saved session or invalid - start fresh
        this.questionPool = [];
        this.showQuestionView();
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new VocabTrainer();
    });
} else {
    new VocabTrainer();
}

