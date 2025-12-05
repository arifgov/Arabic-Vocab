# Quick Start Guide

## ✅ Issue 1: HTTP/HTTPS Error - FIXED

**Problem**: You're getting a `400 Bad request version` error.

**Solution**: 
- Make sure you're accessing **http://localhost:8000** (NOT https://)
- Your browser might be forcing HTTPS - clear the address bar and type `http://localhost:8000`

**To run the server:**
```bash
# Python (easiest)
python -m http.server 8000 -d public

# Then open: http://localhost:8000
```

---

## ✅ Issue 2: Extracting Words from PDFs

### The Problem
Your PDFs appear to be **scanned images** (not text-based), so automatic extraction doesn't work. The script can't read the text directly.

### Solutions

#### Option A: Use the Pre-extracted Data (Easiest)
I've already extracted Book 2 vocabulary from the PDF content you provided. The `book2.json` file has 7 lessons ready to use!

**Book 1**: You'll need to manually add the vocabulary. See Option B or C below.

#### Option B: Manual Entry (Recommended for Book 1)
1. Open `public/data/book1.json`
2. Edit it to add your vocabulary following this format:

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
      },
      {
        "id": "b1_l1_002",
        "english": "boy",
        "arabic": "وَلَدٌ",
        "transliteration": "waladun"
      }
    ]
  },
  {
    "book": 1,
    "lesson": 2,
    "lesson_label": "Lesson 2",
    "items": [
      {
        "id": "b1_l2_001",
        "english": "word",
        "arabic": "كلمة",
        "transliteration": "kalimah"
      }
    ]
  }
]
```

#### Option C: Use OCR (Advanced)
If your PDFs are scanned images, you can use OCR:

1. **Online OCR**: Upload PDFs to https://www.onlineocr.net/ or similar
2. **Save as text**: Get the text output
3. **Modify the script**: Update `extract_vocab.js` to read from `.txt` files instead of PDFs

#### Option D: Copy-Paste Method
1. Open your PDF
2. Select and copy the vocabulary tables
3. Paste into a text file (e.g., `book1_raw.txt`)
4. The script can be modified to parse this format

---

## 🚀 Getting Started Right Now

**Book 2 is ready to use!** It has 7 lessons with vocabulary already extracted.

1. **Start the server:**
   ```bash
   python -m http.server 8000 -d public
   ```

2. **Open in browser:**
   ```
   http://localhost:8000
   ```

3. **Select Book 2** and start with Lesson 1!

4. **For Book 1**: Manually add vocabulary to `public/data/book1.json` using the format shown above.

---

## 📝 Current Status

- ✅ **Book 2**: 7 lessons extracted and ready (from your PDF content)
- ⚠️ **Book 1**: Needs manual entry (PDF is image-based)

---

## Need Help?

- Check `EXTRACTION_GUIDE.md` for detailed extraction instructions
- Check `SERVER_GUIDE.md` for server setup help
- The app works perfectly with Book 2 right now - you can start learning immediately!

