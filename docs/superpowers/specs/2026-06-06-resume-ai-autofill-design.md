# Resume Upload + AI Autofill — Design

Date: 2026-06-06
Status: Approved for planning

## Goal

Let a user upload an existing resume (PDF/DOCX/TXT) and have OpenAI extract its
contents into the app's `ResumeData` shape, then auto-fill the builder form.
Fields populated by the AI are highlighted in purple, and the user is prompted to
review them.

## User flow

1. User clicks "Upload your Resume" in `AppHeader`.
2. A modal opens with a drag-drop area + file picker (`.pdf,.docx,.txt`).
3. User selects a file; modal shows a processing spinner.
4. Browser POSTs the file to `/api/extract`.
5. Server parses the file, calls OpenAI with structured output, returns extracted
   resume JSON.
6. Client merges the result with default styling fields, generates array `id`s,
   replaces the entire resume (`resumeStore.set`), marks every populated field as
   AI-filled, closes the modal.
7. Highlighted (purple) fields appear across the form; a dismissible banner tells
   the user to review them.
8. Editing any highlighted field clears that field's highlight.

## Architecture changes

### Adapter swap (static -> serverless)

- Replace `@sveltejs/adapter-static` with `@sveltejs/adapter-vercel` in
  `svelte.config.js` (dependency already present).
- Keep the existing COOP/COEP headers in `vercel.json` — the Typst WASM compiler
  requires `SharedArrayBuffer`. The `.wasm` content-type header stays too.
- The builder page stays client-rendered (WASM + localStorage unchanged). Only
  the new `/api/extract` route runs server-side as a serverless function. Mark the
  page route to prerender if needed; ensure no SSR regressions for the WASM page.
- Add `OPENAI_API_KEY` env var. Add `web/.env.example` with `OPENAI_API_KEY=`.
- New runtime deps: `openai`, `mammoth`.

## Components

### 1. API endpoint — `web/src/routes/api/extract/+server.ts`

`POST`, accepts `multipart/form-data` with a single `file` field.

- Validate extension/MIME is one of pdf/docx/txt. Reject others -> `invalid_file`.
- Cap size ~5 MB -> `file_too_large`.
- Dispatch by type:
  - **PDF**: read bytes -> base64 -> OpenAI Responses API `input_file` (native PDF
    parsing).
  - **DOCX**: `mammoth.extractRawText` -> text.
  - **TXT**: decode bytes -> text.
- Call OpenAI:
  - Model constant `MODEL = 'gpt-5.5-nano'` (single point of change).
  - Structured output via `json_schema` (response format) matching the **content**
    fields of `ResumeData` only (see schema below).
  - System prompt: instruct extraction into the schema; leave unknown fields empty;
    do not invent data.
- On success: parse the JSON and return it as `{ data: <extracted> }`.
- On failure: return `{ error: { code, message } }` with appropriate HTTP status.

The endpoint owns the secret key; it is never exposed to the browser.

Note: rate-limiting/auth on the endpoint is out of scope (single code comment
left as a marker). The size cap is the only abuse guard for now.

### 2. Structured output schema

Mirrors `ResumeData` minus styling and ids:

- `personalInfo`: name, phone, location, email, website, linkedin, github (strings).
- `profile`: summary (string).
- `education[]`: institution, location, degree, major, startDate, endDate,
  isPresent (bool), bullets (string[]).
- `projects[]`: name, stack, url, award, bullets (string[]).
- `workExperience[]`: title, company, location, startDate, endDate, isPresent,
  bullets.
- `leadership[]`: title, organization, location, startDate, endDate, isPresent,
  bullets.
- `skills[]`: category, skills (string).
- `achievements[]`: title, date, description.

Excluded from the schema and supplied client-side: array `id`s (generated via
`generateId`), `colors`, `fonts`, `sectionOrder` (defaults).

### 3. AI-highlight store — `web/src/lib/ai-highlight.svelte.ts`

Reactive `Set<string>` of dotted field paths.

- `setFromData(data: ResumeData)`: walk the result, add a path for every populated
  leaf scalar. Paths use array indices, e.g. `personalInfo.name`,
  `workExperience.0.title`, `workExperience.0.bullets.1`, `skills.2.skills`.
