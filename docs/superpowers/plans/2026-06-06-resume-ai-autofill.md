# Resume Upload + AI Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload a PDF/DOCX/TXT resume, have OpenAI extract it into the app's `ResumeData` shape via a serverless endpoint, replace the form contents, highlight every AI-filled field in purple, and prompt the user to review.

**Architecture:** Swap `adapter-static` for `adapter-vercel` so a single `POST /api/extract` serverless function can hold the OpenAI key and call the Responses API with structured (`json_schema`) output. The builder page stays a client-rendered SPA. A reactive `SvelteSet` of dotted field paths drives per-field purple styling; editing a field clears its highlight. An upload modal handles file selection, processing, success, and a per-code error screen.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, TailwindCSS v4, `@sveltejs/adapter-vercel`, `openai` SDK, `mammoth` (DOCX), Vitest (unit tests for pure logic).

---

## File Structure

**Create:**
- `web/src/lib/server/extraction.ts` — `MODEL`, `RESUME_SCHEMA`, `EXTRACTION_PROMPT`, `mapOpenAIError()`.
- `web/src/lib/server/extraction.test.ts` — unit tests for `mapOpenAIError`.
- `web/src/routes/api/extract/+server.ts` — POST endpoint: parse file, call OpenAI, return data/error.
- `web/src/lib/ai-highlight.ts` — reactive highlight set + `setHighlightsFromData`, `clearHighlight`, `resetHighlights`.
- `web/src/lib/ai-highlight.test.ts` — unit tests for `setHighlightsFromData`.
- `web/src/lib/extract-client.test.ts` — unit tests for `buildResumeFromExtraction`.
- `web/src/lib/components/UploadModal.svelte` — upload/processing/error UI.
- `web/.env.example` — `OPENAI_API_KEY=`.

**Modify:**
- `web/svelte.config.js` — adapter swap.
- `web/vite.config.ts` — add Vitest `test` config.
- `web/package.json` — add deps + `test` script.
- `web/src/lib/types.ts` — add `ExtractedResume` type.
- `web/src/lib/resume-utils.ts` — add `buildResumeFromExtraction()`.
- `web/src/app.css` — add `.ai-filled` class.
- `web/src/lib/components/forms/PersonalForm.svelte`, `ProfileForm.svelte`, `EducationForm.svelte`, `ProjectsForm.svelte`, `ExperienceForm.svelte`, `LeadershipForm.svelte`, `SkillsForm.svelte`, `AchievementsForm.svelte` — per-field highlight wiring.
- `web/src/lib/components/DateRange.svelte`, `BulletEditor.svelte` — accept `path` prop, highlight wiring.
- `web/src/lib/components/AppHeader.svelte` — replace dead `/extract` link with a button.
- `web/src/routes/+page.svelte` — modal state, render `UploadModal`, review banner.
- `web/src/routes/api/extract/+server.ts` — `export const prerender = false;` (in the create step).

All commands below assume the working directory is `web/` (where `package.json` lives). On Windows PowerShell, run them from `web`.

---

## Task 1: Project infra (deps, adapter, Vitest)

**Files:**
- Modify: `web/package.json`
- Modify: `web/svelte.config.js`
- Modify: `web/vite.config.ts`
- Create: `web/.env.example`

- [ ] **Step 1: Install runtime + test deps**

Run (from `web/`):

```bash
npm install openai mammoth
npm install -D vitest
```

Expected: `openai` and `mammoth` appear under `dependencies`, `vitest` under `devDependencies` in `web/package.json`.

- [ ] **Step 2: Add the `test` script**

In `web/package.json`, add to the `"scripts"` object:

```json
"test": "vitest run"
```

- [ ] **Step 3: Swap the adapter**

Replace the entire contents of `web/svelte.config.js` with:

```js
import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		warningFilter: (warning) => {
			if (warning.code === 'a11y_label_has_associated_control') return false;
			if (warning.code === 'a11y_invalid_attribute') return false;
			return true;
		},
	},
	kit: {
		adapter: adapter(),
	},
};

export default config;
```

(`@sveltejs/adapter-vercel` is already in `devDependencies`.)

- [ ] **Step 4: Add Vitest config to vite.config.ts**

Replace the entire contents of `web/vite.config.ts` with:

```ts
/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
	plugins: [wasm(), topLevelAwait(), sveltekit()],
	optimizeDeps: {
		exclude: ['@myriaddreamin/typst.ts'],
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
```

- [ ] **Step 5: Create the env example**

Create `web/.env.example`:

```
# OpenAI API key used by the /api/extract serverless endpoint
OPENAI_API_KEY=
```

(The real key goes in `web/.env` locally — already gitignored — and in the Vercel project env vars.)

- [ ] **Step 6: Verify the build still works**

Run: `npm run check`
Expected: completes with no errors (warnings ok). The page still works as before; nothing functional changed yet.

- [ ] **Step 7: Commit**

```bash
git add web/package.json web/package-lock.json web/svelte.config.js web/vite.config.ts web/.env.example
git commit -m "chore: add openai/mammoth/vitest deps and switch to vercel adapter"
```

---

## Task 2: Extraction types, schema, prompt, error mapping

**Files:**
- Modify: `web/src/lib/types.ts`
- Create: `web/src/lib/server/extraction.ts`
- Test: `web/src/lib/server/extraction.test.ts`

- [ ] **Step 1: Add the `ExtractedResume` type**

Append to `web/src/lib/types.ts` (the content fields the AI returns — no ids, no styling):

```ts
// Shape returned by the AI extraction endpoint (content only; ids + styling added client-side).
export interface ExtractedResume {
	personalInfo: PersonalInfo;
	profile: Profile;
	education: Omit<Education, 'id'>[];
	projects: Omit<Project, 'id'>[];
	workExperience: Omit<WorkExperience, 'id'>[];
	leadership: Omit<Leadership, 'id'>[];
	skills: Omit<SkillCategory, 'id'>[];
	achievements: Omit<Achievement, 'id'>[];
}
```

- [ ] **Step 2: Write the failing test for error mapping**

