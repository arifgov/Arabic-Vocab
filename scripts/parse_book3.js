/**
 * Parse Book 3 vocabulary from provided PDF text content
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

// Book 3 data from PDF (provided in user query)
const book3Text = `|  |  | أَيُّبَرُ سِنًّا |  | older |  |
| :--: | :--: | :--: | :--: | :--: | :--: |
| B03 | L01 | جِينَبْن |  | at that time |  |
| B03 | L01 | طَيَّبَةُ | (without tanwîn) | another name of Madinah |  |
| B03 | L02 | خَدِيثٌ مُتَّفَقٌ عَلَيْهِ |  | a hadîth reported by both Imam Bukhari and Imam Muslim in their hadîth collections known as |  |
| B03 | L02 | قَسَمٌ |  | oath |  |
| B03 | L02 | عُثْرٌ |  | a hâjj (pilgrim) who has assumed the state of sanctity |  |
| B03 | L02 | عُثْرَةٌ |  | visit to the Ka'bah |  |
| B03 | L02 | حِرْبٌ |  | group, party |  |
| B03 | L02 | فَرِحٌ |  | happy, rejoicing | (pl) (فَرَحُون |
| B03 | L02 | الْمَائِدَةُ |  | name of the 5th sûrah (literally, dining table) |  |
| B03 | L02 | الرُّومُ |  | name of the 30th sûrah (literally, the Byzantines) |  |
| B03 | L02 | نَشْرَةُ الأَحْبَارِ |  | news bulletin |  |
| B03 | L02 | وَدَاعٌ |  | farewell |  |
| B03 | L02 | طَلَعَ يَطْلُعُ طُلُوعاً | (a-u) | to rise (of the sun) |  |
| B03 | L02 | غَرَبَ يَغُرِبُ غُرُوباً | (a-u) | to set (of the sun) |  |
| B03 | L02 | نَطَقَ يَنْطِقُ نُطْفَاً | (a-i) | to speak, utter (a word), talk, pronounce |  |
| B03 | L02 | ثَقَبَّنَ يَتَقَبَّلُ | v | to accept |  |
| B03 | L02 | أَفَامَ يُقِيمُ | iv | to say iqâmah |  |
| B03 | L02 | حَمَلَ يَحْمِلُ | (a-i) | to carry |  |
| B03 | 1.02 | شَاءَ يَشَاءُ | (i-a) | to wish, to want |  |
| B03 | 1.02 | شَرَحَ يَشْرَحُ | (a-a) | to explain |  |
| B03 | 1.02 | مُعْنَى |  | meaning | (pl. (مَعَانِ |
| B03 | 1.02 | حَالٌ |  | state, situation, circumstance | (pl. (أَحْوَالُ |
| B03 | 1.02 | حَطَبَ يَخْطُبُ | (a-u) | to deliver a lecture, to address a gathering |  |
| B03 | 1.02 | طَلَبَ يَطْلُبُ | (a-u) | to seek |  |
| B03 | 1.02 | بَقِيَ يَنْقَى | (i-a) | to remain |  |
| B03 | 1.02 | قَرِبَ يَقْرَبُ | (i-a) | to approach, go near |  |
| B03 | 1.02 | أَفَادَ يُفِيدُ | iv | to inform, to convey the meaning, to denote, to signify |  |
| B03 | 1.02 | اسْتَجَابَ يَسْتَجِيبُ | x | to respond, to answer (a prayer), to grant (a request) |  |
| B03 | 1.02 | اسْتَجِبْ |  | answer! |  |
| B03 | 1.02 | قَلَبَ يَقْلِبُ | (a-i) | to overturn, to change |  |
| B03 | 1.02 | إِنْشَاءٌ |  | composition, writing |  |
| B03 | 1.02 | صَحِيحٌ |  | healthy | (pl. (أَصِـحَاءُ |
| B03 | 1.02 | صَحِيفَةٌ |  | newspaper | (pl. (صُحُفُ |
| B03 | 1.02 | شَرْطٌ |  | condition | (pl. (شَرُوطُ |
| B03 | 1.02 | عَلَى غِرَارٍ كَذَا |  | after the pattern of, similar to, in the manner of |  |
| B03 | 1.02 | خَطٌّ |  | line | (pl. (خَطُوطُ |
| B03 | 1.02 | تَأَكَّدَ يَتَأَكَّدُ | vi | to make sure |  |
| B03 | 1.02 | صَيْدٌ |  | game (hunted wild animal) |  |
| B03 | L02 | كَوْن | (masdar of كَنْ) | to be, being |  |
| B03 | L02 |  |  | one who has failed (in an examination) | (pl. (زاسِبُون |
| B03 | L02 | زَاسِبْ |  | last night |  |
| B03 | L03 | الْبَارِحَةَ |  | rule | (pl. (قَوَاعِدُ |
| B03 | L03 | قَاعِدَةٌ |  | clothes |  |
| B03 | L03 | مَالآيِسُ |  | shoe | (pl. (أَخْذِيَةٌ |
| B03 | L03 | حِذَاءٌ |  | most of the books |  |
| B03 | L03 | مُعْظَمُ الكُتُبِ |  | grains |  |
| B03 | L03 | حَبٌّ |  | thief | (pl. (لُصُوص |
| B03 | L03 | لِص |  | (pl. (أَسُورَةُ |  |
| B03 | L03 | سِوَارٌ |  | ticket | (pl....(132392 chars omitted)...ةً | to connect  |
|   |  |  | عَامٍّ (ج عُلَمَاءُ) | learned man, scholar  |
|  B03 | L34 | 2 | شَرِيعَةٌ | Islamic Law  |
|  B03 | L34 | 3 | مَسْأَلَةٌ (ج مَسَائِل) | issue, matter, problem  |
|  B03 | L34 | 4 | خَصَّصَ؛ تَقْصِيصاً (ii) | (1) to set aside, particularize (gr) to reduce the indefiniteness  |
|  B03 | L34 | 5 | اِسْتَقَارٌ؛ اِسْتِقْلالاً (x) | to be independent  |
|  B03 | L34 | 6 | مُسْتَقِارٌّ | independent, separate  |
|  B03 | L34 | 7 | عَدَلَ؛ عَدَالَةً (a-i) | to act justly  |
|  B03 | L34 | 8 | أَفْسَطَ؛ إِفْسَاطاً (iv) | to act justly, deal fairly  |
|  B03 | L34 | 9 | طَابَ (ل): يَطِيبُ؛ طِيباً | to be one's liking  |
|  B03 | L34 | 10 | فَوْسُ فُرْحَ | rainbow  |
|  B03 | L34 | 11 | طَيِّفٌ | spectrum  |
|  B03 | L34 | 12 | تَتَابَعَ؛ تَتَابُعاً (vi) | to follow in succession  |
|  B03 | L34 | 13 | أَسَرَّ (إلى)؛ إِسْرَاراً (iv) | to confide, to speak scretly  |
|  B03 | L34 | 14 | مَعْمَلٌ | laboratory, workshop  |
|  B03 | L34 | 15 | خُفْ؟ خُُفّاً (i-a) | to become attached  |
|  B03 | L34 | 16 | عِلَّةٌ (ج عِلَلٌ) | reason  |
|  B03 | L34 | 17 | خَتَمَ؛ ختْماً (a-i) | to close, finish, end, seal  |
|  B03 | L34 | 18 |  |   |
|  B03 | L34 | 19 |  | حُبْلَى (ج حَبَالَى) |  | pregnant |
| B03 | L34 | 20 | (ج فَتَاوَى، فَتَاوٍ) |  | religious ruling |
| B03 | L34 | 21 | هَدِيَةٌ (ج هَدَايَا) |  | present, gift |
|  |  |  | صَحْرَاءُ (ج صَحَارِيٍّ) |  | desert |
| B03 | L34 | 22 | شِيْهُ (ج أَشْباهُ) |  | simillax, like |
| B03 | L34 | 23 | رِسَالَةٌ (ج رَسَائِلُ) |  | message |
| B03 | L34 | 24 | فِنْجَانُ (ج فَنَاجِينُ) |  | cofee cup |
| B03 | L34 | 25 | أُسْبُوعٌ (ج أَسَابِيعُ) |  | week |
| B03 | L34 | 26 | نُعْبَانٌ (ج نُعَابِينُ) |  | serpent |
| B03 | L34 | 27 | طَماطِعُ |  | tomato |
| B03 | L34 | 28 | بَطَاطِسُ |  | potato |
| B03 | L34 | 29 | طَبَاشِيرُ |  | chalk (to write) |
| B03 | L34 | 30 | سَرَاوِيلُ |  | trousers |
| B03 | L34 | 31 | عَلَمٌ (ج أَعْلامُ) |  | (gr) proper name |
| B03 | L34 | 32 | صِفَةٌ |  | (gr) adjective |
| B03 | L34 | 33 | مُسَمَّى |  | named, called, known |
| B03 | L34 | 34 | وَسَطٌ |  | middle |
| B03 | L34 | 35 | ثُلاَثِيِّ سَاكِنُ الوَسَطِ |  | (gr) a three-letter word with middle letter being vowelless |
|  B03 | L34 | 37 |  | مَعْنُولُ | (gr) transformed  |
|   |  |  |  | مُرَكَّباً | compound  |
|  B03 | L34 | 38 |  |  |   |
|   |  |  | اِشْتَرَطْ؛ اِشْتِرَاطاً | (viii) | to stipulate, to make conditional  |
|  B03 | L34 | 39 |  |  |   |
|   |  |  | أَرْمَعُ |  | widower  |
|  B03 | L34 | 40 |  | أَرْمَلَةٌ | widow  |
|   |  |  | أَرْمَلَةٌ |  | combined  |
|  B03 | L34 | 41 | مَوْجياً |  |   |
|   |  |  | مَعْدي |  | stomach  |
|  B03 | L34 | 42 |  | مَعْديكَرِبُ | stomach distresse???  |
|   |  |  | حَضَرَمَوْتُ |  | near to death  |
|  B03 | L34 | 45 |  |  |   |
|   |  |  | أَضَافَ: يُضِيفُ؛ إِضَافَةً | (iv) | (1) to add (gr) to add a noun to another to signify the meaning of possession.  |
|  B03 | L34 | 46 |  | مَنْقُوصُ | (gr) a noun ending in an original ya such as an-naady  |
|  B03 | L34 | 47 |  | جَارِيَةٌ (ج جَوَارٍ) | girl  |
|   |  |  | ( جَرْنَبٌ (ج أَرَانِبُ) | أَرْنَبٌ (ج أَرَانِبُ) | rabbit  |
|  B03 | L34 | 48 |  |  |   |`;

function parseBook3Data(text) {
    const lessons = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let currentLesson = null;
    let itemCounter = 0;
    
    for (const line of lines) {
        // Skip header rows
        if (line.startsWith('| :--:') || line.match(/^\|.*Book.*Lesson/i)) {
            continue;
        }
        
        // Parse pipe-separated table rows
        if (line.includes('|')) {
            const parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
            
            // Format: | B03 | L01 | Arabic | notes | English | notes |
            // Or: | B03 | 1.02 | Arabic | notes | English | notes |
            if (parts.length >= 5) {
                const bookPart = parts[0];
                const lessonPart = parts[1];
                
                // Extract lesson number
                let lessonNum = null;
                if (lessonPart.startsWith('L')) {
                    lessonNum = parseInt(lessonPart.substring(1));
                } else if (lessonPart.includes('.')) {
                    lessonNum = parseInt(lessonPart.split('.')[1]);
                } else {
                    const numMatch = lessonPart.match(/\d+/);
                    if (numMatch) {
                        lessonNum = parseInt(numMatch[0]);
                    }
                }
                
                if (!lessonNum || lessonNum < 1 || lessonNum > 50) {
                    continue;
                }
                
                // Get Arabic (usually in parts[2])
                let arabic = parts[2] || '';
                // Get English (usually in parts[4] or parts[3])
                let english = '';
                
                // Find English text (contains English characters, not just Arabic)
                for (let i = 3; i < parts.length; i++) {
                    const part = parts[i];
                    if (part && /[a-zA-Z]/.test(part) && !/[\u0600-\u06FF]/.test(part)) {
                        if (english) {
                            english += ' ' + part;
                        } else {
                            english = part;
                        }
                    }
                }
                
                // If no English found, try parts[4]
                if (!english && parts[4]) {
                    english = parts[4];
                }
                
                // Clean Arabic - remove non-Arabic characters except spaces and diacritics
                arabic = arabic.replace(/[^\u0600-\u06FF\s\u064B-\u0652\u0670\u06E5\u06E6]/g, '').trim();
                
                // Clean English
                english = english.replace(/^\([^)]+\)\s*/, '').trim(); // Remove leading parentheses
                english = english.replace(/\s+/g, ' ').trim();
                
                // Validate we have both Arabic and English
                if (arabic && english && /[\u0600-\u06FF]/.test(arabic) && /[a-zA-Z]/.test(english)) {
                    // Check if we need a new lesson
                    if (!currentLesson || currentLesson.lesson !== lessonNum) {
                        // Save previous lesson
                        if (currentLesson && currentLesson.items.length > 0) {
                            lessons.push(currentLesson);
                        }
                        
                        // Create new lesson
                        currentLesson = {
                            book: 3,
                            lesson: lessonNum,
                            lesson_label: `Lesson ${lessonNum}`,
                            items: []
                        };
                        itemCounter = 0;
                    }
                    
                    itemCounter++;
                    const itemId = `b3_l${lessonNum}_${String(itemCounter).padStart(3, '0')}`;
                    
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
    
    // Save last lesson
    if (currentLesson && currentLesson.items.length > 0) {
        lessons.push(currentLesson);
    }
    
    // Sort by lesson number
    lessons.sort((a, b) => a.lesson - b.lesson);
    
    return lessons;
}

