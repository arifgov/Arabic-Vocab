# How to Extract Vocabulary from PDFs

## Step 1: Install Dependencies

First, install the required PDF parsing library:

```bash
npm install
```

Or install just the PDF parser:

```bash
npm install pdf-parse
```

## Step 2: Place PDFs in the Correct Location

Make sure your PDF files are in the `public/data/` folder:
- `public/data/Vocab.pdf` (Book 1)
- `public/data/Vocab2.pdf` (Book 2)

## Step 3: Run the Extraction Script

```bash
npm run extract
```

Or directly:

```bash
node scripts/extract_vocab.js
```

## Step 4: Check the Output

The script will generate:
- `public/data/book1.json`
- `public/data/book2.json`

## How It Works

The script:
1. Reads the PDF files
2. Extracts text from all pages
3. Looks for lesson headers (e.g., "Lesson 1 Vocabulary")
4. Parses vocabulary tables (pipe-separated or tab-separated)
5. Generates transliterations automatically
6. Creates JSON files with the vocabulary data

## Troubleshooting

### If extraction returns no data:

1. **Check PDF format**: The script looks for:
   - Lesson headers like "Lesson 1", "Lesson 2", etc.
   - Table format with English | Arabic or English \t Arabic

2. **Manual extraction**: If automatic extraction doesn't work:
   - Open the PDF
   - Copy the text manually
   - Paste it into a text file
   - The script can also work with plain text files (modify the script to read .txt files)

3. **Check the generated JSON**: Open `book1.json` or `book2.json` to see what was extracted. You can manually edit these files if needed.

### If you get "pdf-parse is not installed":

```bash
npm install pdf-parse
```

## Manual Data Entry

If PDF extraction doesn't work well, you can manually edit the JSON files:

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

The `id` format is: `b{book}_l{lesson}_{index}` (e.g., `b1_l1_001`)