Create `web/src/lib/server/extraction.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapOpenAIError } from './extraction';

describe('mapOpenAIError', () => {
	it('maps insufficient_quota 429 to quota_exceeded', () => {
		const r = mapOpenAIError({ status: 429, code: 'insufficient_quota' });
		expect(r.code).toBe('quota_exceeded');
		expect(r.status).toBe(429);
	});

	it('maps generic 429 to rate_limited', () => {
		expect(mapOpenAIError({ status: 429 }).code).toBe('rate_limited');
	});

	it('maps 401 to auth', () => {
		expect(mapOpenAIError({ status: 401 }).code).toBe('auth');
	});

	it('maps 403 to auth', () => {
		expect(mapOpenAIError({ status: 403 }).code).toBe('auth');
	});

	it('maps 500 to upstream_unavailable', () => {
		expect(mapOpenAIError({ status: 503 }).code).toBe('upstream_unavailable');
	});

	it('maps a connection error (no status) to upstream_unavailable', () => {
		expect(mapOpenAIError(new Error('socket hang up')).code).toBe('upstream_unavailable');
	});

	it('falls back to unknown', () => {
		expect(mapOpenAIError({ status: 418 }).code).toBe('unknown');
	});

	it('always includes a non-empty human message', () => {
		expect(mapOpenAIError({ status: 429 }).message.length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/server/extraction.test.ts`
Expected: FAIL — `mapOpenAIError` is not exported / module not found.

- [ ] **Step 4: Implement extraction.ts**

Create `web/src/lib/server/extraction.ts`:

```ts
export const MODEL = 'gpt-5.5-nano';

export type ExtractErrorCode =
	| 'invalid_file'
	| 'file_too_large'
	| 'quota_exceeded'
	| 'rate_limited'
	| 'auth'
	| 'upstream_unavailable'
	| 'parse_failed'
	| 'unknown';

export interface ExtractError {
	code: ExtractErrorCode;
	message: string;
	status: number;
}

const MESSAGES: Record<ExtractErrorCode, string> = {
	invalid_file: 'Unsupported file. Upload a PDF, DOCX, or TXT.',
	file_too_large: 'File is too large (max 5 MB).',
	quota_exceeded: 'AI credit limit reached. Please try again later.',
	rate_limited: 'Too many requests — wait a moment and retry.',
	auth: 'AI service is misconfigured (API key).',
	upstream_unavailable: "Can't reach the AI service. Check your connection and retry.",
	parse_failed: "Couldn't read that file. Try another format.",
	unknown: 'Something went wrong. Please try again.',
};

export function extractError(code: ExtractErrorCode, status?: number): ExtractError {
	const defaultStatus: Record<ExtractErrorCode, number> = {
		invalid_file: 400,
		file_too_large: 413,
		quota_exceeded: 429,
		rate_limited: 429,
		auth: 502,
		upstream_unavailable: 502,
		parse_failed: 422,
		unknown: 500,
	};
	return { code, message: MESSAGES[code], status: status ?? defaultStatus[code] };
}

// Map an error thrown by the OpenAI SDK (or a network failure) to our ExtractError.
export function mapOpenAIError(err: unknown): ExtractError {
	const e = err as { status?: number; code?: string };
	const status = typeof e?.status === 'number' ? e.status : undefined;

	if (status === 429) {
		return e?.code === 'insufficient_quota'
			? extractError('quota_exceeded', 429)
			: extractError('rate_limited', 429);
	}
	if (status === 401 || status === 403) return extractError('auth', 502);
	if (status !== undefined && status >= 500) return extractError('upstream_unavailable', 502);
	if (status === undefined) return extractError('upstream_unavailable', 502); // network/timeout
	return extractError('unknown', 500);
}

export const EXTRACTION_PROMPT = [
	'You extract structured data from a resume.',
	'Fill every field of the provided JSON schema using only information present in the resume.',
	'Use an empty string for any missing text field and an empty array for any missing list.',
	'Format dates as "YYYY-MM" when a month and year are available; otherwise use "YYYY" or an empty string.',
	'Set isPresent to true only when the resume says a role/study is ongoing (e.g. "Present", "Current").',
	'For linkedin and github, return just the username/handle, not the full URL.',
	'Do not invent or infer data that is not in the resume.',
].join(' ');

const stringArray = { type: 'array', items: { type: 'string' } } as const;

// Strict json_schema for the OpenAI Responses API. All properties required; no extras.
export const RESUME_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: [
		'personalInfo',
		'profile',
		'education',
		'projects',
		'workExperience',
		'leadership',
		'skills',
		'achievements',
	],
	properties: {
		personalInfo: {
			type: 'object',
			additionalProperties: false,
			required: ['name', 'phone', 'location', 'email', 'website', 'linkedin', 'github'],
			properties: {
				name: { type: 'string' },
				phone: { type: 'string' },
				location: { type: 'string' },
				email: { type: 'string' },
				website: { type: 'string' },
				linkedin: { type: 'string' },
				github: { type: 'string' },
			},
		},
		profile: {
			type: 'object',
			additionalProperties: false,
			required: ['summary'],
			properties: { summary: { type: 'string' } },
		},
		education: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['institution', 'location', 'degree', 'major', 'startDate', 'endDate', 'isPresent', 'bullets'],
				properties: {
					institution: { type: 'string' },
					location: { type: 'string' },
					degree: { type: 'string' },
					major: { type: 'string' },
					startDate: { type: 'string' },
					endDate: { type: 'string' },
					isPresent: { type: 'boolean' },
					bullets: stringArray,
				},
			},
		},
		projects: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['name', 'stack', 'url', 'award', 'bullets'],
				properties: {
					name: { type: 'string' },
					stack: { type: 'string' },
					url: { type: 'string' },
					award: { type: 'string' },
					bullets: stringArray,
				},
			},
		},
		workExperience: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'company', 'location', 'startDate', 'endDate', 'isPresent', 'bullets'],
				properties: {
					title: { type: 'string' },
					company: { type: 'string' },
					location: { type: 'string' },
					startDate: { type: 'string' },
					endDate: { type: 'string' },
					isPresent: { type: 'boolean' },
					bullets: stringArray,
				},
			},
		},
		leadership: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'organization', 'location', 'startDate', 'endDate', 'isPresent', 'bullets'],
				properties: {
					title: { type: 'string' },
					organization: { type: 'string' },
					location: { type: 'string' },
					startDate: { type: 'string' },
					endDate: { type: 'string' },
					isPresent: { type: 'boolean' },
					bullets: stringArray,
				},
			},
		},
		skills: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['category', 'skills'],
				properties: {
					category: { type: 'string' },
					skills: { type: 'string' },
				},
			},
		},
		achievements: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'date', 'description'],
				properties: {
					title: { type: 'string' },
					date: { type: 'string' },
					description: { type: 'string' },
				},
			},
		},
	},
} as const;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/server/extraction.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/server/extraction.ts web/src/lib/server/extraction.test.ts
git commit -m "feat: extraction schema, prompt, and OpenAI error mapping"
```

---

## Task 3: buildResumeFromExtraction (client merge)