// Since the provided text is truncated, we'll create a basic structure
// and the user can add more data later
const basicBook3Data = [
    {
        book: 3,
        lesson: 1,
        lesson_label: "Lesson 1",
        items: [
            {
                id: "b3_l1_001",
                english: "at that time",
                arabic: "جِينَبْن",
                transliteration: "jynabn"
            },
            {
                id: "b3_l1_002",
                english: "another name of Madinah",
                arabic: "طَيَّبَةُ",
                transliteration: "tayyabatu"
            }
        ]
    },
    {
        book: 3,
        lesson: 2,
        lesson_label: "Lesson 2",
        items: [
            {
                id: "b3_l2_001",
                english: "a hadîth reported by both Imam Bukhari and Imam Muslim in their hadîth collections known as",
                arabic: "خَدِيثٌ مُتَّفَقٌ عَلَيْهِ",
                transliteration: "hadithun muttafaqun alayhi"
            },
            {
                id: "b3_l2_002",
                english: "oath",
                arabic: "قَسَمٌ",
                transliteration: "qasamun"
            },
            {
                id: "b3_l2_003",
                english: "a hâjj (pilgrim) who has assumed the state of sanctity",
                arabic: "عُثْرٌ",
                transliteration: "uthrun"
            },
            {
                id: "b3_l2_004",
                english: "visit to the Ka'bah",
                arabic: "عُثْرَةٌ",
                transliteration: "uthratun"
            },
            {
                id: "b3_l2_005",
                english: "group, party",
                arabic: "حِرْبٌ",
                transliteration: "harbun"
            },
            {
                id: "b3_l2_006",
                english: "happy, rejoicing",
                arabic: "فَرِحٌ",
                transliteration: "farihun"
            },
            {
                id: "b3_l2_007",
                english: "name of the 5th sûrah (literally, dining table)",
                arabic: "الْمَائِدَةُ",
                transliteration: "almaidatu"
            },
            {
                id: "b3_l2_008",
                english: "name of the 30th sûrah (literally, the Byzantines)",
                arabic: "الرُّومُ",
                transliteration: "arroumu"
            },
            {
                id: "b3_l2_009",
                english: "news bulletin",
                arabic: "نَشْرَةُ الأَحْبَارِ",
                transliteration: "nashratu alahbari"
            },
            {
                id: "b3_l2_010",
                english: "farewell",
                arabic: "وَدَاعٌ",
                transliteration: "wadaaun"
            },
            {
                id: "b3_l2_011",
                english: "to rise (of the sun)",
                arabic: "طَلَعَ يَطْلُعُ طُلُوعاً",
                transliteration: "talaa yatluu tuluuan"
            },
            {
                id: "b3_l2_012",
                english: "to set (of the sun)",
                arabic: "غَرَبَ يَغُرِبُ غُرُوباً",
                transliteration: "gharaba yaghribu ghuruuban"
            },
            {
                id: "b3_l2_013",
                english: "to speak, utter (a word), talk, pronounce",
                arabic: "نَطَقَ يَنْطِقُ نُطْفَاً",
                transliteration: "nataqa yantiqun nutfan"
            },
            {
                id: "b3_l2_014",
                english: "to accept",
                arabic: "ثَقَبَّنَ يَتَقَبَّلُ",
                transliteration: "thaqabbana yataqabbalu"
            },
            {
                id: "b3_l2_015",
                english: "to say iqâmah",
                arabic: "أَفَامَ يُقِيمُ",
                transliteration: "aqaama yuqeemu"
            },
            {
                id: "b3_l2_016",
                english: "to carry",
                arabic: "حَمَلَ يَحْمِلُ",
                transliteration: "hamala yahmilu"
            },
            {
                id: "b3_l2_017",
                english: "to wish, to want",
                arabic: "شَاءَ يَشَاءُ",
                transliteration: "shaa yashaa"
            },
            {
                id: "b3_l2_018",
                english: "to explain",
                arabic: "شَرَحَ يَشْرَحُ",
                transliteration: "sharaha yashrahu"
            },
            {
                id: "b3_l2_019",
                english: "meaning",
                arabic: "مُعْنَى",
                transliteration: "maanaa"
            },
            {
                id: "b3_l2_020",
                english: "state, situation, circumstance",
                arabic: "حَالٌ",
                transliteration: "haalun"
            },
            {
                id: "b3_l2_021",
                english: "to deliver a lecture, to address a gathering",
                arabic: "حَطَبَ يَخْطُبُ",
                transliteration: "khataba yakhtubu"
            },
            {
                id: "b3_l2_022",
                english: "to seek",
                arabic: "طَلَبَ يَطْلُبُ",
                transliteration: "talaba yatlubu"
            },
            {
                id: "b3_l2_023",
                english: "to remain",
                arabic: "بَقِيَ يَنْقَى",
                transliteration: "baqiya yanqaa"
            },
            {
                id: "b3_l2_024",
                english: "to approach, go near",
                arabic: "قَرِبَ يَقْرَبُ",
                transliteration: "qariba yaqrabu"
            },
            {
                id: "b3_l2_025",
                english: "to inform, to convey the meaning, to denote, to signify",
                arabic: "أَفَادَ يُفِيدُ",
                transliteration: "afaada yufeedu"
            },
            {
                id: "b3_l2_026",
                english: "to respond, to answer (a prayer), to grant (a request)",
                arabic: "اسْتَجَابَ يَسْتَجِيبُ",
                transliteration: "istajaaba yastajeebu"
            },
            {
                id: "b3_l2_027",
                english: "answer!",
                arabic: "اسْتَجِبْ",
                transliteration: "istajib"
            },
            {
                id: "b3_l2_028",
                english: "to overturn, to change",
                arabic: "قَلَبَ يَقْلِبُ",
                transliteration: "qalaba yaqlibu"
            },
            {
                id: "b3_l2_029",
                english: "composition, writing",
                arabic: "إِنْشَاءٌ",
                transliteration: "inshaaun"
            },
            {
                id: "b3_l2_030",
                english: "healthy",
                arabic: "صَحِيحٌ",
                transliteration: "sahiihun"
            },
            {
                id: "b3_l2_031",
                english: "newspaper",
                arabic: "صَحِيفَةٌ",
                transliteration: "sahiifatun"
            },
            {
                id: "b3_l2_032",
                english: "condition",
                arabic: "شَرْطٌ",
                transliteration: "shartun"
            },
            {
                id: "b3_l2_033",
                english: "after the pattern of, similar to, in the manner of",
                arabic: "عَلَى غِرَارٍ كَذَا",
                transliteration: "alaa ghiraarin kadhaa"
            },
            {
                id: "b3_l2_034",
                english: "line",
                arabic: "خَطٌّ",
                transliteration: "khattun"
            },
            {
                id: "b3_l2_035",
                english: "to make sure",
                arabic: "تَأَكَّدَ يَتَأَكَّدُ",
                transliteration: "taakkada yataakkadu"
            },
            {
                id: "b3_l2_036",
                english: "game (hunted wild animal)",
                arabic: "صَيْدٌ",
                transliteration: "saydun"
            },
            {
                id: "b3_l2_037",
                english: "to be, being",
                arabic: "كَوْن",
                transliteration: "kawn"
            },
            {
                id: "b3_l2_038",
                english: "last night",
                arabic: "الْبَارِحَةَ",
                transliteration: "albaarihata"
            }
        ]
    },
    {
        book: 3,
        lesson: 3,
        lesson_label: "Lesson 3",
        items: [
            {
                id: "b3_l3_001",
                english: "rule",
                arabic: "قَاعِدَةٌ",
                transliteration: "qaaidatun"
            },
            {
                id: "b3_l3_002",
                english: "clothes",
                arabic: "مَالآيِسُ",
                transliteration: "maalayisu"
            },
            {
                id: "b3_l3_003",
                english: "shoe",
                arabic: "حِذَاءٌ",
                transliteration: "hidaaun"
            },
            {
                id: "b3_l3_004",
                english: "most of the books",
                arabic: "مُعْظَمُ الكُتُبِ",
                transliteration: "muazhamu alkutubi"
            },
            {
                id: "b3_l3_005",
                english: "grains",
                arabic: "حَبٌّ",
                transliteration: "habbun"
            },
            {
                id: "b3_l3_006",
                english: "thief",
                arabic: "لِص",
                transliteration: "lis"
            },
            {
                id: "b3_l3_007",
                english: "ticket",
                arabic: "سِوَارٌ",
                transliteration: "siwaarun"
            }
        ]
    },
    {
        book: 3,
        lesson: 34,
        lesson_label: "Lesson 34",
        items: [
            {
                id: "b3_l34_001",
                english: "learned man, scholar",
                arabic: "عَامٍّ",
                transliteration: "aamil"
            },
            {
                id: "b3_l34_002",
                english: "Islamic Law",
                arabic: "شَرِيعَةٌ",
                transliteration: "shariaatun"
            },
            {
                id: "b3_l34_003",
                english: "issue, matter, problem",
                arabic: "مَسْأَلَةٌ",
                transliteration: "masalatun"
            },
            {
                id: "b3_l34_004",
                english: "to set aside, particularize (gr) to reduce the indefiniteness",
                arabic: "خَصَّصَ",
                transliteration: "khassasa"
            },
            {
                id: "b3_l34_005",
                english: "to be independent",
                arabic: "اِسْتَقَارٌ",
                transliteration: "istaqaarun"
            },
            {
                id: "b3_l34_006",
                english: "independent, separate",
                arabic: "مُسْتَقِارٌّ",
                transliteration: "mustaqarrun"
            },
            {
                id: "b3_l34_007",
                english: "to act justly",
                arabic: "عَدَلَ",
                transliteration: "adala"
            },
            {
                id: "b3_l34_008",
                english: "to act justly, deal fairly",
                arabic: "أَفْسَطَ",
                transliteration: "afsata"
            },
            {
                id: "b3_l34_009",
                english: "to be one's liking",
                arabic: "طَابَ",
                transliteration: "taaba"
            },
            {
                id: "b3_l34_010",
                english: "rainbow",
                arabic: "فَوْسُ فُرْحَ",
                transliteration: "fawsu furha"
            },
            {
                id: "b3_l34_011",
                english: "spectrum",
                arabic: "طَيِّفٌ",
                transliteration: "tayyifun"
            },
            {
                id: "b3_l34_012",
                english: "to follow in succession",
                arabic: "تَتَابَعَ",
                transliteration: "tataba"
            },
            {
                id: "b3_l34_013",
                english: "to confide, to speak secretly",
                arabic: "أَسَرَّ",
                transliteration: "asarra"
            },
            {
                id: "b3_l34_014",
                english: "laboratory, workshop",
                arabic: "مَعْمَلٌ",
                transliteration: "maamalun"
            },
            {
                id: "b3_l34_015",
                english: "to become attached",
                arabic: "خُفْ",
                transliteration: "khuf"
            },
            {
                id: "b3_l34_016",
                english: "reason",
                arabic: "عِلَّةٌ",
                transliteration: "illatun"
            },
            {
                id: "b3_l34_017",
                english: "to close, finish, end, seal",
                arabic: "خَتَمَ",
                transliteration: "khatama"
            },
            {
                id: "b3_l34_018",
                english: "pregnant",
                arabic: "حُبْلَى",
                transliteration: "hublaa"
            },
            {
                id: "b3_l34_019",
                english: "religious ruling",
                arabic: "فَتْوَى",
                transliteration: "fatwaa"
            },
            {
                id: "b3_l34_020",
                english: "present, gift",
                arabic: "هَدِيَةٌ",
                transliteration: "hadiyatun"
            },
            {
                id: "b3_l34_021",
                english: "desert",
                arabic: "صَحْرَاءُ",
                transliteration: "sahraau"
            },
            {
                id: "b3_l34_022",
                english: "similar, like",
                arabic: "شِيْهُ",
                transliteration: "shiihu"
            },
            {
                id: "b3_l34_023",
                english: "message",
                arabic: "رِسَالَةٌ",
                transliteration: "risaalatun"
            },
            {
                id: "b3_l34_024",
                english: "coffee cup",
                arabic: "فِنْجَانُ",
                transliteration: "finjaanun"
            },
            {
                id: "b3_l34_025",
                english: "week",
                arabic: "أُسْبُوعٌ",
                transliteration: "usbuuun"
            },
            {
                id: "b3_l34_026",
                english: "serpent",
                arabic: "نُعْبَانٌ",
                transliteration: "nuubaanun"
            },
            {
                id: "b3_l34_027",
                english: "tomato",
                arabic: "طَماطِعُ",
                transliteration: "tamaatiu"
            },
            {
                id: "b3_l34_028",
                english: "potato",
                arabic: "بَطَاطِسُ",
                transliteration: "bataatisun"
            },
            {
                id: "b3_l34_029",
                english: "chalk (to write)",
                arabic: "طَبَاشِيرُ",
                transliteration: "tabaashiiru"
            },
            {
                id: "b3_l34_030",
                english: "trousers",
                arabic: "سَرَاوِيلُ",
                transliteration: "saraawiilu"
            },
            {
                id: "b3_l34_031",
                english: "(gr) proper name",
                arabic: "عَلَمٌ",
                transliteration: "alamun"
            },
            {
                id: "b3_l34_032",
                english: "(gr) adjective",
                arabic: "صِفَةٌ",
                transliteration: "sifatun"
            },
            {
                id: "b3_l34_033",
                english: "named, called, known",
                arabic: "مُسَمَّى",
                transliteration: "musammaa"
            },
            {
                id: "b3_l34_034",
                english: "middle",
                arabic: "وَسَطٌ",
                transliteration: "wasatun"
            },
            {
                id: "b3_l34_035",
                english: "(gr) a three-letter word with middle letter being vowelless",
                arabic: "ثُلاَثِيِّ سَاكِنُ الوَسَطِ",
                transliteration: "thulaathiyy saakinu alwasati"
            },
            {
                id: "b3_l34_036",
                english: "(gr) transformed",
                arabic: "مَعْنُولُ",
                transliteration: "manuulun"
            },
            {
                id: "b3_l34_037",
                english: "compound",
                arabic: "مُرَكَّباً",
                transliteration: "murakkaban"
            },
            {
                id: "b3_l34_038",
                english: "to stipulate, to make conditional",
                arabic: "اِشْتَرَطْ",
                transliteration: "ishtarata"
            },
            {
                id: "b3_l34_039",
                english: "widower",
                arabic: "أَرْمَعُ",
                transliteration: "armau"
            },
            {
                id: "b3_l34_040",
                english: "widow",
                arabic: "أَرْمَلَةٌ",
                transliteration: "armalatun"
            },
            {
                id: "b3_l34_041",
                english: "combined",
                arabic: "مَوْجياً",
                transliteration: "mawjiyan"
            },
            {
                id: "b3_l34_042",
                english: "stomach",
                arabic: "مَعْدِي",
                transliteration: "madiy"
            },
            {
                id: "b3_l34_043",
                english: "stomach distress",
                arabic: "مَعْدِيكَرِبُ",
                transliteration: "madiikaribu"
            },
            {
                id: "b3_l34_044",
                english: "near to death",
                arabic: "حَضَرَمَوْتُ",
                transliteration: "hadaramawtu"
            },
            {
                id: "b3_l34_045",
                english: "to add (gr) to add a noun to another to signify the meaning of possession",
                arabic: "أَضَافَ",
                transliteration: "adaafa"
            },
            {
                id: "b3_l34_046",
                english: "(gr) a noun ending in an original ya such as an-naady",
                arabic: "مَنْقُوصُ",
                transliteration: "manquusun"
            },
            {
                id: "b3_l34_047",
                english: "girl",
                arabic: "جَارِيَةٌ",
                transliteration: "jaariyatun"
            },
            {
                id: "b3_l34_048",
                english: "rabbit",
                arabic: "أَرْنَبٌ",
                transliteration: "arnabun"
            }
        ]
    }
];

// Write the JSON file
const outputDir = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'book3.json');
fs.writeFileSync(outputPath, JSON.stringify(basicBook3Data, null, 2), 'utf8');

console.log(`✅ Created ${outputPath}`);
console.log(`   ${basicBook3Data.length} lessons`);
const totalWords = basicBook3Data.reduce((sum, l) => sum + l.items.length, 0);
console.log(`   ${totalWords} words total`);

