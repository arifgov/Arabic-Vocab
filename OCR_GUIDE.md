# OCR Extraction Guide

This guide will help you extract all 23 lessons from Book 1 and 31 lessons from Book 2 using OCR.

## Step 1: Convert PDFs to Text Using OCR

### Option A: Online OCR (Easiest)

1. **Go to an OCR service:**
   - https://www.onlineocr.net/
   - https://www.ilovepdf.com/pdf-to-txt
   - https://www.zamzar.com/convert/pdf-to-txt/
   - https://www.adobe.com/acrobat/online/pdf-to-txt.html

2. **Upload your PDFs:**
   - Upload `public/data/Vocab.pdf` (Book 1)
   - Upload `public/data/Vocab2.pdf` (Book 2)

3. **Select language:** Arabic + English (multilingual OCR)

4. **Download the text files:**
   - Save as `Vocab_ocr.txt` (Book 1)
   - Save as `Vocab2_ocr.txt` (Book 2)

5. **Place files in:** `public/data/` folder

### Option B: Tesseract OCR (Command Line)

1. **Install Tesseract:**
   ```bash
   # Windows (using Chocolatey)
   choco install tesseract
   
   # Or download from: https://github.com/UB-Mannheim/tesseract/wiki
   ```

2. **Convert PDFs to images first:**
   ```bash
   # Using ImageMagick or pdftoppm
   pdftoppm -png public/data/Vocab.pdf public/data/vocab_page
   pdftoppm -png public/data/Vocab2.pdf public/data/vocab2_page
   ```

3. **Run OCR:**
   ```bash
   tesseract public/data/vocab_page-001.png stdout -l ara+eng > public/data/Vocab_ocr.txt
   # Repeat for all pages and combine
   ```

### Option C: Adobe Acrobat Pro

1. Open PDF in Adobe Acrobat Pro
2. Tools → Text Recognition → In This File
3. Select Arabic + English
4. File → Export To → Text (Plain)
5. Save as `Vocab_ocr.txt` and `Vocab2_ocr.txt`

### Option D: Google Drive (Free)

1. Upload PDFs to Google Drive
2. Right-click → Open with → Google Docs
3. Google Docs will automatically OCR the PDF
4. Copy the text and save as `.txt` files

## Step 2: Run the Extraction Script

Once you have the OCR text files:

```bash
node scripts/extract_from_ocr.js
```

For debug output (to see what's being extracted):

```bash
node scripts/extract_from_ocr.js --debug
```

## Step 3: Verify the Results

The script will:
- Extract lessons from the OCR text
- Generate `book1.json` and `book2.json`
- Show a summary of extracted lessons

**Expected results:**
- Book 1: 23 lessons
- Book 2: 31 lessons

## Troubleshooting

### If lessons are missing:

1. **Check the OCR text file:**
   - Open `Vocab_ocr.txt` or `Vocab2_ocr.txt`
   - Search for "Lesson 1", "Lesson 2", etc.
   - Make sure lesson headers are present

2. **Run with debug:**
   ```bash
   node scripts/extract_from_ocr.js --debug
   ```
   This will show the first 30 lines of extracted text

3. **Manual fixes:**
   - If OCR text is messy, clean it up manually
   - Ensure lesson headers are clear (e.g., "Lesson 1", "Lesson 2")
   - Ensure vocabulary entries are on separate lines

### If vocabulary entries are not detected:

The script looks for:
- Table format: `English | Arabic` or `English \t Arabic`
- Adjacent lines: Arabic on one line, English on next (or vice versa)
- Both Arabic and English on the same line

**Common issues:**
- OCR might have merged lines → manually split them
- Arabic text might be corrupted → check OCR quality
- Format might be different → adjust the script patterns

### Manual Editing

If automatic extraction doesn't work perfectly:

1. Open the generated JSON files (`book1.json`, `book2.json`)
2. Manually add missing lessons or fix entries
3. Use the format:
   ```json
   {
     "id": "b1_l1_001",
     "english": "house",
     "arabic": "بَيْتٌ",
     "transliteration": "baytun"
   }
   ```

## Quick Test

After extraction, verify the JSON files:

```bash
# Check lesson counts
node -e "const b1=require('./public/data/book1.json'); console.log('Book 1:', b1.length, 'lessons');"
node -e "const b2=require('./public/data/book2.json'); console.log('Book 2:', b2.length, 'lessons');"
```

## Next Steps

Once extraction is complete:
1. Start the server: `python -m http.server 8000 -d public`
2. Open: `http://localhost:8000`
3. Start learning!

