// Madinah Arabic Vocab Trainer - Main Application Logic

class VocabTrainer {
    constructor() {
        this.books = { 1: [], 2: [] };
        this.currentBook = 1;
        this.currentLesson = null;
        this.currentMode = 'english-arabic';
        this.currentQuestion = null;
        this.questionPool = [];
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
        await this.loadData();
        this.setupEventListeners();
        this.showDashboard();
        this.updateGlobalStats();
    }
    
    async loadData() {
        try {
            const [book1Res, book2Res] = await Promise.all([
                fetch('data/book1.json'),
                fetch('data/book2.json')
            ]);
            
            this.books[1] = await book1Res.json();
            this.books[2] = await book2Res.json();
            
            // Initialize progress for all words
            this.initializeProgress();
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load vocabulary data. Please check that book1.json and book2.json exist in the data folder.');
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
                            mastered: false
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
            lastMode: 'english-arabic'
        };
    }
    
    saveProgress() {
        if (!this.progress) {
            this.progress = this.loadProgress();
        }
        try {
            localStorage.setItem('madinah_vocab_progress', JSON.stringify(this.progress));
            console.log('💾 Progress saved to localStorage');
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
            mastered: false
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
        
        // Save to localStorage immediately
        try {
            localStorage.setItem('madinah_vocab_progress', JSON.stringify(this.progress));
            console.log('✅ Saved progress for', id, ':', this.progress.wordProgress[id]);
            console.log('📦 Total words in progress:', Object.keys(this.progress.wordProgress).length);
        } catch (e) {
            console.error('❌ Error saving progress:', e);
            alert('Warning: Could not save progress. Check if localStorage is enabled.');
        }
    }
    
    getLessonStatus(book, lesson) {
        return this.progress.lessonStatus[book]?.[lesson] || {
            mastered: false,
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
                        mastered: false
                    });
                });
                this.setLessonStatus(book, lesson, { mastered: false, date_completed: null });
                this.showLessonView(book, lesson);
            }
        }
    }
    
    // Mastery Logic
    isWordMastered(id) {
        // Always get fresh data
        const wp = this.getWordProgress(id);
        const isMastered = wp.mastered || wp.consecutive_correct >= 3;
        return isMastered;
    }
    
    updateWordMastery(id) {
        const wp = this.getWordProgress(id);
        if (wp.consecutive_correct >= 3 && !wp.mastered) {
            this.setWordProgress(id, { mastered: true });
        }
    }
    
    isLessonMastered(book, lesson) {
        const lessonData = this.books[book].find(l => l.lesson === lesson);
        if (!lessonData) return false;
        
        return lessonData.items.every(item => this.isWordMastered(item.id));
    }
    
    updateLessonMastery(book, lesson) {
        if (this.isLessonMastered(book, lesson)) {
            const status = this.getLessonStatus(book, lesson);
            if (!status.mastered) {
                this.setLessonStatus(book, lesson, {
                    mastered: true,
                    date_completed: new Date().toISOString().split('T')[0]
                });
            }
        }
    }
    
    isLessonUnlocked(book, lesson) {
        if (lesson === 1) return true;
        
        // Check if previous lesson is mastered
        const prevLesson = this.books[book].find(l => l.lesson === lesson - 1);
        if (!prevLesson) return true;
        
        return this.isLessonMastered(book, lesson - 1);
    }
    
    // UI Navigation
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    }
    
    showDashboard() {
        // Reload progress to ensure we have latest data
        this.progress = this.loadProgress();
        console.log('🏠 Dashboard: Reloaded progress,', Object.keys(this.progress.wordProgress || {}).length, 'words tracked');
        this.showView('dashboard-view');
        this.renderLessonsList();
        this.updateGlobalStats();
    }
    
    showLessonView(book, lesson) {
        this.currentBook = book;
        this.currentLesson = lesson;
        
        // Reload progress from localStorage to ensure we have latest data
        this.progress = this.loadProgress();
        
        this.showView('lesson-view');
        
        const lessonData = this.books[book].find(l => l.lesson === lesson);
        if (!lessonData) return;
        
        document.getElementById('lesson-title').textContent = 
            `Book ${book} – ${lessonData.lesson_label}`;
        
        this.updateLessonProgress(book, lesson);
        
        // Set mode selector
        const modeSelect = document.getElementById('mode-select');
        modeSelect.value = this.progress.lastMode || 'english-arabic';
    }
    
    showQuestionView() {
        this.showView('question-view');
        this.sessionStats = {
            attempted: 0,
            correct: 0,
            incorrect: 0,
            weakWords: []
        };
        this.nextQuestion();
    }
    
    showSummaryView() {
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
        container.innerHTML = '';
        
        // Always reload progress to ensure we have latest data
        this.progress = this.loadProgress();
        
        const lessons = this.books[this.currentBook];
        
        lessons.forEach(lessonData => {
            const card = document.createElement('div');
            card.className = 'lesson-card';
            
            // Reload progress for each lesson check to ensure fresh data
            this.progress = this.loadProgress();
            
            const mastered = this.isLessonMastered(this.currentBook, lessonData.lesson);
            const unlocked = this.isLessonUnlocked(this.currentBook, lessonData.lesson);
            
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
            
            if (mastered) {
                status = 'completed';
                statusText = 'Completed';
                card.classList.add('completed');
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
                card.addEventListener('click', () => {
                    this.showLessonView(this.currentBook, lessonData.lesson);
                });
            }
            
            container.appendChild(card);
        });
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
        
        // Count mastered words, correct answers, and attempted
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
        
        const total = lessonData.items.length;
        const percentage = total > 0 ? (masteredCount / total) * 100 : 0;
        
        console.log(`📊 Lesson ${book}-${lesson}: ${masteredCount}/${total} mastered, ${correctCount} correct, ${attemptedCount} attempted`);
        
        // Build progress text showing mastered, correct, and attempted
        let progressText = `Mastered ${masteredCount} / ${total} words`;
        if (correctCount > masteredCount || attemptedCount > masteredCount) {
            progressText += ' (';
            if (correctCount > masteredCount) {
                progressText += `${correctCount} correct`;
                if (attemptedCount > correctCount) {
                    progressText += `, ${attemptedCount} attempted`;
                }
            } else if (attemptedCount > masteredCount) {
                progressText += `${attemptedCount} attempted`;
            }
            progressText += ')';
        }
        
        document.getElementById('lesson-progress-text').textContent = progressText;
        document.getElementById('lesson-progress-fill').style.width = `${percentage}%`;
    }
    
    // Question Generation
    buildQuestionPool(book, lesson, reviewMistakesOnly = false) {
        const lessonData = this.books[book].find(l => l.lesson === lesson);
        if (!lessonData) return [];
        
        let pool = lessonData.items;
        
        if (reviewMistakesOnly) {
            pool = pool.filter(item => {
                const wp = this.getWordProgress(item.id);
                return !wp.mastered && wp.incorrect_count > 0;
            });
        } else {
            pool = pool.filter(item => !this.isWordMastered(item.id));
        }
        
        // If all words are mastered, use all words
        if (pool.length === 0) {
            pool = lessonData.items;
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
        if (this.questionPool.length === 0) {
            this.questionPool = this.buildQuestionPool(
                this.currentBook,
                this.currentLesson,
                this.reviewMistakesOnly
            );
        }
        
        if (this.questionPool.length === 0) {
            this.showSummaryView();
            return;
        }
        
        // Select random question from top 5 hardest
        const topN = Math.min(5, this.questionPool.length);
        const randomIndex = Math.floor(Math.random() * topN);
        this.currentQuestion = this.questionPool.splice(randomIndex, 1)[0];
        
        // Determine mode
        let mode = this.currentMode;
        if (mode === 'mixed') {
            mode = Math.random() < 0.5 ? 'english-arabic' : 'arabic-english';
        }
        
        this.renderQuestion(mode);
        this.updateQuestionStats();
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
                <span class="transliteration">${this.currentQuestion.transliteration}</span>
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
                <span class="transliteration">${item.transliteration}</span>
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
    
    checkAnswer() {
        const feedbackEl = document.getElementById('feedback');
        const checkBtn = document.getElementById('check-btn');
        const nextBtn = document.getElementById('next-btn');
        
        let isCorrect = false;
        
        if (this.currentMode === 'english-arabic' || 
            (this.currentMode === 'mixed' && document.getElementById('mcq-options').style.display !== 'none')) {
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
        } else {
            // Typing mode
            const userAnswer = document.getElementById('answer-input').value.trim().toLowerCase();
            const correctAnswer = this.currentQuestion.english.toLowerCase();
            
            // Normalize comparison
            const normalizedUser = userAnswer.replace(/[.,;:!?]/g, '').trim();
            const normalizedCorrect = correctAnswer.replace(/[.,;:!?]/g, '').trim();
            
            isCorrect = normalizedUser === normalizedCorrect;
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
        
        // Save updated progress
        this.setWordProgress(this.currentQuestion.id, updatedProgress);
        this.updateWordMastery(this.currentQuestion.id);
        this.updateLessonMastery(this.currentBook, this.currentLesson);
        
        // Show correct answer
        const correctAnswerDiv = document.createElement('div');
        correctAnswerDiv.className = 'correct-answer';
        correctAnswerDiv.innerHTML = `
            <div><strong>${this.currentQuestion.english}</strong></div>
            <div class="arabic-text">${this.currentQuestion.arabic}</div>
            <div class="transliteration">${this.currentQuestion.transliteration}</div>
        `;
        feedbackEl.appendChild(correctAnswerDiv);
        
        checkBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        
        this.updateQuestionStats();
    }
    
    updateQuestionStats() {
        const questionNumber = this.sessionStats.attempted + 1;
        document.getElementById('question-number').textContent = `Question ${questionNumber}`;
        document.getElementById('question-stats').textContent = 
            `Correct: ${this.sessionStats.correct} | Incorrect: ${this.sessionStats.incorrect}`;
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
                    <span class="transliteration">${item.transliteration}</span>
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
        document.getElementById('back-to-dashboard').addEventListener('click', () => {
            this.showDashboard();
            this.updateGlobalStats();
        });
        
        document.getElementById('back-to-lesson').addEventListener('click', () => {
            // Reload progress to ensure we have latest data
            this.progress = this.loadProgress();
            this.showLessonView(this.currentBook, this.currentLesson);
        });
        
        document.getElementById('back-to-lesson-summary').addEventListener('click', () => {
            // Reload progress to ensure we have latest data
            this.progress = this.loadProgress();
            this.showLessonView(this.currentBook, this.currentLesson);
        });
        
        // Lesson actions
        document.getElementById('start-practice-btn').addEventListener('click', () => {
            this.currentMode = document.getElementById('mode-select').value;
            this.progress.lastMode = this.currentMode;
            this.saveProgress();
            this.reviewMistakesOnly = false;
            this.questionPool = [];
            this.showQuestionView();
        });
        
        document.getElementById('review-mistakes-btn').addEventListener('click', () => {
            this.currentMode = document.getElementById('mode-select').value;
            this.progress.lastMode = this.currentMode;
            this.saveProgress();
            this.reviewMistakesOnly = true;
            this.questionPool = [];
            this.showQuestionView();
        });
        
        document.getElementById('reset-lesson-btn').addEventListener('click', () => {
            this.resetLessonProgress(this.currentBook, this.currentLesson);
        });
        
        // Question actions
        document.getElementById('check-btn').addEventListener('click', () => {
            this.checkAnswer();
        });
        
        document.getElementById('next-btn').addEventListener('click', () => {
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
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new VocabTrainer();
    });
} else {
    new VocabTrainer();
}

