// 工具页的 SEO 内容（英文源）：<title>、正文小节、追加的 FAQ。其它语言在同目录的 <locale>.ts，结构必须一致。
// 写作原则：只写工具真实的行为（不要写「离线可用」「保留表单」这类没验证过的话）；
// 每段都要对用户有用，不堆关键词。引用的按钮 / 选项名要和 locales/<locale>.ts 里的译法一致。

export interface ToolContent {
  /** <title>，控制在 60 字符以内，主关键词放最前 */
  seoTitle: string;
  /** 正文小节，显示在步骤和 FAQ 之间 */
  sections: { h: string; p: string[] }[];
  /** 追加到 locales/<locale>.ts 里该工具 faq 的后面 */
  faq?: { q: string; a: string }[];
}

const content: Record<string, ToolContent> = {
  'merge-pdf': {
    seoTitle: 'Merge PDF Files Online — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Combine PDFs without sending them anywhere', p: [
        'Most online PDF mergers work by uploading your documents to a server, joining them there, and sending the result back. ShyPDF does the joining inside your browser tab instead. The PDFs you pick are read from your disk into memory, combined on your own device, and saved straight back to your downloads folder.',
        'That makes it a good fit for the documents people most often need to merge: signed contracts, bank statements, tax forms, medical records and scanned IDs — files you would rather not hand to a third party just to staple them together.' ] },
      { h: 'Getting the order right', p: [
        'Files are merged in the order of the cards on screen. Drag a card to move it, use the ‹ › buttons on a phone, or click “Sort by name” if your files are numbered (file2 sorts before file10). Need only some pages from one of the files? Run it through Split PDF first, then merge the pieces.',
        'Each source file gets a top-level bookmark in the merged document, so a reader can jump between the original files from the PDF viewer’s sidebar. Untick “Add a bookmark for each file” if you want a clean outline.' ] },
    ],
    faq: [
      { q: 'Will merging reduce the quality of my PDFs?', a: 'No. Pages are copied into the new file as they are — text stays text and images are not re-compressed. If the result is too large to email, run it through Compress PDF afterwards.' },
    ],
  },
  'split-pdf': {
    seoTitle: 'Split PDF Online — Extract Pages, No Upload | ShyPDF',
    sections: [
      { h: 'Extract exactly the pages you need', p: [
        'Type page ranges the way you would in a print dialog: 1-3, 5, 8-10. Each comma-separated part becomes its own PDF, so that example produces three files — pages 1–3, page 5, and pages 8–10. To pull a single chapter out of a long report, enter just one range.',
        'Other modes cover the common cases without any typing: “One file per page” bursts the document into single pages, and the odd/even options are handy for fixing scans from a single-sided scanner.' ] },
      { h: 'What you get back', p: [
        'When a split produces several files, they are bundled into one zip download so your browser does not ask about each file separately; with six files or fewer you can also grab them individually. Pages are copied without re-compression, so quality is identical to the original.',
        'Splitting happens entirely in your browser. The document is never uploaded, which matters when the reason you are splitting it is to share one harmless page out of a sensitive file.' ] },
    ],
  },
  'organize-pdf': {
    seoTitle: 'Reorder, Rotate & Delete PDF Pages — No Upload | ShyPDF',
    sections: [
      { h: 'Rearrange a PDF by looking at it', p: [
        'Organize PDF lays out every page as a thumbnail. Drag pages into a new order, click × to drop the ones you do not need — blank scanner pages, a cover sheet, an appendix — and use ↻ to turn a single page. On a phone, the ‹ › buttons move a page one step at a time.',
        'When the order looks right, “Save PDF” writes a new file containing just those pages, in that order. Your original file is not modified.' ] },
      { h: 'Private by design', p: [
        'The thumbnails are rendered on your own device, and so is the new PDF. Nothing is uploaded, which means you can safely tidy up documents that contain personal or confidential information. Large documents work too; thumbnails are drawn as needed, so a file with hundreds of pages just takes a few seconds longer to appear.' ] },
    ],
  },
  'add-page-numbers': {
    seoTitle: 'Add Page Numbers to PDF — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Numbering that matches how documents are actually laid out', p: [
        'Reports and theses rarely start numbering on the first sheet. Set “Start on page” to skip a cover or table of contents, and “First number” to choose what the first numbered page says — for example, start on page 3 with the number 1. Pick any corner or the center of the top or bottom edge, and adjust the margin so the number clears existing footers.',
        'Formats include plain numbers, “1 / 10”, “- 1 -”, “Page 1” and “Page 1 of 10” — always written in the language you are browsing in. Font size is adjustable from 6 to 48 pt.' ] },
      { h: 'Works on any PDF, stays on your device', p: [
        'Numbers are drawn on top of each page, so this works on scanned documents as well as PDFs exported from Word or Google Docs. The file is processed in your browser and never uploaded. Combining several documents into one? Merge them first, then number the result so the sequence runs through the whole file.' ] },
    ],
  },
  'add-watermark': {
    seoTitle: 'Add Watermark to PDF — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Mark drafts, copies and confidential documents', p: [
        'Type any text — CONFIDENTIAL, DRAFT, a client’s name, “Copy for visa application only” — and ShyPDF stamps it on every page. Choose a single centered mark or tile it across the whole page, and tune the size, angle, color and opacity until it is visible without hiding the content underneath.',
        'A tiled, semi-transparent watermark naming the recipient is a practical way to discourage an ID scan or a contract from being reused somewhere you did not intend.' ] },
      { h: 'Any language, no upload', p: [
        'The text is drawn using the fonts on your device, so scripts such as Chinese, Japanese, Arabic or Cyrillic work as well as Latin text. Because the whole job runs in your browser, the document you are trying to protect is not uploaded to anyone in the process.' ] },
    ],
  },
  'jpg-to-pdf': {
    seoTitle: 'JPG to PDF Converter — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Turn photos and scans into one tidy PDF', p: [
        'Select JPG, PNG or WebP images — phone photos of receipts, scanned pages, screenshots — and ShyPDF places one image on each page of a single PDF. Drag the cards to set the page order before converting.',
        'Choose “Same as image” to keep every picture at its natural size, or A4 / Letter to get uniform pages with the image scaled to fit, which is usually what an application portal or a printer expects. Orientation can follow each image or be forced to portrait or landscape.' ] },
      { h: 'Your photos stay on your device', p: [
        'Photos of documents often contain exactly the things you should not upload: signatures, addresses, ID numbers. Here the conversion runs in your browser and the images never leave your device. Tick “Compress images” if the resulting PDF needs to be small enough to email.' ] },
    ],
    faq: [
      { q: 'Can I convert HEIC photos from an iPhone?', a: 'Not directly. Convert them to JPG first — on an iPhone, emailing a photo to yourself usually does that automatically, or set Settings → Camera → Formats to “Most Compatible” so new photos are saved as JPG.' },
    ],
  },
  'pdf-to-jpg': {
    seoTitle: 'PDF to JPG Converter — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Save PDF pages as images', p: [
        'Each page of your PDF is rendered to a JPG or PNG image. Use JPG for photos and scans where file size matters, and PNG for pages with sharp text, diagrams or screenshots where you want crisp edges. Leave the page field empty to convert everything, or enter ranges such as 1-3, 5 to export only certain pages.',
        'Pick a resolution to suit the destination: 96 dpi for the web and chat apps, 150 dpi for general on-screen use, 300 dpi for print. Higher resolutions produce larger files and take longer to render.' ] },
      { h: 'Rendered locally', p: [
        'Pages are drawn by your own browser, using the same open-source engine (PDF.js) that powers the PDF viewer in Firefox. The PDF is never uploaded. When you convert more than one page, the images are bundled into a single zip download.' ] },
    ],
  },
  'pdf-to-word': {
    seoTitle: 'PDF to Word Converter — Free, No Upload | ShyPDF',
    sections: [
      { h: 'An editable document, not a picture of one', p: [
        'ShyPDF reads the text in your PDF together with its position, font and size, and rebuilds real Word content from it: flowing paragraphs you can retype, headings that appear in Word’s navigation pane, bold and italic, alignment, indents, simple tables and pictures. The page size and margins are carried over, and each PDF page starts on a new page in Word.',
        'A PDF does not store paragraphs or tables — only where each character is drawn — so the conversion is an informed reconstruction. It works best on documents that came from a word processor in the first place: letters, contracts, reports, essays and CVs. Multi-column layouts are read column by column. Heavily designed pages, forms and text laid over images come out simplified.' ] },
      { h: 'The file you are converting is often the sensitive one', p: [
        'People convert PDFs to Word to edit contracts, fill in details on official letters, or update a CV. With most online converters that means uploading the document to a company you know nothing about. Here the conversion runs inside your browser tab, and the PDF never leaves your device.',
        'If the result says your PDF has no selectable text, it is a scan. Use OCR PDF to recognize the text first, then convert the searchable PDF.' ] },
    ],
    faq: [
      { q: 'Which apps can open the result?', a: 'It is a standard .docx file, so Microsoft Word, Google Docs, LibreOffice Writer, Apple Pages and WPS Office all open it.' },
    ],
  },
  'word-to-pdf': {
    seoTitle: 'Word to PDF Converter — Free, No Upload | ShyPDF',
    sections: [
      { h: 'A real PDF, produced on your own device', p: [
        'ShyPDF reads the .docx file, lays out every page itself, and writes a PDF with selectable, searchable text and embedded fonts — not a screenshot of the document. Styles, headings, bulleted and numbered lists, tables with borders and shading, pictures, hyperlinks, headers, footers and page numbers are all carried over, using the page size and margins set in the document.',
        'Nothing is sent to a server. That matters for the documents people usually turn into PDFs before sending: offers, invoices, contracts, CVs and cover letters.' ] },
      { h: 'Why the page breaks match Word', p: [
        'Word documents usually name fonts that only ship with Microsoft Office. ShyPDF substitutes open-source fonts designed to have exactly the same character widths — Carlito for Calibri, Arimo for Arial, Tinos for Times New Roman, Cousine for Courier New — so text wraps at the same words and pages break in nearly the same places. Letter shapes differ slightly; the layout does not. Chinese, Japanese and Korean text uses Noto Sans.',
        'Some things are not supported yet: multi-column sections, text wrapped around floating pictures, charts, SmartArt and right-to-left scripts. Text inside text boxes is kept, but placed in the normal flow of the page. For a document that depends on those, exporting to PDF from Word itself will be more faithful.' ] },
    ],
    faq: [
      { q: 'Are tracked changes and comments included?', a: 'The PDF shows the document with all tracked changes accepted: inserted text is included, deleted text is not. Comments are left out.' },
    ],
  },
  'compress-pdf': {
    seoTitle: 'Compress PDF Online — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Two modes, because PDFs are big for different reasons', p: [
        'Light mode rebuilds the file’s internal structure and removes redundant data. Text stays selectable and searchable, and nothing visible changes; typical savings are 5–30%. It is the right first try for documents exported from Word, Google Docs or design tools.',
        'Strong mode renders every page as a JPEG image and builds a new PDF from those images. That is very effective on scanned documents and photo-heavy files — often more than 50% smaller — but text is no longer selectable, so keep your original. Choose 72, 110 or 150 dpi depending on whether the result only needs to be readable on screen or also printed.' ] },
      { h: 'Honest about the result', p: [
        'ShyPDF shows the size before and after. If compression would not make the file smaller — which happens with PDFs that are already optimized — it gives you back the original rather than a larger “compressed” copy.',
        'Everything runs in your browser and the file is never uploaded, so you can shrink a bank statement or a contract to fit an email attachment limit without sharing it with a compression service.' ] },
    ],
    faq: [
      { q: 'How small does a PDF need to be for email?', a: 'Gmail accepts attachments up to 25 MB and Outlook.com up to 20 MB, but many company mail servers set lower limits, commonly 10 MB. If Strong mode at 110 dpi is still too big, try 72 dpi, or split the document and send it in parts.' },
    ],
  },
  'ocr-pdf': {
    seoTitle: 'OCR PDF — Make Scanned PDFs Searchable, No Upload | ShyPDF',
    sections: [
      { h: 'Turn a scan into a PDF you can search', p: [
        'A scanned PDF is a stack of pictures: you cannot search it, select a sentence, or copy a number out of it. OCR (optical character recognition) reads the text in those pictures. ShyPDF places the recognized words as an invisible layer exactly on top of the scanned ones, so Ctrl+F, text selection and copy-and-paste work while the page looks exactly as it did.',
        'The original pages are not re-compressed or redrawn, so there is no loss of quality and the file only grows by the size of the text. If you just want the words, choose “Plain text (.txt)” instead. Pages that already contain selectable text are skipped by default, which makes mixed documents faster.' ] },
      { h: 'Getting good results', p: [
        'Pick the language the document is written in — it is the single biggest factor in accuracy. English, Spanish, Portuguese, French, German, Italian, Japanese, Simplified Chinese and Traditional Chinese are available, and “Also recognize English” helps with documents that mix English terms into another language.',
        'Recognition runs in your browser using Tesseract, a long-established open-source OCR engine, compiled to WebAssembly. Expect a few seconds per page, depending on your device. Scans of bank statements, IDs, medical records and signed contracts are exactly the kind of file that should not be uploaded to an OCR service; here they never leave your device.' ] },
    ],
    faq: [
      { q: 'Can I run OCR on a photo or a JPG?', a: 'Yes, in two steps: turn the images into a PDF with JPG to PDF, then run that PDF through OCR PDF.' },
    ],
  },
  'unlock-pdf': {
    seoTitle: 'Unlock PDF — Remove a Password You Know | ShyPDF',
    sections: [
      { h: 'For your own documents, when the password gets in the way', p: [
        'Banks, payroll providers and government portals often send statements as password-protected PDFs. That is sensible in transit, and a nuisance afterwards: you have to type the password every time, and you cannot merge the file with others. Enter the password once and ShyPDF saves a copy that opens normally.',
        'Some PDFs open without a password but block printing, copying or editing. If you own such a document, or its owner has asked you to work on it, ShyPDF can save a copy without those restrictions. You will be asked to confirm that you have the right to do so.' ] },
      { h: 'What this tool does not do', p: [
        'ShyPDF does not crack, guess or recover passwords. If a file needs a password to open and you do not have it, this tool cannot help. It is meant for removing protection from documents you are entitled to modify, not for getting around protection on someone else’s work.',
        'The password you type and the document itself stay on your device: decryption is done in your browser by qpdf, a long-established open-source PDF library compiled to WebAssembly. Nothing is uploaded.' ] },
    ],
  },
  'protect-pdf': {
    seoTitle: 'Password Protect PDF — AES-256, No Upload | ShyPDF',
    sections: [
      { h: 'Encrypt a PDF before you send it', p: [
        'Set an open password and the document is encrypted with AES-256; nobody can read it without the password, whichever PDF reader they use. Share the password through a different channel than the file — send the PDF by email and the password by text message, for instance.',
        'You can also restrict printing, copying or editing. Be aware of what that means: permission restrictions are enforced by PDF readers rather than by encryption of the content, so treat them as a clear statement of intent, not as strong protection. For anything sensitive, use an open password.' ] },
      { h: 'The password never leaves your browser', p: [
        'With an upload-based service, both your confidential document and the password that protects it travel to somebody else’s server. Here, encryption is performed on your device by qpdf, an open-source PDF library compiled to WebAssembly, and neither the file nor the password is sent anywhere.',
        'There is no way to recover a forgotten password — not for you, and not for us, since we never see it. Store it in a password manager.' ] },
    ],
    faq: [
      { q: 'What makes a good PDF password?', a: 'Length matters most. Four or five random words, or 14+ random characters from a password manager, is far stronger than a short password with symbols. Avoid birthdays and ID numbers, which are the first things an attacker tries.' },
    ],
  },
  'sign-pdf': {
    seoTitle: 'Sign PDF Online — Free, No Upload, No Account | ShyPDF',
    sections: [
      { h: 'Sign without printing, scanning or signing up', p: [
        'Open the PDF, create your signature, and drag it onto the signature line. You can draw it with a mouse, finger or stylus, type your name in a handwriting style, or upload a photo of your signature on white paper — ShyPDF removes the paper background so only the ink remains. Use the page arrows to reach the right page, drag the handle to resize, and tick “Put it on every page” when a document needs initials throughout.',
        'The signature is drawn into the page itself, so it shows up in every PDF reader and when printed. Your original file is not changed; you download a signed copy.' ] },
      { h: 'Your signature is not something to upload', p: [
        'A signature plus a signed contract is about as sensitive as documents get. Most e-signing sites store both on their servers, and many require an account. ShyPDF does the whole job in your browser: the PDF and the signature stay on your device, nothing is stored between visits, and there is no account.',
        'This is a simple electronic signature — the equivalent of signing a printout — and not a certificate-based digital signature. It is widely accepted for everyday paperwork, but some documents legally require more; ask the recipient if you are unsure. To stop the signed file from being edited afterwards, run it through Protect PDF and restrict editing.' ] },
    ],
  },
  'crop-pdf': {
    seoTitle: 'Crop PDF Online — Trim Margins, No Upload | ShyPDF',
    sections: [
      { h: 'Trim a PDF down to what matters', p: [
        'Drag one box over the area you want to keep and everything outside it is trimmed away — on every page, or just the current one. Wide scanner margins, binder-hole edges, the empty half of a slide handout: gone in a couple of seconds, with a live preview so you can see exactly where the cut lands.',
        'Cropping adjusts each page’s crop box, the setting every PDF reader uses to decide what to display and print. The page content itself is not re-rendered or re-compressed, so text stays selectable and images stay sharp.' ] },
      { h: 'What cropping is — and is not', p: [
        'Because only the visible area changes, the full page is still stored inside the file, and tools that reset the crop box can bring the trimmed parts back. That makes cropping the right tool for tidying layouts, and the wrong tool for hiding confidential information — for that, cover the content with a black box in Edit PDF so it is actually painted over.',
        'Like every ShyPDF tool, cropping runs in your browser; the file is never uploaded.' ] },
    ],
  },
  'delete-pages': {
    seoTitle: 'Delete Pages from PDF Online — No Upload | ShyPDF',
    sections: [
      { h: 'Remove pages by looking at them, or by number', p: [
        'Every page shows up as a thumbnail. Click × on the blank scanner pages, the cover sheet you don’t need, the duplicate scans — then save what is left as a new PDF. When you already know the numbers, type them instead: 2, 5-7 deletes page 2 and pages 5 through 7 in one go.',
        'The remaining pages are copied over exactly as they are, without re-compression, so the new file loses nothing in quality. Your original PDF is not touched; you download a shorter copy.' ] },
      { h: 'The usual reason: sending only what you must', p: [
        'People rarely delete pages for fun — the file being trimmed is usually a bank statement, a contract or a scan bundle heading to someone else’s inbox. Doing the trimming in your browser means the full document, including the pages you are removing, never travels to a server.' ] },
    ],
  },
  'extract-pages': {
    seoTitle: 'Extract Pages from PDF into a New File — No Upload | ShyPDF',
    sections: [
      { h: 'A new PDF made of just the pages you pick', p: [
        'Type ranges the way a print dialog accepts them — 1-3, 5, 8-10 — and the selected pages are copied, in document order, into one new PDF. It is the quickest way to pull one chapter out of a report, one exhibit out of a filing, or the two pages a client actually needs out of a forty-page scan.',
        'Pages are copied without re-compression, so the extract is pixel-identical to the original. The source file stays as it is.' ] },
      { h: 'Extract or Split?', p: [
        'They answer different questions. Extract PDF pages makes one file from everything you select — right when the result should travel as a single attachment. Split PDF makes a separate file per range — right when you are breaking a document apart. If you extract pages and then want them in a different order, run the result through Organize PDF.' ] },
    ],
  },
  'edit-pdf': {
    seoTitle: 'Edit PDF Online — Add Text & Highlights, No Upload | ShyPDF',
    sections: [
      { h: 'The edits people actually need, without an editor suite', p: [
        'Most “edit a PDF” moments are small: add a line of text where a form expects handwriting, highlight the clause that matters, white-out an old phone number and type the new one over it. ShyPDF puts those four moves — text, highlight, white-out, black box — one click away. Place an element on the page, drag it into position, resize it by its corner handle.',
        'Text is drawn using the fonts on your device, so Chinese, Japanese, Arabic or any other script your system can display works. Each PDF page keeps its quality; your edits are drawn on top and become a permanent part of the saved copy.' ] },
      { h: 'Editing a PDF should not mean uploading it', p: [
        'The PDFs people edit are contracts, applications, statements and IDs — documents at the top of the do-not-upload list. Here the whole edit happens in your browser tab; the file never leaves your device, and the original on disk stays untouched.',
        'A PDF stores drawn characters rather than editable paragraphs, so no browser tool can retype existing text in place. To rewrite a document, convert it with PDF to Word, edit properly, and convert back with Word to PDF.' ] },
    ],
  },
  'fill-pdf': {
    seoTitle: 'Fill PDF Form Online — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Type into real form fields', p: [
        'If your PDF has proper form fields — the kind where a cursor appears when you click — ShyPDF lists every text box, checkbox, radio button and dropdown, in document order, ready to fill from your keyboard. A page preview sits alongside so you can check the result as you go.',
        'When you save, the answers are written into the form itself. Tick “Flatten the form” and they are converted to fixed page content: nothing can be edited or accidentally cleared afterwards, and the form displays identically everywhere — the safest choice when the next stop is someone’s inbox.' ] },
      { h: 'Forms are exactly the files that should stay local', p: [
        'A filled form is dense with personal data: names, addresses, ID numbers, salary figures. Filling it in your browser means neither the blank form nor your answers ever reach a server.',
        'If nothing happens when you click the fields in other apps, the PDF is probably a scanned or “printed” form with no real fields in it. ShyPDF will tell you so — use Edit PDF to type over such a form, and Sign PDF to add the signature.' ] },
    ],
  },
  'png-to-pdf': {
    seoTitle: 'PNG to PDF Converter — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Screenshots and graphics into one clean PDF', p: [
        'PNG is the format of screenshots, diagrams, charts and exported slides — images with sharp edges and exact colors. ShyPDF places each image on its own PDF page, in the order you set by dragging the cards. Keep every page at its image’s natural size, or pick A4 / Letter for uniform pages that print predictably.',
        'PNGs are embedded without recompression, so a screenshot in the PDF is pixel-for-pixel the screenshot you took. Transparent areas sit on the white page background. JPG and WebP images can be mixed in freely.' ] },
      { h: 'Converted on your device', p: [
        'Screenshots have a habit of containing more than intended — names, account numbers, half an email thread. The conversion runs entirely in your browser, so the images never leave your device. If the result needs to be small enough to email, tick “Compress images”.' ] },
    ],
  },
  'pdf-to-png': {
    seoTitle: 'PDF to PNG Converter — Free, No Upload | ShyPDF',
    sections: [
      { h: 'Lossless images of every page', p: [
        'Each page of the PDF is rendered to a PNG — the right format when the page holds text, tables, diagrams or UI: edges stay crisp, colors stay exact, and there are none of the compression artifacts JPG leaves around letters. Convert the whole file or just the pages you list, at 96, 150 or 300 dpi depending on where the image is headed.',
        'Multiple pages arrive bundled in one zip. Need smaller files for photo-heavy pages? The JPG option is one click away in the same tool.' ] },
      { h: 'Rendered by your own browser', p: [
        'Pages are drawn locally by PDF.js — the engine inside Firefox — and the PDF is never uploaded. A slide you turn into a PNG for a presentation, or a statement page you need as an image for an application portal, stays on your device the whole way.' ] },
    ],
  },
  'pdf-to-text': {
    seoTitle: 'PDF to Text — Extract Plain Text Online, No Upload | ShyPDF',
    sections: [
      { h: 'All the words, none of the formatting', p: [
        'ShyPDF reads the text layer of the PDF and writes it to a plain .txt file: line breaks kept, pages optionally marked, everything else stripped. That is exactly what you want for feeding a document to a script, a translation tool or an AI model, for word counts, or for pasting somewhere that fights PDF formatting.',
        'Limit the extraction to certain pages with ranges like 1-3, 5. The page-break markers make it easy to trace any line back to where it came from.' ] },
      { h: 'When the output comes back empty', p: [
        'A scanned PDF has no text layer — it is photographs of text — so there is nothing to extract. Run the scan through OCR PDF instead; it recognizes the words in the page images and can output plain text directly. And when you need structure rather than raw text — paragraphs, headings, tables — PDF to Word rebuilds an editable document.',
        'Extraction happens in your browser. For contracts, medical records and anything else you would not paste into a random website, the file never leaves your device.' ] },
    ],
  },
  'repair-pdf': {
    seoTitle: 'Repair PDF Online — Fix Corrupt Files, No Upload | ShyPDF',
    sections: [
      { h: 'Why broken PDFs can often be saved', p: [
        'A PDF that “won’t open” is usually structurally damaged, not empty: the download was cut short, an email gateway mangled it, or the program that made it wrote a sloppy index. The page data is still in the file — the reader just can’t find its way to it. ShyPDF hands the file to qpdf, a PDF library trusted for decades, which reads whatever is recoverable and writes a fresh, well-formed file around it: new cross-reference tables, clean object structure, same content.',
        'If the repaired copy downloads, open it and check the pages. If qpdf reports the file beyond repair, the missing bytes are truly gone — get a fresh copy from the source: re-download it, re-export it, or ask the sender to send it again.' ] },
      { h: 'Repair without handing the file over', p: [
        'Damaged files tend to be the important ones — the invoice from the archive, the signed contract from an old backup. The rebuild runs in your browser via WebAssembly; the broken file and the repaired one both stay on your device.',
        'A PDF that asks for a password is not damaged, it is encrypted. Unlock it first with Unlock PDF (you need the password), then repair if it still misbehaves.' ] },
    ],
  },
};

export default content;
