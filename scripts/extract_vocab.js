/**
 * Extract vocab from PDF files and generate JSON files
 * This script reads PDFs and extracts vocabulary data
 * 
 * Install dependencies first:
 * npm install pdf-parse
 */

const fs = require('fs');
const path = require('path');

// Check if pdf-parse is available
let pdfParse;
try {
    pdfParse = require('pdf-parse');
} catch (e) {
    console.error('❌ Error: pdf-parse is not installed.');
    console.log('\n📦 Please install it first:');
    console.log('   npm install pdf-parse\n');
    process.exit(1);
}

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
    
    // Clean up multiple spaces and normalize
    result = result.replace(/\s+/g, ' ').trim();
    
    return result;
}

/**
 * Extract vocabulary from PDF text
 */
function extractVocabFromText(text, bookNumber, debug = false) {
    const lessons = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (debug) {
        console.log(`\n   Debug: First 20 lines of extracted text:`);
        lines.slice(0, 20).forEach((line, idx) => {
            console.log(`   ${idx + 1}: ${line.substring(0, 80)}`);
        });
    }
    
    let currentLesson = null;
    let lessonNumber = 0;
    let itemCounter = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
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
        
        // Also check if this is a number and next few lines contain "Lesson" or "Vocabulary"
        // This handles Book 1's format where there's a number, then "Lesson X Vocabulary" on next line
        if (!lessonMatch && /^\s*\d+\s*$/.test(line)) {
            // Check next 5 lines for lesson header (Book 1 sometimes has blank lines)
            for (let j = 1; j <= 5 && i + j < lines.length; j++) {
                const checkLine = lines[i + j];
                if (!checkLine || checkLine.trim().length === 0) continue;
                
                const lessonHeaderMatch = checkLine.match(/Lesson\s+(\d+)\s+Vocabulary/i);
                if (lessonHeaderMatch) {
                    // Use the number from "Lesson X Vocabulary", not the standalone number
                    lessonMatch = lessonHeaderMatch;
                    // Advance past the blank lines to the actual lesson header
                    i += j - 1;
                    break;
                }
            }
        }
        
        // Check if line contains "Lesson X Vocabulary" pattern (even if malformed)
        if (!lessonMatch) {
            const combinedPattern = /Lesson\s+(\d+)\s+Vocabulary/i;
            const combinedMatch = line.match(combinedPattern);
            if (combinedMatch) {
                lessonMatch = combinedMatch;
            }
        }
        
        // Also handle "Lesson X Vocabulary" where X might be separated
        if (!lessonMatch) {
            const lessonVocabMatch = line.match(/Lesson.*?(\d+).*?Vocabulary/i);
            if (lessonVocabMatch) {
                lessonMatch = lessonVocabMatch;
            }
        }
        
        if (lessonMatch) {
            const detectedLessonNum = parseInt(lessonMatch[1]);
            
            // Validate lesson number (should be 1-31 for Book 2, 1-23 for Book 1)
            const maxLesson = bookNumber === 1 ? 23 : 31;
            if (detectedLessonNum < 1 || detectedLessonNum > maxLesson) {
                // Skip invalid lesson numbers (might be page numbers)
                continue;
            }
            
            // Save previous lesson if exists
            if (currentLesson && currentLesson.items.length > 0) {
                lessons.push(currentLesson);
            }
            
            lessonNumber = detectedLessonNum;
            itemCounter = 0;
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
        
        // Skip headers and separators
        if (line.match(/^(Vocabulary|vocabulary|Arabic|English|Possess|Manner|مفردات)/i) && 
            !line.includes('|') && !line.match(/[\u0600-\u06FF]/)) {
            continue;
        }
        
        // Try to parse table rows (pipe-separated or tab-separated)
        let parts = [];
        if (line.includes('|')) {
            parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
        } else if (line.includes('\t')) {
            parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
        }
        
        // If we have 2+ parts (could be English | Arabic | transliteration)
        if (parts.length >= 2 && currentLesson) {
            let english = parts[0].trim();
            let arabic = parts[1].trim();
            
            // Sometimes Arabic is first, English second - check which has Arabic chars
            if (!/[\u0600-\u06FF]/.test(arabic) && /[\u0600-\u06FF]/.test(english)) {
                // Swap them
                [english, arabic] = [arabic, english];
            }
            
            // Skip if it's a header row
            if (english.toLowerCase() === 'english' || arabic.toLowerCase() === 'arabic' ||
                english.toLowerCase() === 'إنجليزية' || arabic.toLowerCase() === 'عربية') {
                continue;
            }
            
            // Check if Arabic contains Arabic characters
            const hasArabic = /[\u0600-\u06FF]/.test(arabic);
            const hasEnglish = /^[a-zA-Z\s\-\(\)]+$/.test(english) && english.length > 0;
            
            if (hasEnglish && hasArabic && english.length < 100 && arabic.length < 100) {
                itemCounter++;
                const itemId = `b${bookNumber}_l${lessonNumber}_${String(itemCounter).padStart(3, '0')}`;
                
                currentLesson.items.push({
                    id: itemId,
                    english: english,
                    arabic: arabic,
                    transliteration: transliterate(arabic)
                });
                
                if (debug && currentLesson.items.length <= 3) {
                    console.log(`   Added: ${english} | ${arabic}`);
                }
            }
        }
        
        // Alternative: Look for lines with both English and Arabic
        if (parts.length === 0 && currentLesson) {
            const hasArabic = /[\u0600-\u06FF]/.test(line);
            const hasEnglish = /[a-zA-Z]/.test(line);
            
            // If line has both, try to split
            if (hasArabic && hasEnglish && line.length < 150) {
                // Try to find where Arabic starts/ends
                const arabicMatch = line.match(/([\u0600-\u06FF\s]+)/);
                const englishMatch = line.match(/([a-zA-Z\s\-\(\)]+)/);
                
                if (arabicMatch && englishMatch) {
                    let arabic = arabicMatch[1].trim();
                    let english = englishMatch[1].trim();
                    
                    // Determine order by position
                    if (line.indexOf(arabic) < line.indexOf(english)) {
                        [arabic, english] = [english, arabic];
                    }
                    
                    if (arabic.length > 0 && english.length > 0 && 
                        arabic.length < 100 && english.length < 100) {
                        itemCounter++;
                        const itemId = `b${bookNumber}_l${lessonNumber}_${String(itemCounter).padStart(3, '0')}`;
                        
                        currentLesson.items.push({
                            id: itemId,
                            english: english,
                            arabic: arabic,
                            transliteration: transliterate(arabic)
                        });
                    }
                }
            }
        }
        
        // Pattern: English on one line, Arabic on next (or vice versa)
        // This is the most common pattern in these PDFs
        // Check for Arabic more leniently - might have control chars mixed in
        const hasArabic = /[\u0600-\u06FF]/.test(line);
        const hasEnglish = /^[a-zA-Z\s\-\(\)\.\?\,\:\;\!]+$/.test(line.replace(/[\x00-\x1F\x7F-\x9F]/g, '')) && 
                          line.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim().length > 1 && 
                          line.length < 200 &&
                          !line.match(/^(Lesson|Vocabulary|Page|\d+|www\.|©|Umm|Arabic|Bank|Madinah)/i);
        
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const nextHasArabic = /[\u0600-\u06FF]/.test(nextLine);
        const nextHasEnglish = /^[a-zA-Z\s\-\(\)\.\?\,\:\;\!]+$/.test(nextLine.replace(/[\x00-\x1F\x7F-\x9F]/g, '')) && 
                              nextLine.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim().length > 1 && 
                              nextLine.length < 200 &&
                              !nextLine.match(/^(Lesson|Vocabulary|Page|\d+|www\.|©|Umm|Arabic|Bank|Madinah)/i);
        
        // English followed by Arabic (most common pattern)
        if (hasEnglish && !hasArabic && nextHasArabic && !nextHasEnglish && currentLesson) {
            // Clean Arabic text - remove control characters and keep only Arabic
            let arabic = nextLine.trim();
            // Remove zero-width characters and other invisible chars
            arabic = arabic.replace(/[\u200B-\u200D\uFEFF\u00AD\u2000-\u200A\u2028-\u2029]/g, '');
            // Remove non-printable characters but keep Arabic
            arabic = arabic.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            // Keep Arabic characters, spaces, and diacritics, remove everything else
            arabic = arabic.replace(/[^\u0600-\u06FF\s\u064B-\u0652\u0670\u06E5\u06E6]/g, '').trim();
            
            // Also check if current line might have Arabic mixed in (corrupted encoding)
            const lineHasAnyArabic = /[\u0600-\u06FF]/.test(line);
            
            // Clean English too
            let english = line.trim();
            english = english.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
            
            if (arabic.length > 0 && english.length > 0 && !lineHasAnyArabic) {
                itemCounter++;
                const itemId = `b${bookNumber}_l${lessonNumber}_${String(itemCounter).padStart(3, '0')}`;
                
                currentLesson.items.push({
                    id: itemId,
                    english: english,
                    arabic: arabic,
                    transliteration: transliterate(arabic)
                });
                i++; // Skip next line
                continue;
            }
        }
        
        // Arabic followed by English (less common)
        if (hasArabic && !hasEnglish && nextHasEnglish && !nextHasArabic && currentLesson) {
            // Clean Arabic text
            let arabic = line.trim();
            arabic = arabic.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
            arabic = arabic.replace(/[^\u0600-\u06FF\s\u064B-\u0652\u0670\u06E5\u06E6]/g, '').trim();
            
            if (arabic.length > 0) {
                itemCounter++;
                const itemId = `b${bookNumber}_l${lessonNumber}_${String(itemCounter).padStart(3, '0')}`;
                
                currentLesson.items.push({
                    id: itemId,
                    english: nextLine.trim(),
                    arabic: arabic,
                    transliteration: transliterate(arabic)
                });
                i++; // Skip next line
                continue;
            }
        }
        
        // Also handle lines that might have both English and Arabic (corrupted but extractable)
        if (currentLesson && hasEnglish && hasArabic) {
            // Try to extract both
            const englishPart = line.match(/([a-zA-Z\s\-\(\)\.\?\,\:\;\!]+)/);
            const arabicPart = line.match(/([\u0600-\u06FF\s\u064B-\u0652\u0670\u06E5\u06E6]+)/);
            
            if (englishPart && arabicPart) {
                let english = englishPart[1].trim();
                let arabic = arabicPart[1].trim().replace(/[^\u0600-\u06FF\s\u064B-\u0652\u0670\u06E5\u06E6]/g, '').trim();
                
                if (english.length > 0 && arabic.length > 0 && 
                    !english.match(/^(Lesson|Vocabulary|Page|\d+|www\.|©|Umm|Arabic|Bank|Madinah)/i)) {
                    itemCounter++;
                    const itemId = `b${bookNumber}_l${lessonNumber}_${String(itemCounter).padStart(3, '0')}`;
                    
                    currentLesson.items.push({
                        id: itemId,
                        english: english,
                        arabic: arabic,
                        transliteration: transliterate(arabic)
                    });
                    continue;
                }
            }
        }
    }
    
    // Save last lesson
    if (currentLesson && currentLesson.items.length > 0) {
        lessons.push(currentLesson);
    }
    
    // Deduplicate lessons - merge items from duplicate lesson numbers
    const lessonMap = new Map();
    lessons.forEach(lesson => {
        const key = lesson.lesson;
        if (lessonMap.has(key)) {
            // Merge items, avoiding duplicates
            const existing = lessonMap.get(key);
            const existingIds = new Set(existing.items.map(item => item.id));
            lesson.items.forEach(item => {
                if (!existingIds.has(item.id)) {
                    existing.items.push(item);
                }
            });
        } else {
            lessonMap.set(key, lesson);
        }
    });
    
    // Convert back to array and sort by lesson number
    const deduplicated = Array.from(lessonMap.values()).sort((a, b) => a.lesson - b.lesson);
    
    return deduplicated;
}