**Files:**
- Modify: `web/src/lib/resume-utils.ts`
- Test: `web/src/lib/extract-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/extract-client.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildResumeFromExtraction } from './resume-utils';
import { defaultResumeData } from './types';
import type { ExtractedResume } from './types';

const sample: ExtractedResume = {
	personalInfo: {
		name: 'Ada Lovelace',
		phone: '',
		location: 'London',
		email: 'ada@example.com',
		website: '',
		linkedin: 'adalovelace',
		github: '',
	},
	profile: { summary: 'Mathematician.' },
	education: [
		{
			institution: 'Uni',
			location: 'London',
			degree: 'BSc',
			major: 'Math',
			startDate: '1830-01',
			endDate: '1834-01',
			isPresent: false,
			bullets: ['Top of class'],
		},
	],
	projects: [],
	workExperience: [],
	leadership: [],
	skills: [{ category: 'Languages', skills: 'Analytical Engine' }],
	achievements: [],
};

describe('buildResumeFromExtraction', () => {
	it('copies personal info and profile', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.personalInfo.name).toBe('Ada Lovelace');
		expect(r.profile.summary).toBe('Mathematician.');
	});

	it('assigns a unique id to every array item', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.education[0].id).toBeTruthy();
		expect(r.skills[0].id).toBeTruthy();
		expect(r.education[0].id).not.toBe(r.skills[0].id);
	});

	it('applies default colors, fonts, and section order', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.colors).toEqual(defaultResumeData.colors);
		expect(r.fonts).toEqual(defaultResumeData.fonts);
		expect(r.sectionOrder).toEqual(defaultResumeData.sectionOrder);
	});

	it('preserves extracted bullets', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.education[0].bullets).toEqual(['Top of class']);
	});

	it('does not share array references with defaults', () => {
		const r = buildResumeFromExtraction(sample);
		r.colors.headColor = '#000000';
		expect(defaultResumeData.colors.headColor).not.toBe('#000000');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/extract-client.test.ts`
Expected: FAIL — `buildResumeFromExtraction` is not exported.

- [ ] **Step 3: Implement buildResumeFromExtraction**

In `web/src/lib/resume-utils.ts`, update the import line and append the function.

Change the first line from:

```ts
import type { ResumeData } from './types';
```

to:

```ts
import type { ResumeData, ExtractedResume } from './types';
import { defaultResumeData, defaultFontSettings, defaultSectionOrder } from './types';
```

Append at the end of the file:

```ts
// Convert AI-extracted content into a full ResumeData: add ids + default styling.
export function buildResumeFromExtraction(ex: ExtractedResume): ResumeData {
	const withId = <T>(items: T[]): (T & { id: string })[] =>
		items.map((item) => ({ ...item, id: generateId() }));

	return {
		personalInfo: { ...defaultResumeData.personalInfo, ...ex.personalInfo },
		profile: { summary: ex.profile?.summary ?? '' },
		education: withId(ex.education ?? []),
		projects: withId(ex.projects ?? []),
		workExperience: withId(ex.workExperience ?? []),
		leadership: withId(ex.leadership ?? []),
		skills: withId(ex.skills ?? []),
		achievements: withId(ex.achievements ?? []),
		colors: { ...defaultResumeData.colors },
		fonts: { ...defaultFontSettings },
		sectionOrder: [...defaultSectionOrder],
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/extract-client.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/resume-utils.ts web/src/lib/extract-client.test.ts
git commit -m "feat: buildResumeFromExtraction client merge helper"
```

---

## Task 4: AI-highlight store

**Files:**
- Create: `web/src/lib/ai-highlight.ts`
- Test: `web/src/lib/ai-highlight.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/ai-highlight.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { aiFilled, setHighlightsFromData, clearHighlight, resetHighlights } from './ai-highlight';
import { buildResumeFromExtraction } from './resume-utils';
import type { ExtractedResume } from './types';

const sample: ExtractedResume = {
	personalInfo: {
		name: 'Ada',
		phone: '',
		location: 'London',
		email: 'ada@example.com',
		website: '',
		linkedin: '',
		github: '',
	},
	profile: { summary: 'Math.' },
	education: [],
	projects: [],
	workExperience: [
		{
			title: 'Engineer',
			company: 'Acme',
			location: '',
			startDate: '2020-01',
			endDate: '',
			isPresent: true,
			bullets: ['Did a thing', ''],
		},
	],
	leadership: [],
	skills: [{ category: 'Lang', skills: 'TS' }],
	achievements: [],
};

describe('setHighlightsFromData', () => {
	beforeEach(() => resetHighlights());

	it('marks populated string fields', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('personalInfo.name')).toBe(true);
		expect(aiFilled.has('profile.summary')).toBe(true);
	});

	it('does not mark empty string fields', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('personalInfo.phone')).toBe(false);
	});

	it('marks nested array item fields with indices', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('workExperience.0.title')).toBe(true);
		expect(aiFilled.has('skills.0.category')).toBe(true);
	});

	it('marks only non-empty bullets by index', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('workExperience.0.bullets.0')).toBe(true);
		expect(aiFilled.has('workExperience.0.bullets.1')).toBe(false);
	});

	it('never marks id or boolean fields', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('workExperience.0.id')).toBe(false);
		expect(aiFilled.has('workExperience.0.isPresent')).toBe(false);
	});

	it('clearHighlight removes a single path', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		clearHighlight('personalInfo.name');
		expect(aiFilled.has('personalInfo.name')).toBe(false);
	});

	it('resetHighlights empties the set', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		resetHighlights();
		expect(aiFilled.size).toBe(0);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/ai-highlight.test.ts`
Expected: FAIL — module `./ai-highlight` not found.

- [ ] **Step 3: Implement the store**

Create `web/src/lib/ai-highlight.ts`:

