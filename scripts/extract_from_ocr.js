/**
 * Extract vocabulary from OCR text output
 * Use this after converting PDFs to text using OCR
 * 
 * Usage:
 * 1. Convert PDFs to text using OCR (see OCR_GUIDE.md)
 * 2. Save OCR output as: public/data/Vocab_ocr.txt and public/data/Vocab2_ocr.txt
 * 3. Run: node scripts/extract_from_ocr.js
 */

const fs = require('fs');
const path = require('path');

// Simple transliteration mapping
const transliterationMap = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa',
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
    'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
    'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
    'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
    'ة': 'ah', 'ء': "'", 'ئ': 'y', 'ؤ': 'w',
    'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ً': 'an',
    'ٌ': 'un', 'ٍ': 'in', 'ْ': '', 'ّ': '',
    ' ': ' '
};

function transliterate(arabic) {
    if (!arabic) return '';
    
    let result = '';
    for (let i = 0; i < arabic.length; i++) {
        const char = arabic[i];
        if (transliterationMap[char]) {
            result += transliterationMap[char];
        } else {
            result += char;
        }
    }
    
    result = result.replace(/\s+/g, ' ').trim();
    return result;
}

/**
 * Extract vocabulary from OCR text
 * Handles various formats and patterns
 */
function extractVocabFromOCRText(text, bookNumber, debug = false) {
    const lessons = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    
    if (debug) {
        console.log(`\n   Debug: Total lines: ${lines.length}`);
        console.log(`   First 30 lines:`);
        lines.slice(0, 30).forEach((line, idx) => {
            console.log(`   ${idx + 1}: ${line.substring(0, 100)}`);
        });
    }
    
    let currentLesson = null;
    let lessonNumber = 0;
    let itemCounter = 0;
    let inVocabularySection = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const prevLine = i > 0 ? lines[i - 1] : '';
        
        // Detect lesson headers - multiple patterns
        const lessonPatterns = [
            /(?:Lesson|lesson|الدرس)\s+(\d+)/i,
            /#\s*(?:Lesson|lesson)\s+(\d+)/i,
            /Lesson\s+(\d+)\s+Vocabulary/i,
            /الدرس\s+(\d+)/i,
            /^\s*(\d+)\s*$/  // Just a number on its own line
        ];
        
        let lessonMatch = null;
        for (const pattern of lessonPatterns) {
            lessonMatch = line.match(pattern);
            if (lessonMatch) break;
        }
        
        // Also check if next line contains "Vocabulary" or "vocabulary"
        if (!lessonMatch && /^\s*\d+\s*$/.test(line) && 
            (nextLine.toLowerCase().includes('vocabulary') || 
             nextLine.toLowerCase().includes('vocab'))) {
            lessonMatch = line.match(/(\d+)/);
        }
        
        if (lessonMatch) {
            // Save previous lesson if exists
            if (currentLesson && currentLesson.items.length > 0) {
                lessons.push(currentLesson);
                if (debug) {
                    console.log(`   Saved lesson ${currentLesson.lesson} with ${currentLesson.items.length} items`);
                }
            }
            
            lessonNumber = parseInt(lessonMatch[1]);
            itemCounter = 0;
            inVocabularySection = true;
            currentLesson = {
                book: bookNumber,
                lesson: lessonNumber,
                lesson_label: `Lesson ${lessonNumber}`,
                items: []
            };
            if (debug) console.log(`   Found lesson ${lessonNumber}`);
            continue;
        }
        
        // Skip if no current lesson
        if (!currentLesson) continue;
        
        // Skip headers
        if (line.match(/^(Vocabulary|vocabulary|Arabic|English|مفردات|عربي|إنجليزي)$/i) && 
            !line.match(/[\u0600-\u06FF]/)) {
            continue;
        }
        
        // Skip separator lines
        if (line.match(/^[-=_\s]+$/) || line.length < 2) {
            continue;
        }
        
        // Try to parse table rows (pipe-separated, tab-separated, or spaced)
        let parts = [];
        if (line.includes('|')) {
            parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
        } else if (line.includes('\t')) {
            parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
        } else if (line.match(/[\u0600-\u06FF]/) && /[a-zA-Z]/.test(line)) {
            // Line contains both Arabic and English - try to split
            const arabicPart = line.match(/([\u0600-\u06FF\s\u064B-\u0652]+)/);
            const englishPart = line.match(/([a-zA-Z\s\-\(\)]+)/);
            if (arabicPart && englishPart) {
                parts = [englishPart[1].trim(), arabicPart[1].trim()];
            }
        }
        
        // Process table rows
        if (parts.length >= 2) {
            let english = parts[0].trim();
            let arabic = parts[1].trim();
            
            // Determine which is which
            const hasArabic1 = /[\u0600-\u06FF]/.test(english);
            const hasArabic2 = /[\u0600-\u06FF]/.test(arabic);
            const hasEnglish1 = /^[a-zA-Z\s\-\(\)]+$/.test(english);
            const hasEnglish2 = /^[a-zA-Z\s\-\(\)]+$/.test(arabic);
            
            // Swap if needed
            if (hasArabic1 && !hasArabic2 && hasEnglish2) {
                [english, arabic] = [arabic, english];
            }
            
            // Skip headers
            if (english.toLowerCase().match(/^(english|arabic|word|meaning)$/i) ||
                arabic.toLowerCase().match(/^(english|arabic|word|meaning)$/i)) {
                continue;
            }
            
            // Validate
            const hasArabic = /[\u0600-\u06FF]/.test(arabic);
            const hasEnglish = /[a-zA-Z]/.test(english) && english.length > 0;
            
            if (hasEnglish && hasArabic && 
                english.length < 150 && arabic.length < 150 &&
                !english.match(/^\d+$/) && !arabic.match(/^\d+$/)) {
                itemCounter++;
                const itemId = `b${bookNumber}_l${lessonNumber}_${String(itemCounter).padStart(3, '0')}`;
                
                currentLesson.items.push({
                    id: itemId,
                    english: english,
                    arabic: arabic,
                    transliteration: transliterate(arabic)
                });
                
                if (debug && currentLesson.items.length <= 5) {
                    console.log(`   Added: ${english.substring(0, 30)} | ${arabic.substring(0, 30)}`);
                }
            }
        }
        
        // Pattern: Arabic on one line, English on next (or vice versa)
        const hasArabic = /[\u0600-\u06FF]/.test(line);
        const hasEnglish = /^[a-zA-Z\s\-\(\)]+$/.test(line) && 
                          line.length > 2 && line.length < 100 &&
                          !line.match(/^(Lesson|Vocabulary|Page|\d+)$/i);
        
        const nextHasArabic = /[\u0600-\u06FF]/.test(nextLine);
        const nextHasEnglish = /^[a-zA-Z\s\-\(\)]+$/.test(nextLine) && 
                              nextLine.length > 2 && nextLine.length < 100 &&
                              !nextLine.match(/^(Lesson|Vocabulary|Page|\d+)$/i);
        
        // Arabic followed by English
        if (hasArabic && nextHasEnglish && !nextHasArabic) {
            itemCounter++;
            const itemId = `b${bookNumber}_l${lessonNumber}_${String(itemCounter).padStart(3, '0')}`;
            
            currentLesson.items.push({
                id: itemId,
                english: nextLine.trim(),
                arabic: line.trim(),
                transliteration: transliterate(line.trim())
            });
            i++; // Skip next line
            continue;
        }
        
        // English followed by Arabic
        if (hasEnglish && nextHasArabic && !nextHasEnglish) {
            itemCounter++;
            const itemId = `b${bookNumber}_l${lessonNumber}_${String(itemCounter).padStart(3, '0')}`;
            
            currentLesson.items.push({
                id: itemId,
                english: line.trim(),
                arabic: nextLine.trim(),
                transliteration: transliterate(nextLine.trim())
            });
            i++; // Skip next line
            continue;
        }
    }
    
    // Save last lesson
    if (currentLesson && currentLesson.items.length > 0) {
        lessons.push(currentLesson);
    }
    
    return lessons;
}

