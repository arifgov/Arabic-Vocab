// Admin Portal Module
console.log('📦 admin.js loaded');

const ADMIN_EMAIL = 'arif@govani.org';

class AdminPortal {
    constructor() {
        this.db = null;
        this.books = { 1: [], 2: [] };
        this.currentUserDetail = null;
    }

    async init() {
        // Wait for Firebase to be initialized
        while (!window.firebaseDb) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.db = window.firebaseDb;
        
        // Load book data for progress display
        await this.loadBookData();
    }

    async loadBookData() {
        try {
            const [book1Res, book2Res] = await Promise.all([
                fetch('data/book1.json'),
                fetch('data/book2.json')
            ]);
            if (book1Res.ok) this.books[1] = await book1Res.json();
            if (book2Res.ok) this.books[2] = await book2Res.json();
        } catch (error) {
            console.error('Error loading book data:', error);
        }
    }

    isAdmin(user) {
        return user && user.email === ADMIN_EMAIL;
    }

    async showAdminView() {
        const user = window.firebaseAuthManager?.getCurrentUser();
        
        if (!user) {
            alert('You must be logged in to access the admin portal.');
            return false;
        }

        if (!this.isAdmin(user)) {
            alert('Access denied. Admin privileges required.');
            return false;
        }

        if (!this.db) {
            await this.init();
        }

        // Show admin view
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('admin-view').classList.add('active');
        
        // Load and display users
        await this.loadUsers();
        return true;
    }

