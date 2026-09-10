# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --no-install web
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Custom Typst templates

The template uploader runs entirely in the browser. A custom `.typ` file must define the same `resume`, section-heading,
and `skills` helpers as the built-in template and contain this marker:

```typst
// ========== RESUME CONTENT ==========
```

The app replaces everything after the marker with the resume generated from the form, compiles the result with the
bundled Typst WASM compiler, and stores a valid template in `sessionStorage`. The upload dialog can download the current
built-in template as a compatible starting point.

An upload-ready example is available at [`docs/examples/modern-teal.typ`](../docs/examples/modern-teal.typ).

DOCX templates are unpacked in a Vercel serverless function, and the OpenAI Responses API converts their relevant OOXML
layout/style parts into a structured design. The app then generates a contract-safe Typst template from that design. The
route accepts DOCX files up to 5 MB, uses no persistent application storage, requests `store: false`, and is capped at 60
seconds for Vercel Hobby compatibility. Conversion preserves supported layout and style intent; images and Word-only
effects may be approximated or omitted.

## AI resume upload gate

Resume files are preflighted in the browser before an AI request is allowed. TXT and DOCX files use local text
extraction. PDFs use PDF.js text extraction first, with Tesseract.js OCR only for pages that do not contain enough usable
text. The gate displays a text preview, word/page counts, extraction method, text-quality score, and OCR confidence when
applicable. Unreadable files are blocked; warnings require review, and every passing upload requires explicit consent.

Only the extracted text and metrics are posted to `/api/extract`; the original file stays in the browser. The API repeats
the basic extension, length, and readability checks before calling OpenAI with `store: false`. PDF input is limited to 10
pages, OCR to 4 pages, extracted text to 120,000 characters, and source files to 5 MB.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
