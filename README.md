# Canvas2pdf

A Tampermonkey userscript that batch-exports PDF.js rendered pages into image-based PDF files.

> ⚠️ This script only exports **image-based PDFs** (text is not selectable).  
> It does **not** bypass passwords, encryption, or server-side permission checks.

---

## Features

- Works with PDF.js-based online readers
- Export a custom page range (e.g. 1–30, 31–60, ...)
- Batch export to avoid memory crashes on long documents
- Automatically waits for each page to finish rendering
- Optional JPEG quality setting

---

## Limitations

- Output is **image-based PDF**, not the original vector PDF
- Text is **not selectable or searchable**
- Cannot bypass:
  - PDF open passwords
  - Encrypted / sliced PDF delivery
  - Server-side permission checks
- Large documents (100+ pages) may be slow or memory-heavy

---

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Open the raw `.user.js` file from this repo:
   - Click the file → click **Raw**
   - Tampermonkey will prompt to install
3. Or manually:
   - Tampermonkey Dashboard → **Add new script**
   - Paste the contents of `pdfjs-batch-exporter.user.js`
   - Save

---

## Usage

1. If the PDF requires a password, enter it first.
2. A panel will appear in the bottom-right corner.
3. Set the **start page** and **end page** (e.g. 1–30).
4. Click **Export this batch**.

---

## Configuration

Inside the script:

```javascript
const TOTAL_PAGES   = 1000;   // total pages of your document
const POLL_INTERVAL = 500;   // ms between render checks
const MAX_WAIT      = 30000; // max wait per page (ms)