    async loadUsers() {
        const loadingEl = document.getElementById('admin-loading');
        const errorEl = document.getElementById('admin-error');
        const usersListEl = document.getElementById('admin-users-list');
        const userDetailEl = document.getElementById('admin-user-detail');

        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        usersListEl.style.display = 'none';
        userDetailEl.style.display = 'none';

        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const usersRef = collection(this.db, 'users');
            
            // Get ALL users from Firestore (no filtering, no ordering to avoid index issues)
            console.log('🔍 Fetching all users from Firestore...');
            const querySnapshot = await getDocs(usersRef);
            
            console.log(`📦 Found ${querySnapshot.size} user documents in Firestore`);

            const users = [];
            
            querySnapshot.forEach((docSnap) => {
                const userId = docSnap.id;
                const data = docSnap.data();
                
                console.log(`📋 Processing user ${userId}:`, {
                    hasEmail: !!data.email,
                    hasName: !!data.name || !!data.displayName,
                    email: data.email || 'NOT SET',
                    name: data.name || data.displayName || 'NOT SET',
                    hasProgress: !!data.progress
                });
                
                // Get user info from Firestore (saved by sync process)
                let userEmail = data.email;
                let userName = data.name || data.displayName;
                
                // If email/name not in Firestore, show user ID as identifier
                // This happens for users who haven't synced since we added email/name saving
                if (!userEmail || userEmail === 'Unknown') {
                    userEmail = `User ID: ${userId}`;
                }
                if (!userName || userName === 'Unknown User') {
                    // Try to extract name from email if it's a real email
                    if (userEmail && userEmail.includes('@') && !userEmail.includes('User ID:')) {
                        userName = userEmail.split('@')[0];
                    } else {
                        userName = `User ${userId.substring(0, 12)}...`;
                    }
                }
                
                users.push({
                    id: userId,
                    email: userEmail,
                    name: userName,
                    lastSync: data.lastSync?.toDate?.() || (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt) || null,
                    progress: data.progress || null
                });
            });
            
            console.log(`✅ Loaded ${users.length} users from Firestore`);
            users.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.name} - ${user.email} - ID: ${user.id.substring(0, 12)}...`);
            });
            
            // Sort users by lastSync date (most recent first) in JavaScript
            users.sort((a, b) => {
                if (!a.lastSync && !b.lastSync) return 0;
                if (!a.lastSync) return 1;
                if (!b.lastSync) return -1;
                return b.lastSync.getTime() - a.lastSync.getTime();
            });

            if (users.length === 0) {
                usersListEl.innerHTML = '<p class="admin-no-users">No users found in the system.</p>';
            } else {
                this.renderUsersList(users);
            }

            loadingEl.style.display = 'none';
            usersListEl.style.display = 'block';
        } catch (error) {
            console.error('Error loading users:', error);
            loadingEl.style.display = 'none';
            errorEl.style.display = 'block';
            errorEl.innerHTML = `<p class="error-message">Error loading users: ${error.message}</p>`;
        }
    }

    renderUsersList(users) {
        const usersListEl = document.getElementById('admin-users-list');
        usersListEl.innerHTML = `
            <div class="admin-header">
                <h2>Users (${users.length})</h2>
                <button id="admin-refresh-btn" class="btn btn-secondary">🔄 Refresh</button>
            </div>
            <div class="admin-users-grid">
                ${users.map(user => `
                    <div class="admin-user-card" data-user-id="${user.id}">
                        <div class="admin-user-info">
                            <h3>${this.escapeHtml(user.name)}</h3>
                            <p class="admin-user-email">${this.escapeHtml(user.email)}</p>
                            ${user.lastSync ? `<p class="admin-user-sync">Last sync: ${this.formatDate(user.lastSync)}</p>` : '<p class="admin-user-sync">Never synced</p>'}
                            ${!user.email.includes('@') ? `<p class="admin-user-id" style="font-size: 0.75rem; color: var(--text-light); margin-top: 0.25rem;">User ID: ${user.id}</p>` : ''}
                        </div>
                        <div class="admin-user-actions">
                            <button class="btn btn-primary btn-view-progress" data-user-id="${user.id}">View Progress</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Attach event listeners
        usersListEl.querySelectorAll('.btn-view-progress').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-user-id');
                this.showUserDetail(userId, users.find(u => u.id === userId));
            });
        });

        document.getElementById('admin-refresh-btn').addEventListener('click', () => {
            this.loadUsers();
        });
    }

    async showUserDetail(userId, userData) {
        const usersListEl = document.getElementById('admin-users-list');
        const userDetailEl = document.getElementById('admin-user-detail');
        
        usersListEl.style.display = 'none';
        userDetailEl.style.display = 'block';

        try {
            // Load full user data from Firestore
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userRef = doc(this.db, 'users', userId);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                userDetailEl.innerHTML = '<p class="error-message">User not found.</p>';
                return;
            }

            const user = userSnap.data();
            const progress = user.progress || {
                wordProgress: {},
                lessonStatus: { 1: {}, 2: {} }
            };

            this.currentUserDetail = { id: userId, email: user.email || userData?.email, progress };

            this.renderUserDetail(userId, user.email || userData?.email || 'Unknown', progress);
        } catch (error) {
            console.error('Error loading user detail:', error);
            userDetailEl.innerHTML = `<p class="error-message">Error loading user: ${error.message}</p>`;
        }
    }

    renderUserDetail(userId, userEmail, progress) {
        const userDetailEl = document.getElementById('admin-user-detail');
        
        userDetailEl.innerHTML = `
            <div class="admin-user-detail-header">
                <button id="admin-back-to-list" class="btn btn-secondary">← Back to Users</button>
                <h2>Progress for: ${this.escapeHtml(userEmail)}</h2>
            </div>
            
            <div class="admin-books-container">
                ${[1, 2].map(bookNum => this.renderBookProgress(bookNum, progress)).join('')}
            </div>
        `;

        document.getElementById('admin-back-to-list').addEventListener('click', () => {
            document.getElementById('admin-users-list').style.display = 'block';
            document.getElementById('admin-user-detail').style.display = 'none';
            this.currentUserDetail = null;
        });
    }

    renderBookProgress(bookNum, progress) {
        const bookData = this.books[bookNum] || [];
        if (bookData.length === 0) return '';

        const lessonStatus = progress.lessonStatus?.[bookNum] || {};
        
        return `
            <div class="admin-book-card">
                <h3>Book ${bookNum}</h3>
                <div class="admin-lessons-list">
                    ${bookData.map(lesson => {
                        const status = lessonStatus[lesson.lesson] || {};
                        return this.renderLessonProgress(bookNum, lesson, progress, status);
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderLessonProgress(bookNum, lesson, progress, status) {
        const wordProgress = progress.wordProgress || {};
        const lessonWords = lesson.items || [];
        
        // Calculate progress for each mode
        const englishArabicCount = lessonWords.filter(item => {
            const wp = wordProgress[item.id] || {};
            return wp.english_arabic_correct === true;
        }).length;
        
        const arabicEnglishCount = lessonWords.filter(item => {
            const wp = wordProgress[item.id] || {};
            return wp.arabic_english_correct === true;
        }).length;
        
        const mixedCount = lessonWords.filter(item => {
            const wp = wordProgress[item.id] || {};
            return wp.mixed_correct === true;
        }).length;
        
        const totalWords = lessonWords.length;
        const finalTestPassed = status.final_test_passed === true;

        return `
            <div class="admin-lesson-card">
                <div class="admin-lesson-header">
                    <h4>${this.escapeHtml(lesson.lesson_label)}</h4>
                    ${finalTestPassed ? '<span class="admin-badge admin-badge-complete">Final Test Passed</span>' : ''}
                </div>
                
                <div class="admin-lesson-progress">
                    <div class="admin-mode-progress">
                        <span>English → Arabic:</span>
                        <span>${englishArabicCount} / ${totalWords}</span>
                        <button class="btn btn-sm btn-mark-complete" 
                                data-book="${bookNum}" 
                                data-lesson="${lesson.lesson}" 
                                data-mode="english-arabic"
                                ${englishArabicCount === totalWords ? 'disabled' : ''}>
                            ${englishArabicCount === totalWords ? '✓ Complete' : 'Mark Complete'}
                        </button>
                    </div>
                    
                    <div class="admin-mode-progress">
                        <span>Arabic → English:</span>
                        <span>${arabicEnglishCount} / ${totalWords}</span>
                        <button class="btn btn-sm btn-mark-complete" 
                                data-book="${bookNum}" 
                                data-lesson="${lesson.lesson}" 
                                data-mode="arabic-english"
                                ${arabicEnglishCount === totalWords ? 'disabled' : ''}>
                            ${arabicEnglishCount === totalWords ? '✓ Complete' : 'Mark Complete'}
                        </button>
                    </div>
                    
                    <div class="admin-mode-progress">
                        <span>Mixed:</span>
                        <span>${mixedCount} / ${totalWords}</span>
                        <button class="btn btn-sm btn-mark-complete" 
                                data-book="${bookNum}" 
                                data-lesson="${lesson.lesson}" 
                                data-mode="mixed"
                                ${mixedCount === totalWords ? 'disabled' : ''}>
                            ${mixedCount === totalWords ? '✓ Complete' : 'Mark Complete'}
                        </button>
                    </div>
                    
                    <div class="admin-mode-progress">
                        <span>Final Test:</span>
                        <span>${finalTestPassed ? 'Passed' : 'Not Passed'}</span>
                        <button class="btn btn-sm btn-mark-complete" 
                                data-book="${bookNum}" 
                                data-lesson="${lesson.lesson}" 
                                data-mode="final-test"
                                ${finalTestPassed ? 'disabled' : ''}>
                            ${finalTestPassed ? '✓ Passed' : 'Mark as Passed'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async markTestComplete(book, lesson, mode) {
        if (!this.currentUserDetail) {
            alert('No user selected');
            return;
        }

        const userId = this.currentUserDetail.id;
        const progress = { ...this.currentUserDetail.progress };
        
        // Ensure structure exists
        if (!progress.wordProgress) progress.wordProgress = {};
        if (!progress.lessonStatus) progress.lessonStatus = { 1: {}, 2: {} };
        if (!progress.lessonStatus[book]) progress.lessonStatus[book] = {};
        if (!progress.lessonStatus[book][lesson]) {
            progress.lessonStatus[book][lesson] = {
                mastered: false,
                final_test_passed: false,
                date_completed: null
            };
        }

        const lessonData = this.books[book]?.find(l => l.lesson === lesson);
        if (!lessonData) {
            alert('Lesson not found');
            return;
        }

        if (mode === 'final-test') {
            // Mark final test as passed
            progress.lessonStatus[book][lesson].final_test_passed = true;
            progress.lessonStatus[book][lesson].date_completed = new Date().toISOString();
        } else {
            // Mark all words in the lesson as complete for the specified mode
            lessonData.items.forEach(item => {
                if (!progress.wordProgress[item.id]) {
                    progress.wordProgress[item.id] = {
                        correct_count: 0,
                        incorrect_count: 0,
                        consecutive_correct: 0,
                        mastered: false,
                        english_arabic_correct: false,
                        arabic_english_correct: false,
                        mixed_correct: false
                    };
                }
                
                const wp = progress.wordProgress[item.id];
                if (mode === 'english-arabic') {
                    wp.english_arabic_correct = true;
                } else if (mode === 'arabic-english') {
                    wp.arabic_english_correct = true;
                } else if (mode === 'mixed') {
                    wp.mixed_correct = true;
                }
                
                // Check if all modes are complete
                if (wp.english_arabic_correct && wp.arabic_english_correct && wp.mixed_correct) {
                    wp.mastered = true;
                }
            });
        }

        // Save to Firebase immediately
        try {
            const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userRef = doc(this.db, 'users', userId);
            
            await setDoc(userRef, {
                progress: progress,
                lastSync: serverTimestamp(),
                updatedAt: new Date().toISOString(),
                adminUpdated: true,
                adminUpdatedAt: new Date().toISOString()
            }, { merge: true });

            // Update local state
            this.currentUserDetail.progress = progress;
            
            // Refresh the view
            this.renderUserDetail(userId, this.currentUserDetail.email, progress);
            
            alert('✅ Progress updated and saved to Firebase!');
        } catch (error) {
            console.error('Error saving progress:', error);
            alert('❌ Error saving progress: ' + error.message);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(date) {
        if (!date) return 'Never';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleString();
    }
}

// Global instance
window.adminPortal = new AdminPortal();

// Listen for mark complete clicks (delegated event listener)
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-mark-complete')) {
        const book = parseInt(e.target.getAttribute('data-book'));
        const lesson = parseInt(e.target.getAttribute('data-lesson'));
        const mode = e.target.getAttribute('data-mode');
        
        if (confirm(`Mark ${mode === 'final-test' ? 'Final Test' : mode} as complete for Book ${book}, ${mode === 'final-test' ? '' : 'Lesson ' + lesson}?`)) {
            await window.adminPortal.markTestComplete(book, lesson, mode);
        }
    }
});