```ts
import { SvelteSet } from 'svelte/reactivity';
import type { ResumeData } from './types';

// Reactive set of dotted field paths that were filled by the AI, e.g.
// "personalInfo.name", "workExperience.0.title", "education.1.bullets.2".
export const aiFilled = new SvelteSet<string>();

export function clearHighlight(path: string): void {
	aiFilled.delete(path);
}

export function resetHighlights(): void {
	aiFilled.clear();
}

function markObject(prefix: string, obj: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(obj)) {
		if (key === 'id') continue;
		const path = `${prefix}${key}`;
		if (typeof value === 'string') {
			if (value.trim() !== '') aiFilled.add(path);
		} else if (Array.isArray(value)) {
			// bullets: string[]
			value.forEach((item, i) => {
				if (typeof item === 'string' && item.trim() !== '') aiFilled.add(`${path}.${i}`);
			});
		}
		// booleans (isPresent) are intentionally not highlighted
	}
}

const ARRAY_SECTIONS = ['education', 'projects', 'workExperience', 'leadership', 'skills', 'achievements'] as const;

export function setHighlightsFromData(data: ResumeData): void {
	aiFilled.clear();
	markObject('personalInfo.', data.personalInfo as unknown as Record<string, unknown>);
	markObject('profile.', data.profile as unknown as Record<string, unknown>);
	for (const section of ARRAY_SECTIONS) {
		const arr = data[section] as unknown as Record<string, unknown>[];
		arr.forEach((item, i) => markObject(`${section}.${i}.`, item));
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/ai-highlight.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests from Tasks 2-4 pass.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/ai-highlight.ts web/src/lib/ai-highlight.test.ts
git commit -m "feat: reactive ai-highlight store with path derivation"
```

---

## Task 5: The /api/extract endpoint

**Files:**
- Create: `web/src/routes/api/extract/+server.ts`

- [ ] **Step 1: Implement the endpoint**

Create `web/src/routes/api/extract/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import {
	MODEL,
	RESUME_SCHEMA,
	EXTRACTION_PROMPT,
	mapOpenAIError,
	extractError,
	type ExtractError,
} from '$lib/server/extraction';
import type { ExtractedResume } from '$lib/types';

// This endpoint is dynamic (the root layout sets prerender=true for pages).
export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024;

function fail(e: ExtractError): Response {
	return json({ error: { code: e.code, message: e.message } }, { status: e.status });
}

function extOf(name: string): string {
	const i = name.lastIndexOf('.');
	return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export const POST: RequestHandler = async ({ request }) => {
	let file: File | null = null;
	try {
		const form = await request.formData();
		const f = form.get('file');
		if (f instanceof File) file = f;
	} catch {
		return fail(extractError('invalid_file'));
	}

	if (!file) return fail(extractError('invalid_file'));
	if (file.size > MAX_BYTES) return fail(extractError('file_too_large'));

	const ext = extOf(file.name);
	if (!['pdf', 'docx', 'txt'].includes(ext)) return fail(extractError('invalid_file'));

	const client = new OpenAI({ apiKey: OPENAI_API_KEY });

	// Build the user content depending on file type.
	let content: OpenAI.Responses.ResponseInputContent[];
	try {
		if (ext === 'pdf') {
			const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
			content = [
				{ type: 'input_text', text: EXTRACTION_PROMPT },
				{
					type: 'input_file',
					filename: file.name,
					file_data: `data:application/pdf;base64,${base64}`,
				},
			];
		} else {
			let text: string;
			if (ext === 'docx') {
				const buffer = Buffer.from(await file.arrayBuffer());
				text = (await mammoth.extractRawText({ buffer })).value;
			} else {
				text = await file.text();
			}
			if (!text.trim()) return fail(extractError('parse_failed'));
			content = [{ type: 'input_text', text: `${EXTRACTION_PROMPT}\n\nRESUME:\n${text}` }];
		}
	} catch {
		return fail(extractError('parse_failed'));
	}

	// Call OpenAI with structured output.
	try {
		const response = await client.responses.create({
			model: MODEL,
			input: [{ role: 'user', content }],
			text: {
				format: {
					type: 'json_schema',
					name: 'resume',
					strict: true,
					schema: RESUME_SCHEMA as unknown as Record<string, unknown>,
				},
			},
		});

		const raw = response.output_text;
		if (!raw) return fail(extractError('parse_failed'));

		const data = JSON.parse(raw) as ExtractedResume;
		return json({ data });
	} catch (err) {
		// SyntaxError from JSON.parse -> parse_failed; otherwise map the OpenAI/network error.
		if (err instanceof SyntaxError) return fail(extractError('parse_failed'));
		return fail(mapOpenAIError(err));
	}
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors. If the `openai` types name `ResponseInputContent` differently for the installed version, change the `content` type annotation to `any[]` as a fallback and re-run (the runtime shape above matches the Responses API: `input_text` and `input_file` parts).

- [ ] **Step 3: Manual smoke test (requires a real key)**

Create `web/.env` with a valid `OPENAI_API_KEY=...`. Run `npm run dev`. In a second terminal:

```bash
curl -s -X POST http://localhost:5173/api/extract -F "file=@/path/to/sample-resume.pdf"
```

Expected: JSON `{ "data": { "personalInfo": { ... }, ... } }`. If you have no key/credits, expect `{ "error": { "code": "quota_exceeded" | "auth", ... } }` with the matching status — this also validates the error path.

- [ ] **Step 4: Commit**

```bash
git add web/src/routes/api/extract/+server.ts
git commit -m "feat: /api/extract endpoint (pdf/docx/txt -> OpenAI structured output)"
```

---

## Task 6: Purple highlight CSS + simple-form wiring

**Files:**
- Modify: `web/src/app.css`
- Modify: `web/src/lib/components/forms/PersonalForm.svelte`
- Modify: `web/src/lib/components/forms/ProfileForm.svelte`

- [ ] **Step 1: Add the `.ai-filled` class**

Append to `web/src/app.css`:

```css
.ai-filled {
	@apply border-purple-500 bg-purple-50 ring-1 ring-purple-400;
}
```

- [ ] **Step 2: Wire PersonalForm**

Replace the entire contents of `web/src/lib/components/forms/PersonalForm.svelte` with:

```svelte
<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();
</script>

<div class="space-y-4">
	<h2 class="text-lg font-semibold">Personal Information</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label>Full Name</label><input
				type="text"
				bind:value={data.personalInfo.name}
				placeholder="John Doe"
				class:ai-filled={aiFilled.has('personalInfo.name')}
				oninput={() => clearHighlight('personalInfo.name')}
			/>
		</div>
		<div>
			<label>Email</label><input
				type="email"
				bind:value={data.personalInfo.email}
				placeholder="john@example.com"
				class:ai-filled={aiFilled.has('personalInfo.email')}
				oninput={() => clearHighlight('personalInfo.email')}
			/>
		</div>
		<div>
			<label>Phone</label><input
				type="tel"
				bind:value={data.personalInfo.phone}
				placeholder="(555) 123-4567"
				class:ai-filled={aiFilled.has('personalInfo.phone')}
				oninput={() => clearHighlight('personalInfo.phone')}
			/>
		</div>
		<div>
			<label>Website</label><input
				type="text"
				bind:value={data.personalInfo.website}
				placeholder="johndoe.com"
				class:ai-filled={aiFilled.has('personalInfo.website')}
				oninput={() => clearHighlight('personalInfo.website')}
			/>
		</div>
		<div>
			<label>LinkedIn Username</label><input
				type="text"
				bind:value={data.personalInfo.linkedin}
				placeholder="johndoe"
				class:ai-filled={aiFilled.has('personalInfo.linkedin')}
				oninput={() => clearHighlight('personalInfo.linkedin')}
			/>
		</div>
		<div>
			<label>GitHub Username</label><input
				type="text"
				bind:value={data.personalInfo.github}
				placeholder="johndoe"
				class:ai-filled={aiFilled.has('personalInfo.github')}
				oninput={() => clearHighlight('personalInfo.github')}
			/>
		</div>
	</div>