/**
 * Process a PDF file
 */
async function processPDF(pdfPath, bookNumber) {
    try {
        console.log(`\n📖 Reading ${path.basename(pdfPath)}...`);
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        
        console.log(`   Pages: ${data.numpages}`);
        console.log(`   Extracting text...`);
        
        const text = data.text;
        
        // Try extraction with debug first time
        const debug = process.argv.includes('--debug');
        const lessons = extractVocabFromText(text, bookNumber, debug);
        
        // If no lessons found, save text for manual inspection
        if (lessons.length === 0) {
            const debugPath = pdfPath.replace('.pdf', '_extracted_text.txt');
            fs.writeFileSync(debugPath, text, 'utf8');
            console.log(`   ⚠️  No lessons found. Saved extracted text to: ${path.basename(debugPath)}`);
            console.log(`   💡 Run with --debug flag to see what was extracted: npm run extract -- --debug`);
        }
        
        console.log(`   ✅ Extracted ${lessons.length} lessons`);
        lessons.forEach(lesson => {
            console.log(`      - ${lesson.lesson_label}: ${lesson.items.length} words`);
        });
        
        return lessons;
    } catch (error) {
        console.error(`❌ Error processing ${pdfPath}:`, error.message);
        return [];
    }
}

/**
 * Main extraction function
 */