- `has(path)`, `clear(path)`, `reset()`.
- In-memory only — not persisted to localStorage; highlights clear on reload.

### 4. Per-field purple highlight

- Add a global `.ai-filled` class in `app.css`: purple border + light purple
  background + ring (Tailwind v4 `@apply border-purple-500 bg-purple-50 ring-1
  ring-purple-400`).
- Thread a `path` (string) prop through the content form components:
  PersonalForm, ProfileForm, EducationForm, ProjectsForm, ExperienceForm,
  LeadershipForm, SkillsForm, AchievementsForm, and the reused `BulletEditor` and
  `DateRange`.
- Each input: `class:ai-filled={highlight.has(path)}` plus an input/change handler
  that calls `highlight.clear(path)`.
- For array sections, the parent form computes the item path prefix from the
  loop index (e.g. `workExperience.${i}`) and passes child paths down.
- Styling tabs (Layout/Fonts/Colors) are untouched.

### 5. Upload modal — `web/src/lib/components/UploadModal.svelte`

- Props: `open` (bindable), `onClose`.
- Drag-drop zone + `<input type="file" accept=".pdf,.docx,.txt">`.
- States: `idle` -> `processing` (spinner) -> `error` (error screen) ; success
  closes the modal.
- On success: build full `ResumeData` (AI content + default colors/fonts/
  sectionOrder, generated ids), `resumeStore.set(...)`, `setFromData(...)`, set the
  review-banner flag, close.

### 6. Error screen (modal)

Dedicated error view rendering friendly copy keyed by `error.code`:

| code                  | trigger                                   | message |
|-----------------------|-------------------------------------------|---------|
| `quota_exceeded`      | 429 `insufficient_quota`                  | "AI credit limit reached. Please try again later." |
| `rate_limited`        | 429 rate limit                            | "Too many requests — wait a moment and retry." |
| `auth`                | 401/403                                   | "AI service is misconfigured (API key)." |
| `upstream_unavailable`| timeout / network / 5xx / model disconnect| "Can't reach the AI service. Check your connection and retry." |
| `invalid_file`        | wrong type                                | "Unsupported file. Upload a PDF, DOCX, or TXT." |
| `file_too_large`      | over cap                                  | "File is too large (max 5 MB)." |
| `parse_failed`        | DOCX/JSON parse error                     | "Couldn't read that file. Try another format." |
| `unknown`             | anything else                             | "Something went wrong. Please try again." |

Error screen shows an icon, title, message, and **Retry** / **Close** buttons.
The client maps any thrown/network error (no JSON body) to `upstream_unavailable`.

### 7. Review banner

After a successful apply, a dismissible banner at the top of the form panel:
"AI filled the highlighted (purple) fields — please review them for accuracy."
Dismiss hides it; it does not clear highlights.

### 8. Wiring

- `AppHeader`: replace the dead `<a href="/extract">` with a button that opens the
  modal. Lift modal `open` state to `+page.svelte` (pass `onUploadClick` to the
  header, render `UploadModal` in the page).
- `+page.svelte`: render `UploadModal`, render the review banner near `TabBar`.

## Data flow

```
UploadModal --(multipart POST)--> /api/extract
  /api/extract --(parse + OpenAI structured output)--> { data | error }
UploadModal (success): build ResumeData -> resumeStore.set -> ai-highlight.setFromData -> banner on
+page.svelte subscription -> data updated -> forms render with .ai-filled inputs
user edits field -> ai-highlight.clear(path) -> purple removed
```

## Testing

- Endpoint unit: type/size validation, DOCX text extraction path, OpenAI error
  mapping to each `code` (mock the SDK), happy-path returns parsed data.
- Highlight store unit: `setFromData` produces expected paths for nested arrays;
  `clear`/`reset` behavior.
- Manual: upload each of PDF/DOCX/TXT; verify form fill + purple fields + banner;
  simulate quota/network errors and confirm correct error screens.

## Out of scope (YAGNI)

- Endpoint rate-limiting / auth.
- Per-user API keys.
- DOCX layout fidelity (raw text only).
- Persisting highlight state across reloads.
- "Fill empty only" / confirm-before-apply merge modes (chose replace-everything).