</div>
```

- [ ] **Step 3: Wire ProfileForm**

Replace the entire contents of `web/src/lib/components/forms/ProfileForm.svelte` with:

```svelte
<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();
</script>

<div class="space-y-4">
	<h2 class="text-lg font-semibold">Profile Summary</h2>
	<textarea
		bind:value={data.profile.summary}
		rows="5"
		placeholder="A brief summary of your background, skills, and career objectives..."
		class:ai-filled={aiFilled.has('profile.summary')}
		oninput={() => clearHighlight('profile.summary')}
	></textarea>
</div>
```

- [ ] **Step 4: Verify**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/app.css web/src/lib/components/forms/PersonalForm.svelte web/src/lib/components/forms/ProfileForm.svelte
git commit -m "feat: ai-filled highlight class + personal/profile wiring"
```

---

## Task 7: Highlight wiring for reused DateRange + BulletEditor

**Files:**
- Modify: `web/src/lib/components/DateRange.svelte`
- Modify: `web/src/lib/components/BulletEditor.svelte`

These take a `path` prefix prop so each array form can pass e.g. `education.0` (DateRange) or `education.0.bullets` (BulletEditor).

- [ ] **Step 1: Wire DateRange**

Replace the entire contents of `web/src/lib/components/DateRange.svelte` with:

```svelte
<script lang="ts">
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let {
		startDate = $bindable(),
		endDate = $bindable(),
		isPresent = $bindable(),
		path = '',
		endLabel = 'End Date',
		presentLabel = 'Currently active',
	}: {
		startDate: string;
		endDate: string;
		isPresent: boolean;
		path?: string;
		endLabel?: string;
		presentLabel?: string;
	} = $props();
</script>

<div>
	<label>Start Date</label><input
		type="month"
		bind:value={startDate}
		class:ai-filled={aiFilled.has(`${path}.startDate`)}
		oninput={() => clearHighlight(`${path}.startDate`)}
	/>
</div>
<div>
	<label>{endLabel}</label>
	<input
		type="month"
		bind:value={endDate}
		disabled={isPresent}
		class:ai-filled={aiFilled.has(`${path}.endDate`)}
		oninput={() => clearHighlight(`${path}.endDate`)}
	/>
	<label class="flex items-center gap-2 mt-2 cursor-pointer select-none">
		<input type="checkbox" bind:checked={isPresent} class="w-4 h-4 rounded" />
		<span class="text-sm text-gray-600">{presentLabel}</span>
	</label>
</div>
```

- [ ] **Step 2: Wire BulletEditor**

Replace the entire contents of `web/src/lib/components/BulletEditor.svelte` with:

```svelte
<script lang="ts">
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let {
		bullets = $bindable(),
		label,
		path = '',
		placeholder = '',
	}: { bullets: string[]; label: string; path?: string; placeholder?: string } = $props();

	function addBullet() {
		bullets = [...bullets, ''];
	}
	function removeBullet(index: number) {
		bullets = bullets.filter((_, i) => i !== index);
	}
</script>

<div>
	<div class="flex items-center justify-between mb-2">
		<label class="mb-0">{label}</label>
		<button class="secondary text-xs px-2 py-1" onclick={addBullet}>+ Add</button>
	</div>
	{#each bullets as _, bi}
		<div class="flex gap-2 mb-2">
			<input
				type="text"
				bind:value={bullets[bi]}
				{placeholder}
				class="flex-1"
				class:ai-filled={aiFilled.has(`${path}.${bi}`)}
				oninput={() => clearHighlight(`${path}.${bi}`)}
			/>
			{#if bullets.length > 1}<button class="danger text-xs px-2" onclick={() => removeBullet(bi)}>X</button>{/if}
		</div>
	{/each}
</div>
```

- [ ] **Step 3: Verify**

