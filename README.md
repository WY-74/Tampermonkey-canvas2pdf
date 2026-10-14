# Canvas2pdf

A Tampermonkey userscript that batch-exports PDF.js rendered pages into image-based PDF files.

> ⚠️ **Before installing, edit the `@match` line in the script header to match your own PDF.js reader URL.** The value in this repo is only an example.
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
2. **Before installing, edit the `@match` line in the script header and replace it with the URL of the PDF.js reader you want to use.** The `@match` in this repo is only an example.
3. Open the raw `.user.js` file from this repo:
   - Click the file → click **Raw**
   - Tampermonkey will prompt to install
4. Or manually:
   - Tampermonkey Dashboard → **Add new script**
   - Paste the contents of `pdfjs-batch-exporter.user.js`
   - Save

---

## Usage

1. If the PDF requires a password, enter it first.
2. A panel will appear in the bottom-right corner.
3. Set the **起始页** and **结束页** (e.g. 1–30).
4. Click **开始导出本批**.

---

## Configuration

Inside the script:

```javascript
const TOTAL_PAGES   = 1000;   // total pages of your document
const POLL_INTERVAL = 500;   // ms between render checks
const MAX_WAIT      = 30000; // max wait per page (ms)