/**
 * Main extraction function
 */
async function main() {
    console.log('🚀 Starting OCR-based vocabulary extraction...\n');
    
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    const outputDir = dataDir;
    
    // Check for OCR text files
    const vocab1OCR = path.join(dataDir, 'Vocab_ocr.txt');
    const vocab2OCR = path.join(dataDir, 'Vocab2_ocr.txt');
    
    const debug = process.argv.includes('--debug');
    
    // Process Book 1
    let book1Data = [];
    if (fs.existsSync(vocab1OCR)) {
        console.log(`📖 Reading Book 1 OCR text...`);
        const text = fs.readFileSync(vocab1OCR, 'utf8');
        book1Data = extractVocabFromOCRText(text, 1, debug);
        console.log(`   ✅ Extracted ${book1Data.length} lessons`);
        book1Data.forEach(lesson => {
            console.log(`      - ${lesson.lesson_label}: ${lesson.items.length} words`);
        });
    } else {
        console.log('⚠️  Vocab_ocr.txt not found in public/data/');
        console.log('   Please convert Vocab.pdf to text using OCR and save as Vocab_ocr.txt');
    }
    
    // Process Book 2
    let book2Data = [];
    if (fs.existsSync(vocab2OCR)) {
        console.log(`\n📖 Reading Book 2 OCR text...`);
        const text = fs.readFileSync(vocab2OCR, 'utf8');
        book2Data = extractVocabFromOCRText(text, 2, debug);
        console.log(`   ✅ Extracted ${book2Data.length} lessons`);
        book2Data.forEach(lesson => {
            console.log(`      - ${lesson.lesson_label}: ${lesson.items.length} words`);
        });
    } else {
        console.log('⚠️  Vocab2_ocr.txt not found in public/data/');
        console.log('   Please convert Vocab2.pdf to text using OCR and save as Vocab2_ocr.txt');
    }
    
    // Write JSON files
    if (book1Data.length > 0) {
        const book1Output = path.join(outputDir, 'book1.json');
        fs.writeFileSync(book1Output, JSON.stringify(book1Data, null, 2), 'utf8');
        console.log(`\n✅ Written: ${book1Output} (${book1Data.length} lessons)`);
    }
    
    if (book2Data.length > 0) {
        const book2Output = path.join(outputDir, 'book2.json');
        fs.writeFileSync(book2Output, JSON.stringify(book2Data, null, 2), 'utf8');
        console.log(`✅ Written: ${book2Output} (${book2Data.length} lessons)`);
    }
    
    // Summary
    const totalWords1 = book1Data.reduce((sum, l) => sum + l.items.length, 0);
    const totalWords2 = book2Data.reduce((sum, l) => sum + l.items.length, 0);
    
    console.log('\n📊 Summary:');
    console.log(`   Book 1: ${book1Data.length} lessons, ${totalWords1} words`);
    console.log(`   Book 2: ${book2Data.length} lessons, ${totalWords2} words`);
    console.log(`   Total: ${totalWords1 + totalWords2} words\n`);
    
    // Check expected counts
    if (book1Data.length > 0 && book1Data.length !== 23) {
        console.log(`⚠️  Warning: Book 1 has ${book1Data.length} lessons, expected 23`);
    }
    if (book2Data.length > 0 && book2Data.length !== 31) {
        console.log(`⚠️  Warning: Book 2 has ${book2Data.length} lessons, expected 31`);
    }
    
    console.log('✨ Extraction complete!\n');
}

// Run extraction
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});