Run: `npm run check`
Expected: no errors (the new `path` props are optional, so existing callers still compile until Task 8 passes them).

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/components/DateRange.svelte web/src/lib/components/BulletEditor.svelte
git commit -m "feat: path-based highlight in DateRange and BulletEditor"
```

---

## Task 8: Highlight wiring for the array forms

**Files:**
- Modify: `web/src/lib/components/forms/EducationForm.svelte`
- Modify: `web/src/lib/components/forms/ProjectsForm.svelte`
- Modify: `web/src/lib/components/forms/ExperienceForm.svelte`
- Modify: `web/src/lib/components/forms/LeadershipForm.svelte`
- Modify: `web/src/lib/components/forms/SkillsForm.svelte`
- Modify: `web/src/lib/components/forms/AchievementsForm.svelte`

Pattern for every text `<input>`/`<textarea>` inside an array loop with index `i`:
add `class:ai-filled={aiFilled.has(\`<section>.${i}.<field>\`)}` and
`oninput={() => clearHighlight(\`<section>.${i}.<field>\`)}`. Pass `path={\`<section>.${i}\`}`
to `DateRange` and `path={\`<section>.${i}.bullets\`}` to `BulletEditor`. Import
`{ aiFilled, clearHighlight }` from `$lib/ai-highlight` in each.

- [ ] **Step 1: Wire EducationForm**

Replace the entire contents of `web/src/lib/components/forms/EducationForm.svelte` with:

```svelte
<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addEducation() {
		data.education = [
			...data.education,
			{
				id: generateId(),
				institution: '',
				location: '',
				degree: '',
				major: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeEducation(id: string) {
		data.education = data.education.filter((e) => e.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Education</h2>
		<button class="primary text-sm" onclick={addEducation}>+ Add</button>
	</div>
	{#each data.education as edu, i}
		<EntryCard index={i} onRemove={() => removeEducation(edu.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label>Institution</label><input
						type="text"
						bind:value={edu.institution}
						placeholder="University Name"
						class:ai-filled={aiFilled.has(`education.${i}.institution`)}
						oninput={() => clearHighlight(`education.${i}.institution`)}
					/>
				</div>
				<div>
					<label>Location</label><input
						type="text"
						bind:value={edu.location}
						placeholder="City, State"
						class:ai-filled={aiFilled.has(`education.${i}.location`)}
						oninput={() => clearHighlight(`education.${i}.location`)}
					/>
				</div>
				<div>
					<label>Degree</label><input
						type="text"
						bind:value={edu.degree}
						placeholder="Bachelor of Sciences"
						class:ai-filled={aiFilled.has(`education.${i}.degree`)}
						oninput={() => clearHighlight(`education.${i}.degree`)}
					/>
				</div>
				<div>
					<label>Major</label><input
						type="text"
						bind:value={edu.major}
						placeholder="Computer Science"
						class:ai-filled={aiFilled.has(`education.${i}.major`)}
						oninput={() => clearHighlight(`education.${i}.major`)}
					/>
				</div>
				<DateRange
					bind:startDate={edu.startDate}
					bind:endDate={edu.endDate}
					bind:isPresent={edu.isPresent}
					path={`education.${i}`}
					endLabel="End Date (Expected)"
					presentLabel="Currently studying"
				/>
			</div>
			<BulletEditor
				bind:bullets={edu.bullets}
				label="Honors/GPA"
				path={`education.${i}.bullets`}
				placeholder="Relevant coursework, honors, GPA..."
			/>
		</EntryCard>
	{/each}
	{#if data.education.length === 0}<p class="text-gray-500 text-center py-8">No education added yet.</p>{/if}
</div>
```

- [ ] **Step 2: Wire ProjectsForm**

Replace the entire contents of `web/src/lib/components/forms/ProjectsForm.svelte` with:

```svelte
<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import EntryCard from '../EntryCard.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addProject() {
		data.projects = [...data.projects, { id: generateId(), name: '', stack: '', url: '', award: '', bullets: [''] }];
	}
	function removeProject(id: string) {
		data.projects = data.projects.filter((p) => p.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Projects</h2>
		<button class="primary text-sm" onclick={addProject}>+ Add</button>
	</div>
	{#each data.projects as project, i}
		<EntryCard index={i} onRemove={() => removeProject(project.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label>Project Name</label><input
						type="text"
						bind:value={project.name}
						placeholder="My Project"
						class:ai-filled={aiFilled.has(`projects.${i}.name`)}
						oninput={() => clearHighlight(`projects.${i}.name`)}
					/>
				</div>
				<div>
					<label>Tech Stack</label><input
						type="text"
						bind:value={project.stack}
						placeholder="React, Node.js, PostgreSQL"
						class:ai-filled={aiFilled.has(`projects.${i}.stack`)}
						oninput={() => clearHighlight(`projects.${i}.stack`)}
					/>
				</div>
				<div>
					<label>Award (optional)</label><input
						type="text"
						bind:value={project.award}
						placeholder="Hackathon Winner"
						class:ai-filled={aiFilled.has(`projects.${i}.award`)}
						oninput={() => clearHighlight(`projects.${i}.award`)}
					/>
				</div>
				<div>
					<label>Project URL</label><input
						type="text"
						bind:value={project.url}
						placeholder="https://github.com/..."
						class:ai-filled={aiFilled.has(`projects.${i}.url`)}
						oninput={() => clearHighlight(`projects.${i}.url`)}
					/>
				</div>
			</div>
			<BulletEditor
				bind:bullets={project.bullets}
				label="Description"
				path={`projects.${i}.bullets`}
				placeholder="Describe what you built..."
			/>
		</EntryCard>
	{/each}
	{#if data.projects.length === 0}<p class="text-gray-500 text-center py-8">No projects added yet.</p>{/if}
</div>
```

- [ ] **Step 3: Wire ExperienceForm**

Replace the entire contents of `web/src/lib/components/forms/ExperienceForm.svelte` with:

```svelte
<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addWorkExperience() {
		data.workExperience = [
			...data.workExperience,
			{
				id: generateId(),
				title: '',
				company: '',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeWorkExperience(id: string) {
		data.workExperience = data.workExperience.filter((w) => w.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Work Experience</h2>
		<button class="primary text-sm" onclick={addWorkExperience}>+ Add</button>
	</div>
	{#each data.workExperience as work, i}
		<EntryCard index={i} onRemove={() => removeWorkExperience(work.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label>Job Title</label><input
						type="text"
						bind:value={work.title}
						placeholder="Software Engineer"
						class:ai-filled={aiFilled.has(`workExperience.${i}.title`)}
						oninput={() => clearHighlight(`workExperience.${i}.title`)}
					/>
				</div>
				<div>
					<label>Company</label><input
						type="text"
						bind:value={work.company}
						placeholder="Company Name"
						class:ai-filled={aiFilled.has(`workExperience.${i}.company`)}
						oninput={() => clearHighlight(`workExperience.${i}.company`)}
					/>
				</div>
				<div class="md:col-span-2">
					<label>Location</label><input
						type="text"
						bind:value={work.location}
						placeholder="City, State"
						class:ai-filled={aiFilled.has(`workExperience.${i}.location`)}
						oninput={() => clearHighlight(`workExperience.${i}.location`)}
					/>
				</div>
				<DateRange
					bind:startDate={work.startDate}
					bind:endDate={work.endDate}
					bind:isPresent={work.isPresent}
					path={`workExperience.${i}`}
					presentLabel="Currently working here"
				/>
			</div>
			<BulletEditor
				bind:bullets={work.bullets}
				label="Responsibilities"
				path={`workExperience.${i}.bullets`}
				placeholder="Describe your responsibilities and achievements..."
			/>
		</EntryCard>
	{/each}
	{#if data.workExperience.length === 0}<p class="text-gray-500 text-center py-8">No experience added yet.</p>{/if}
</div>
```

- [ ] **Step 4: Wire LeadershipForm**

Replace the entire contents of `web/src/lib/components/forms/LeadershipForm.svelte` with:

```svelte
<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addLeadership() {
		data.leadership = [
			...data.leadership,
			{
				id: generateId(),
				title: '',
				organization: '',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeLeadership(id: string) {
		data.leadership = data.leadership.filter((l) => l.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Leadership</h2>
		<button class="primary text-sm" onclick={addLeadership}>+ Add</button>
	</div>
	{#each data.leadership as lead, i}
		<EntryCard index={i} onRemove={() => removeLeadership(lead.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label>Title</label><input
						type="text"
						bind:value={lead.title}
						placeholder="Team Lead"
						class:ai-filled={aiFilled.has(`leadership.${i}.title`)}
						oninput={() => clearHighlight(`leadership.${i}.title`)}
					/>
				</div>
				<div>
					<label>Organization</label><input
						type="text"
						bind:value={lead.organization}
						placeholder="Organization Name"
						class:ai-filled={aiFilled.has(`leadership.${i}.organization`)}
						oninput={() => clearHighlight(`leadership.${i}.organization`)}
					/>
				</div>
				<div class="md:col-span-2">
					<label>Location</label><input
						type="text"
						bind:value={lead.location}
						placeholder="City, State"
						class:ai-filled={aiFilled.has(`leadership.${i}.location`)}
						oninput={() => clearHighlight(`leadership.${i}.location`)}
					/>
				</div>
				<DateRange
					bind:startDate={lead.startDate}
					bind:endDate={lead.endDate}
					bind:isPresent={lead.isPresent}
					path={`leadership.${i}`}
					presentLabel="Currently active"
				/>
			</div>
			<BulletEditor
				bind:bullets={lead.bullets}
				label="Responsibilities"
				path={`leadership.${i}.bullets`}
				placeholder="Describe your leadership responsibilities..."
			/>
		</EntryCard>
	{/each}
	{#if data.leadership.length === 0}<p class="text-gray-500 text-center py-8">No leadership roles added yet.</p>{/if}
</div>
```

- [ ] **Step 5: Wire SkillsForm**

Replace the entire contents of `web/src/lib/components/forms/SkillsForm.svelte` with:

```svelte
<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();

	function addSkillCategory() {
		data.skills = [...data.skills, { id: generateId(), category: '', skills: '' }];
	}
	function removeSkillCategory(id: string) {
		data.skills = data.skills.filter((s) => s.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Skills</h2>
		<button class="primary text-sm" onclick={addSkillCategory}>+ Add</button>
	</div>
	{#each data.skills as skill, i}
		<div class="border rounded-lg p-4 bg-gray-50">
			<div class="flex gap-3 items-start">
				<div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label>Category</label><input
							type="text"
							bind:value={skill.category}
							placeholder="Languages"
							class:ai-filled={aiFilled.has(`skills.${i}.category`)}
							oninput={() => clearHighlight(`skills.${i}.category`)}
						/>
					</div>
					<div>
						<label>Skills</label><input
							type="text"
							bind:value={skill.skills}
							placeholder="Python, TypeScript, C++"
							class:ai-filled={aiFilled.has(`skills.${i}.skills`)}
							oninput={() => clearHighlight(`skills.${i}.skills`)}
						/>
					</div>
				</div>
				<button class="danger text-sm px-2 py-1" onclick={() => removeSkillCategory(skill.id)}>X</button>
			</div>
		</div>
	{/each}
	{#if data.skills.length === 0}<p class="text-gray-500 text-center py-8">No skills added yet.</p>{/if}
</div>
```

- [ ] **Step 6: Wire AchievementsForm**

Replace the entire contents of `web/src/lib/components/forms/AchievementsForm.svelte` with:

```svelte
<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();

	function addAchievement() {
		data.achievements = [...data.achievements, { id: generateId(), title: '', date: '', description: '' }];
	}
	function removeAchievement(id: string) {
		data.achievements = data.achievements.filter((a) => a.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Achievements / Certifications</h2>
		<button class="primary text-sm" onclick={addAchievement}>+ Add</button>
	</div>
	{#each data.achievements as achievement, i}
		<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
			<div class="flex justify-between items-start">
				<div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label>Title</label><input
							type="text"
							bind:value={achievement.title}
							placeholder="AWS Certified Developer"
							class:ai-filled={aiFilled.has(`achievements.${i}.title`)}
							oninput={() => clearHighlight(`achievements.${i}.title`)}
						/>
					</div>
					<div>
						<label>Date</label><input
							type="month"
							bind:value={achievement.date}
							class:ai-filled={aiFilled.has(`achievements.${i}.date`)}
							oninput={() => clearHighlight(`achievements.${i}.date`)}
						/>
					</div>
				</div>
				<button class="danger text-sm px-2 py-1 ml-2" onclick={() => removeAchievement(achievement.id)}>X</button>
			</div>
			<div>
				<label>Description</label>
				<textarea
					bind:value={achievement.description}
					rows="2"
					placeholder="Brief description of the achievement or certification..."
					class:ai-filled={aiFilled.has(`achievements.${i}.description`)}
					oninput={() => clearHighlight(`achievements.${i}.description`)}
				></textarea>
			</div>
		</div>
	{/each}
	{#if data.achievements.length === 0}<p class="text-gray-500 text-center py-8">No achievements added yet.</p>{/if}
</div>
```

- [ ] **Step 7: Verify**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/components/forms/
git commit -m "feat: per-field ai-highlight wiring across all content forms"
```

---

## Task 9: UploadModal component

**Files:**
- Create: `web/src/lib/components/UploadModal.svelte`

- [ ] **Step 1: Implement the modal**

Create `web/src/lib/components/UploadModal.svelte`:

```svelte
<script lang="ts">
	import { resumeStore } from '$lib/store';
	import { buildResumeFromExtraction } from '$lib/resume-utils';
	import { setHighlightsFromData } from '$lib/ai-highlight';
	import type { ExtractedResume } from '$lib/types';

	let {
		open = $bindable(),
		onApplied,
	}: { open: boolean; onApplied: () => void } = $props();

	type Status = 'idle' | 'processing' | 'error';
	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let dragOver = $state(false);
	let fileInput: HTMLInputElement;

	const ACCEPT = '.pdf,.docx,.txt';

	function close() {
		open = false;
		status = 'idle';
		errorMessage = '';
		dragOver = false;
	}

	async function handleFile(file: File) {
		status = 'processing';
		errorMessage = '';
		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch('/api/extract', { method: 'POST', body: form });

			if (!res.ok) {
				let msg = "Can't reach the AI service. Check your connection and retry.";
				try {
					const body = await res.json();
					if (body?.error?.message) msg = body.error.message;
				} catch {
					// non-JSON response -> keep the connection-style default
				}
				errorMessage = msg;
				status = 'error';
				return;
			}

			const body = (await res.json()) as { data: ExtractedResume };
			const resume = buildResumeFromExtraction(body.data);
			resumeStore.set(resume);
			setHighlightsFromData(resume);
			onApplied();
			close();
		} catch {
			errorMessage = "Can't reach the AI service. Check your connection and retry.";
			status = 'error';
		}
	}

	function onPick(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) handleFile(file);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	function retry() {
		status = 'idle';
		errorMessage = '';
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget && status !== 'processing') close();
		}}
	>
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">Upload your Resume</h2>
				<button class="secondary text-sm px-2 py-1" onclick={close} disabled={status === 'processing'}>X</button>
			</div>

			{#if status === 'idle'}
				<p class="text-sm text-gray-600">
					Upload a PDF, DOCX, or TXT resume. AI will read it and fill in the form. Filled fields are highlighted in
					purple for you to review.
				</p>
				<button
					type="button"
					class="w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors {dragOver
						? 'border-purple-500 bg-purple-50'
						: 'border-gray-300 hover:border-gray-400'}"
					ondragover={(e) => {
						e.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondrop={onDrop}
					onclick={() => fileInput.click()}
				>
					<span class="text-gray-600">Drag a file here, or click to browse</span>
					<span class="block text-xs text-gray-400 mt-1">PDF, DOCX, or TXT — max 5 MB</span>
				</button>
				<input bind:this={fileInput} type="file" accept={ACCEPT} class="hidden" onchange={onPick} />
			{:else if status === 'processing'}
				<div class="flex flex-col items-center gap-3 py-8">
					<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600"></div>
					<p class="text-sm text-gray-600">Reading your resume with AI...</p>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<div class="text-red-600 text-3xl">!</div>
					<p class="text-sm font-medium text-gray-800">Upload failed</p>
					<p class="text-sm text-gray-600">{errorMessage}</p>
					<div class="flex gap-2 pt-2">
						<button class="secondary" onclick={close}>Close</button>
						<button class="primary" onclick={retry}>Retry</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/components/UploadModal.svelte
git commit -m "feat: upload modal with processing + per-code error screen"
```

---

## Task 10: Wire AppHeader + page (modal open state + review banner)

**Files:**
- Modify: `web/src/lib/components/AppHeader.svelte`
- Modify: `web/src/routes/+page.svelte`

- [ ] **Step 1: Replace the dead link with a button in AppHeader**

In `web/src/lib/components/AppHeader.svelte`, add `onUpload` to the props block:

```svelte
	let {
		showCode = $bindable(),
		isCompiling,
		compileError,
		isOverOnePage,
		onDownload,
		onUpload,
	}: {
		showCode: boolean;
		isCompiling: boolean;
		compileError: string | null;
		isOverOnePage: boolean;
		onDownload: () => void;
		onUpload: () => void;
	} = $props();
```

Then replace this block:

```svelte
				<button class="secondary">
					<a href="/extract">
						Upload your Resume
					</a>
				</button>
```

with:

```svelte
				<button class="secondary" onclick={onUpload}>Upload your Resume</button>
```

- [ ] **Step 2: Wire the modal and banner into +page.svelte**

In `web/src/routes/+page.svelte`:

Add these imports after the existing `AppHeader` import (around line 10):

```svelte
	import UploadModal from '$lib/components/UploadModal.svelte';
```

Add these state declarations near the other `$state` lines (around line 33):

```svelte
	let uploadOpen = $state(false);
	let showReviewBanner = $state(false);
```

Update the `<AppHeader ... />` line to pass `onUpload`:

```svelte
	<AppHeader
		bind:showCode
		{isCompiling}
		{compileError}
		{isOverOnePage}
		onDownload={downloadPdfFile}
		onUpload={() => (uploadOpen = true)}
	/>
```

Immediately after the opening `<div class="bg-white rounded-lg shadow p-6 ...">` that wraps `<TabBar ... />` (the Form Panel `div`), add the banner above `<TabBar>`:

```svelte
				{#if showReviewBanner}
					<div
						class="mb-4 flex items-start justify-between gap-2 rounded border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800"
					>
						<span>AI filled the highlighted (purple) fields — please review them for accuracy.</span>
						<button
							class="secondary text-xs px-2 py-0.5"
							onclick={() => (showReviewBanner = false)}
							aria-label="Dismiss">X</button
						>
					</div>
				{/if}
```

Add the modal just before the closing `</div>` of the root `<div class="min-h-screen ...">` (after `<AppFooter />`):

```svelte
	<UploadModal bind:open={uploadOpen} onApplied={() => (showReviewBanner = true)} />
```

- [ ] **Step 3: Verify**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/components/AppHeader.svelte web/src/routes/+page.svelte
git commit -m "feat: wire upload modal button and AI review banner"
```

---

## Task 11: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all unit tests pass (Tasks 2, 3, 4).

- [ ] **Step 2: Type-check + lint**

Run: `npm run check`
Then: `npm run lint`
Expected: no errors. (If `lint` reports formatting, run `npm run format` and re-commit.)

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds with the Vercel adapter. The page route is prerendered; `/api/extract` is emitted as a serverless function.

- [ ] **Step 4: Manual end-to-end (with a real key in `web/.env`)**

Run `npm run dev`, open the app:
1. Click "Upload your Resume" -> modal opens.
2. Upload a real PDF -> spinner -> form fills, modal closes, purple fields appear, review banner shows.
3. Edit a purple field -> its highlight clears.
4. Repeat with a DOCX and a TXT file.
5. Confirm the Download PDF flow still works with the filled data.
6. Error paths: temporarily set a bad `OPENAI_API_KEY` -> expect the "misconfigured (API key)" error screen; with a quota-exhausted key -> "AI credit limit reached".

- [ ] **Step 5: Final commit (if formatting changed anything)**

```bash
git add -A
git commit -m "chore: formatting after resume autofill feature"
```

---

## Self-Review Notes

- **Spec coverage:** adapter swap (T1), endpoint + pdf/docx/txt + structured output + `gpt-5.5-nano` constant (T5, T2), error codes/screens incl. quota + disconnect (T2, T5, T9), highlight store + per-field purple (T4, T6-8), replace-everything merge + ids + defaults (T3, T9), modal (T9), review banner (T10), header button + dead-link removal (T10). All covered.
- **Out of scope (per spec):** endpoint rate-limiting/auth, per-user keys, DOCX layout fidelity, persisting highlights, alternate merge modes.
- **Type consistency:** `aiFilled`/`clearHighlight`/`setHighlightsFromData`/`resetHighlights`, `buildResumeFromExtraction`, `ExtractedResume`, `mapOpenAIError`/`extractError`/`ExtractError`, and the `path` props on `DateRange`/`BulletEditor` are used consistently across tasks.
- **Risk:** `gpt-5.5-nano` and exact `openai` Responses-API field names are past the author's knowledge cutoff; `MODEL` is a one-line constant and T5 Step 2 notes the type fallback if SDK names differ.
