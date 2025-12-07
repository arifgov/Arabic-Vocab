# Madinah Arabic Vocab Trainer

A browser-based vocabulary trainer for learning Arabic vocabulary from Madinah Arabic Book 1 and Book 2.

## Features

- **Lesson-based Learning**: Organized by book and lesson
- **Multiple Practice Modes**:
  - English → Arabic (Multiple Choice)
  - Arabic → English (Typing)
  - Mixed mode (randomly alternates between both)
- **Progress Tracking**: Tracks correct/incorrect answers per word
- **Mastery System**: Words become "mastered" after 3 consecutive correct answers
- **Review Mistakes**: Focus on problem words only
- **Lesson Unlocking**: Lessons unlock sequentially as you master previous ones
- **Local Storage**: All progress saved locally in your browser
- **Mobile Friendly**: Responsive design works on desktop and mobile
- **PWA Support**: Can be installed as a web app

## Setup

1. Extract vocabulary data from PDFs:
   ```bash
   node scripts/extract_vocab.js
   ```

   This will generate `public/data/book1.json` and `public/data/book2.json`.

2. Serve the app:
   - Option 1: Use a local web server (required for fetch to work):
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js (http-server)
     npx http-server public -p 8000
     
     # Using PHP
     php -S localhost:8000 -t public
     ```
   
   - Option 2: Open `public/index.html` directly (may have CORS issues with fetch)

3. Open in browser:
   ```
   http://localhost:8000
   ```

## Usage

1. **Select a Book**: Choose Book 1 or Book 2 from the dashboard
2. **Select a Lesson**: Click on an unlocked lesson
3. **Choose Practice Mode**: 
   - English → Arabic: Multiple choice questions
   - Arabic → English: Type the English meaning
   - Mixed: Randomly alternates between both modes
4. **Practice**: Answer questions and track your progress
5. **Review Mistakes**: Use "Review Mistakes Only" to focus on problem words
6. **Master Lessons**: Complete all words in a lesson to unlock the next one

## Data Structure

Vocabulary data is stored in JSON format:

```json
[
  {
    "book": 1,
    "lesson": 1,
    "lesson_label": "Lesson 1",
    "items": [
      {
        "id": "b1_l1_001",
        "english": "house",
        "arabic": "بَيْتٌ",
        "transliteration": "baytun"
      }
    ]
  }
]
```

## Progress Storage

All progress is stored in browser localStorage under the key `madinah_vocab_progress`:

- Word-level progress: correct_count, incorrect_count, consecutive_correct, mastered
- Lesson-level status: mastered, date_completed
- Last session: book, lesson, mode

## Resetting Progress

- **Reset All**: Click "Reset All Progress" on the dashboard
- **Reset Lesson**: Click "Reset This Lesson" in the lesson view

## Adding More Vocabulary

1. Update the vocab data in `scripts/extract_vocab.js`
2. Run the extraction script:
   ```bash
   node scripts/extract_vocab.js
   ```
3. Refresh the app

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled
- Requires localStorage support

## Notes

- Arabic text is displayed right-to-left (RTL)
- Transliteration is approximate and may not be perfect
- All data is stored locally - no backend or login required
- Works offline after initial load (if served as PWA)

## License

This project is for personal/educational use.



