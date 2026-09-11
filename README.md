# ResumeSmith

ResumeSmith is a privacy-conscious resume builder for forging polished, job-ready resumes with live Typst rendering, PDF export, AI-assisted parsing, O\*NET occupation data, and session-scoped custom templates.

[Try the deployed app](https://rg.barknote.top)

## Features

- Edit resume content in the browser and preview the rendered document as you work.
- Export a polished PDF using the bundled Typst WebAssembly compiler.
- Import TXT, DOCX, or PDF resumes through a review-and-consent gate before AI parsing.
- Extract selectable PDF text locally and use Tesseract OCR only on pages that need it.
- Search O\*NET occupations and use AI-assisted suggestions to tailor resume content.
- Upload a compatible Typst template for the current browser session.
- Convert a DOCX template into a contract-safe Typst design with AI assistance.

## Privacy and upload behavior

Resume files are processed in the browser first. The upload gate shows extraction method, page and word counts, text quality, OCR confidence when applicable, and a text preview. The user must explicitly consent before the extracted text and its metrics are sent to `/api/extract`; the original file is not uploaded to that endpoint.

Current resume-upload limits are:

- 5 MB source file
- 10 PDF pages
- OCR on at most 4 PDF pages
- 120,000 extracted characters

Resume data and the selected O\*NET occupation are stored in browser `localStorage`. Custom templates are stored in `sessionStorage`, take precedence over the built-in template, and are removed when that browser session ends or the user resets the template.

AI-backed routes use stateless Vercel functions and request `store: false` from OpenAI. This project has no database or persistent server-side file storage.

## Local development

Requirements:

- A current Node.js LTS release
- npm
- An OpenAI API key for resume parsing, AI tailoring, and DOCX template conversion
- An O\*NET Web Services key for occupation search and details

From the repository root:

```sh
cd web
npm install
```

Copy `web/.env.example` to `web/.env`, add the keys you intend to use, then start the app:

```sh
npm run dev
```

The browser-only editor and Typst export work without API keys. Features backed by their corresponding serverless routes require the relevant key.

### Environment variables

| Variable         | Used for                                                                   |
| ---------------- | -------------------------------------------------------------------------- |
| `OPENAI_API_KEY` | Resume extraction, O\*NET-based AI tailoring, and DOCX template conversion |
| `ONET_API_KEY`   | O\*NET occupation search and occupation details                            |

Free O\*NET developer keys are available from the [O\*NET Web Services developer portal](https://services.onetcenter.org/developer/).

### Commands

Run these from `web/`:

| Command           | Purpose                                |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Start the development server           |
| `npm run build`   | Create a production build              |
| `npm run preview` | Preview a production build locally     |
| `npm test`        | Run the Vitest suite                   |
| `npm run check`   | Run Svelte and TypeScript diagnostics  |
| `npm run lint`    | Check formatting with Prettier         |
| `npm run format`  | Format the app workspace with Prettier |

## Custom templates

A custom `.typ` file must implement the same `resume`, section-heading, and `skills` helper contract as the built-in template and include this marker:

```typst
// ========== RESUME CONTENT ==========
```

The app replaces content after the marker with the resume generated from the form, then compiles the complete document in the browser before activating it. Typst templates are limited to 1 MB.

Use [the example custom template](docs/examples/modern-teal.typ) or download the built-in template from the upload dialog as a starting point. DOCX templates are limited to 4 MB so multipart uploads remain below Vercel's request limit; their supported layout and style are converted into Typst, while Word-only effects and images may be approximated or omitted.

## Deployment

The application targets Vercel Hobby and uses `web/` as the project root. Configure `OPENAI_API_KEY` and `ONET_API_KEY` in the Vercel project when their features are needed. The app is designed for stateless serverless execution and does not require a database or writable persistent filesystem.

## Project layout

```text
.
├── .github/          Community health files and contribution templates
├── docs/             Design notes and example template artifacts
├── web/              Deployable SvelteKit application
└── template.typ      Built-in Typst resume template source
```

## Community

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report vulnerabilities according to [SECURITY.md](SECURITY.md).

This project is licensed under the [GNU General Public License v3.0](LICENSE).