async function main() {
    console.log('🚀 Starting vocabulary extraction...\n');
    
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    const outputDir = dataDir;
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Process Book 1 - try multiple filename patterns
    let vocab1Path = path.join(dataDir, 'Vocab-book1.pdf');
    if (!fs.existsSync(vocab1Path)) {
        vocab1Path = path.join(dataDir, 'Vocab.pdf');
    }
    if (!fs.existsSync(vocab1Path)) {
        vocab1Path = path.join(dataDir, 'vocab-book1.pdf');
    }
    
    let book1Data = [];
    if (fs.existsSync(vocab1Path)) {
        book1Data = await processPDF(vocab1Path, 1);
    } else {
        console.log('⚠️  Vocab-book1.pdf or Vocab.pdf not found, skipping Book 1');
    }
    
    // Process Book 2 - try multiple filename patterns
    let vocab2Path = path.join(dataDir, 'Vocab-book2.pdf');
    if (!fs.existsSync(vocab2Path)) {
        vocab2Path = path.join(dataDir, 'Vocab2.pdf');
    }
    if (!fs.existsSync(vocab2Path)) {
        vocab2Path = path.join(dataDir, 'vocab-book2.pdf');
    }
    
    let book2Data = [];
    if (fs.existsSync(vocab2Path)) {
        book2Data = await processPDF(vocab2Path, 2);
    } else {
        console.log('⚠️  Vocab-book2.pdf or Vocab2.pdf not found, skipping Book 2');
    }
    
    // If extraction failed or returned empty, use fallback data
    if (book1Data.length === 0) {
        console.log('\n⚠️  Book 1 extraction returned no data. Using fallback sample data.');
        book1Data = [{
            book: 1,
            lesson: 1,
            lesson_label: "Lesson 1",
            items: [
                { id: "b1_l1_001", english: "house", arabic: "بَيْتٌ", transliteration: "baytun" },
                { id: "b1_l1_002", english: "boy", arabic: "وَلَدٌ", transliteration: "waladun" },
                { id: "b1_l1_003", english: "mosque", arabic: "مَسْجِدٌ", transliteration: "masjidun" },
                { id: "b1_l1_004", english: "door", arabic: "بَابٌ", transliteration: "baabun" },
                { id: "b1_l1_005", english: "book", arabic: "كِتَابٌ", transliteration: "kitaabun" }
            ]
        }];
    }
    
    if (book2Data.length === 0) {
        console.log('\n⚠️  Book 2 extraction returned no data. Check PDF format.');
    }
    
    // Write JSON files
    const book1Output = path.join(outputDir, 'book1.json');
    const book2Output = path.join(outputDir, 'book2.json');
    
    fs.writeFileSync(book1Output, JSON.stringify(book1Data, null, 2), 'utf8');
    console.log(`\n✅ Written: ${book1Output} (${book1Data.length} lessons)`);
    
    if (book2Data.length > 0) {
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
    
    console.log('✨ Extraction complete!\n');
}

// Run extraction
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
