# Clearance Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Clearance" (security clearance) as a first-class resume section — data model, Typst rendering, a form tab, section reordering, and AI-extraction support.

**Architecture:** Follow the existing per-section pattern used by Achievements end-to-end: a typed array on `ResumeData`, a `SectionId` entry wired into `defaultSectionOrder`/`sectionLabels`, a pure `generateClearance` Typst-string function reusing the existing `achievement-heading` Typst helper, a `ClearanceForm.svelte` mirroring `AchievementsForm.svelte`, and extraction-schema/highlight-store updates so AI resume upload also fills it.

**Tech Stack:** SvelteKit 5 (runes), TypeScript, Vitest, Typst (via `typst-generator.ts` string templates), OpenAI structured-output JSON schema (`extraction.ts`).

## Global Constraints

- Clearance entries have exactly three fields: `level`, `status`, `dateGranted` — no agency/polygraph/other fields (spec: out of scope).
- `level` and `status` are fixed dropdown enums, not free text: levels = `Confidential`, `Secret`, `Top Secret`, `Top Secret/SCI`, `Public Trust`; statuses = `Active`, `Inactive`, `Eligible`.
- Reuse the existing Typst `#achievement-heading(title, date, body)` helper — do not add a new Typst function.
- `defaultSectionOrder` places `'clearance'` immediately after `'profile'`.
- All commands below run with `web/` as the working directory (`cd web` first, or prefix accordingly).
- No component-testing library is installed (no `@testing-library/svelte`); Svelte components are verified manually via the dev server, not with automated component tests. Pure `.ts` logic gets Vitest unit tests, following the codebase's existing pattern (`ai-highlight.test.ts`, `extract-client.test.ts`, `extraction.test.ts`).

---

## File Structure

- **Modify** `web/src/lib/types.ts` — add `Clearance`/`ClearanceLevel`/`ClearanceStatus`, wire `'clearance'` into `SectionId`/`defaultSectionOrder`/`sectionLabels`, add `clearance` to `ResumeData`/`defaultResumeData`/`ExtractedResume`.
- **Create** `web/src/lib/types.test.ts` — verifies the defaults/order/label wiring above.
- **Modify** `web/src/lib/typst-generator.ts` — add `generateClearance` and wire it into `generateTypstCode`'s `sections` record.
- **Create** `web/src/lib/typst-generator.test.ts` — verifies Typst output for empty/populated clearance and section ordering.
- **Modify** `web/src/lib/resume-utils.ts` — `buildResumeFromExtraction` assigns ids to extracted clearance entries; `estimateOverOnePage` counts clearance lines.
- **Create** `web/src/lib/resume-utils.test.ts` — verifies both behaviors above.
- **Modify** `web/src/lib/ai-highlight.test.ts` — fixture gets a `clearance` field (first for compile, then populated to test highlighting); new test case for clearance highlight paths.
- **Modify** `web/src/lib/extract-client.test.ts` — fixture gets a `clearance: []` field so it keeps type-checking against the widened `ExtractedResume`.
- **Modify** `web/src/lib/ai-highlight.ts` — add `'clearance'` to `ARRAY_SECTIONS`.
- **Modify** `web/src/lib/server/extraction.ts` — add `clearance` to `RESUME_SCHEMA`.
- **Modify** `web/src/lib/server/extraction.test.ts` — asserts the schema shape for `clearance`.
- **Create** `web/src/lib/components/forms/ClearanceForm.svelte` — new form tab, mirrors `AchievementsForm.svelte`.
- **Modify** `web/src/routes/+page.svelte` — import the form, add the tab, add the render branch.

---

### Task 1: Clearance type + defaults

**Files:**
- Modify: `web/src/lib/types.ts`
- Test: `web/src/lib/types.test.ts`

**Interfaces:**
- Produces: `ClearanceLevel = 'Confidential' | 'Secret' | 'Top Secret' | 'Top Secret/SCI' | 'Public Trust'`; `ClearanceStatus = 'Active' | 'Inactive' | 'Eligible'`; `Clearance { id: string; level: ClearanceLevel; status: ClearanceStatus; dateGranted: string }`; `SectionId` includes `'clearance'`; `ResumeData.clearance: Clearance[]`; `defaultResumeData.clearance: []`; `ExtractedResume.clearance: Omit<Clearance, 'id'>[]`.

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { defaultResumeData, defaultSectionOrder, sectionLabels } from './types';

describe('clearance defaults', () => {
	it('defaultResumeData includes an empty clearance array', () => {
		expect(defaultResumeData.clearance).toEqual([]);
	});

	it('defaultSectionOrder places clearance right after profile', () => {
		const profileIndex = defaultSectionOrder.indexOf('profile');
		expect(defaultSectionOrder[profileIndex + 1]).toBe('clearance');
	});

	it('sectionLabels has a label for clearance', () => {
		expect(sectionLabels.clearance).toBe('Clearance');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `web/`): `npx vitest run src/lib/types.test.ts`
Expected: FAIL — all three assertions fail (`clearance` is `undefined`, `defaultSectionOrder[1]` is `'education'`, `sectionLabels.clearance` is `undefined`).

- [ ] **Step 3: Implement**

In `web/src/lib/types.ts`, add the new types right after the `Achievement` interface (before `SkillCategory`):

```ts
export type ClearanceLevel = 'Confidential' | 'Secret' | 'Top Secret' | 'Top Secret/SCI' | 'Public Trust';
export type ClearanceStatus = 'Active' | 'Inactive' | 'Eligible';

export interface Clearance {
	id: string;
	level: ClearanceLevel;
	status: ClearanceStatus;
	dateGranted: string;
}
```

Change:

```ts
export type SectionId = 'profile' | 'education' | 'projects' | 'experience' | 'leadership' | 'skills' | 'achievements';

export const defaultSectionOrder: SectionId[] = [
	'profile',
	'education',
	'projects',
	'experience',
	'leadership',
	'skills',
	'achievements',
];

export const sectionLabels: Record<SectionId, string> = {
	profile: 'Profile',
	education: 'Education',
	projects: 'Projects',
	experience: 'Experience',
	leadership: 'Leadership',
	skills: 'Skills',
	achievements: 'Achievements',
};
```

to:

```ts
export type SectionId =
	| 'profile'
	| 'clearance'
	| 'education'
	| 'projects'
	| 'experience'
	| 'leadership'
	| 'skills'
	| 'achievements';

export const defaultSectionOrder: SectionId[] = [
	'profile',
	'clearance',
	'education',
	'projects',
	'experience',
	'leadership',
	'skills',
	'achievements',
];

export const sectionLabels: Record<SectionId, string> = {
	profile: 'Profile',
	clearance: 'Clearance',
	education: 'Education',
	projects: 'Projects',
	experience: 'Experience',
	leadership: 'Leadership',
	skills: 'Skills',
	achievements: 'Achievements',
};
```

Change:

```ts
export interface ResumeData {
	personalInfo: PersonalInfo;
	profile: Profile;
	education: Education[];
```

to:

```ts
export interface ResumeData {
	personalInfo: PersonalInfo;
	profile: Profile;
	clearance: Clearance[];
	education: Education[];
```

In `defaultResumeData`, change:

```ts
	profile: {
		summary: '',
	},
	education: [],
```

to:

```ts
	profile: {
		summary: '',
	},
	clearance: [],
	education: [],
```

Finally, in `ExtractedResume`, change:

```ts
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

to:

```ts
export interface ExtractedResume {
	personalInfo: PersonalInfo;
	profile: Profile;
	education: Omit<Education, 'id'>[];
	projects: Omit<Project, 'id'>[];
	workExperience: Omit<WorkExperience, 'id'>[];
	leadership: Omit<Leadership, 'id'>[];
	skills: Omit<SkillCategory, 'id'>[];
	achievements: Omit<Achievement, 'id'>[];
	clearance: Omit<Clearance, 'id'>[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `web/`): `npx vitest run src/lib/types.test.ts`
Expected: PASS (3 tests)

This will also break compilation of `web/src/lib/ai-highlight.test.ts` and `web/src/lib/extract-client.test.ts` (their sample `ExtractedResume` objects are now missing the required `clearance` field) — that's expected and fixed in Task 3.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/types.test.ts
git commit -m "feat: add Clearance type and wire it into section defaults"
```

---

### Task 2: Typst rendering

**Files:**
- Modify: `web/src/lib/typst-generator.ts`
- Test: `web/src/lib/typst-generator.test.ts`

**Interfaces:**
- Consumes: `Clearance`, `SectionId` from `./types` (Task 1); existing `formatDisplayDate`, `escapeTypst` helpers already in this file.
- Produces: `generateClearance(clearance: Clearance[]): string`; `generateTypstCode`'s internal `sections` record gains a `clearance` key.

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/typst-generator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateTypstCode } from './typst-generator';
import { defaultResumeData } from './types';
import type { ResumeData } from './types';

function baseData(clearance: ResumeData['clearance']): ResumeData {
	return { ...structuredClone(defaultResumeData), clearance };
}

describe('generateTypstCode clearance section', () => {
	it('omits the Clearance heading when there are no entries', () => {
		const code = generateTypstCode(baseData([]));
		expect(code).not.toContain('= Clearance');
	});

	it('renders level, status, and date for each entry', () => {
		const code = generateTypstCode(
			baseData([{ id: '1', level: 'Top Secret/SCI', status: 'Active', dateGranted: '2023-03' }]),
		);
		expect(code).toContain('= Clearance');
		expect(code).toContain('#achievement-heading("Top Secret/SCI (Active)", "Mar 2023")[]');
	});

	it('places Clearance before Education per the default section order', () => {
		const data = baseData([{ id: '1', level: 'Secret', status: 'Eligible', dateGranted: '' }]);
		data.education = [
			{
				id: 'e1',
				institution: 'MIT',
				location: '',
				degree: '',
				major: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [],
			},
		];
		const code = generateTypstCode(data);
		expect(code.indexOf('= Clearance')).toBeLessThan(code.indexOf('= Education'));
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `web/`): `npx vitest run src/lib/typst-generator.test.ts`
Expected: FAIL — `generateTypstCode` doesn't know about `clearance` yet, so no `= Clearance` heading appears in any case (first test passes vacuously is fine, but the second and third fail since the heading is never emitted).

- [ ] **Step 3: Implement**

In `web/src/lib/typst-generator.ts`, change the type import:

```ts
import type {
	ResumeData,
	WorkExperience,
	Project,
	Education,
	Leadership,
	Achievement,
	SkillCategory,
	SectionId,
} from './types';
```

to:

```ts
import type {
	ResumeData,
	WorkExperience,
	Project,
	Education,
	Leadership,
	Achievement,
	SkillCategory,
	Clearance,
	SectionId,
} from './types';
```

Add a new function right after `generateAchievements` (before `export function generateTypstCode`):

```ts
function generateClearance(clearance: Clearance[]): string {
	if (clearance.length === 0) return '';

	const items = clearance
		.filter((c) => c.level)
		.map((c) => {
			const dateDisplay = formatDisplayDate(c.dateGranted);
			return `#achievement-heading("${escapeTypst(c.level)} (${escapeTypst(c.status)})", "${escapeTypst(dateDisplay)}")[]`;
		})
		.join('\n\n');

	if (!items) return '';

	return `= Clearance
${items}`;
}
```

In `generateTypstCode`, change the destructure:

```ts
	const {
		personalInfo,
		profile,
		education,
		projects,
		workExperience,
		leadership,
		skills,
		achievements,
		colors,
		fonts,
		sectionOrder,
	} = data;
```

to:

```ts
	const {
		personalInfo,
		profile,
		clearance,
		education,
		projects,
		workExperience,
		leadership,
		skills,
		achievements,
		colors,
		fonts,
		sectionOrder,
	} = data;
```

And change the `sections` record:

```ts
	const sections: Record<SectionId, string> = {
		profile: generateProfile(profile.summary),
		education: filledEducation.length > 0 ? `= Education\n${filledEducation.map(generateEducation).join('\n\n')}` : '',
```

to:

```ts
	const sections: Record<SectionId, string> = {
		profile: generateProfile(profile.summary),
		clearance: generateClearance(clearance),
		education: filledEducation.length > 0 ? `= Education\n${filledEducation.map(generateEducation).join('\n\n')}` : '',
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `web/`): `npx vitest run src/lib/typst-generator.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/typst-generator.ts web/src/lib/typst-generator.test.ts
git commit -m "feat: render Clearance section in generated Typst"
```

---

### Task 3: Resume-utils wiring (extraction ids + page-length estimate)

**Files:**
- Modify: `web/src/lib/resume-utils.ts`
- Modify: `web/src/lib/ai-highlight.test.ts` (fixture compile fix only — highlight assertions come in Task 4)
- Modify: `web/src/lib/extract-client.test.ts` (fixture compile fix)
- Test: `web/src/lib/resume-utils.test.ts`

**Interfaces:**
- Consumes: `Clearance`, `ExtractedResume`, `ResumeData` from `./types` (Task 1); existing `generateId`, `defaultResumeData` in this file.
- Produces: `buildResumeFromExtraction` assigns ids to `clearance` entries; `estimateOverOnePage` adds `clearance.length * 2` to its line count.

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/resume-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildResumeFromExtraction, estimateOverOnePage } from './resume-utils';
import { defaultResumeData } from './types';
import type { ExtractedResume, ResumeData } from './types';

const sample: ExtractedResume = {
	personalInfo: { name: '', phone: '', location: '', email: '', website: '', linkedin: '', github: '' },
	profile: { summary: '' },
	education: [],
	projects: [],
	workExperience: [],
	leadership: [],
	skills: [],
	achievements: [],
	clearance: [{ level: 'Secret', status: 'Active', dateGranted: '2022-06' }],
};

describe('buildResumeFromExtraction clearance handling', () => {
	it('assigns an id to each extracted clearance entry', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.clearance).toHaveLength(1);
		expect(r.clearance[0].id).toBeTruthy();
		expect(r.clearance[0].level).toBe('Secret');
	});

	it('defaults to an empty clearance array when none is extracted', () => {
		const r = buildResumeFromExtraction({ ...sample, clearance: [] });
		expect(r.clearance).toEqual([]);
	});
});

describe('estimateOverOnePage clearance weight', () => {
	function baseData(): ResumeData {
		return structuredClone(defaultResumeData);
	}

	it('pushes the one-page estimate over the threshold', () => {
		const data = baseData();
		for (let i = 0; i < 55; i++) {
			data.skills.push({ id: `s${i}`, category: 'X', skills: 'Y' });
		}
		expect(estimateOverOnePage(data)).toBe(false);

		data.clearance = [{ id: '1', level: 'Secret', status: 'Active', dateGranted: '' }];
		expect(estimateOverOnePage(data)).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `web/`): `npx vitest run src/lib/resume-utils.test.ts`
Expected: FAIL to even run/type-check — `buildResumeFromExtraction` return type doesn't include `clearance`, and `estimateOverOnePage`'s threshold test fails (still `false` after adding the clearance entry, since the field is currently ignored).

- [ ] **Step 3: Implement**

In `web/src/lib/resume-utils.ts`, change `buildResumeFromExtraction`'s return object:

```ts
		achievements: withId(ex.achievements ?? []),
		colors: { ...defaultResumeData.colors },
```

to:

```ts
		achievements: withId(ex.achievements ?? []),
		clearance: withId(ex.clearance ?? []),
		colors: { ...defaultResumeData.colors },
```

Change `estimateOverOnePage`:

```ts
	lines += data.achievements.length * 2;
	return lines > 55; // Rough estimate for one page
```

to:

```ts
	lines += data.achievements.length * 2;
	lines += data.clearance.length * 2;
	return lines > 55; // Rough estimate for one page
```

Now fix the two other fixtures so they keep type-checking. In `web/src/lib/ai-highlight.test.ts`, change:

```ts
	leadership: [],
	skills: [{ category: 'Lang', skills: 'TS' }],
	achievements: [],
};
```

to:

```ts
	leadership: [],
	skills: [{ category: 'Lang', skills: 'TS' }],
	achievements: [],
	clearance: [],
};
```

In `web/src/lib/extract-client.test.ts`, change:

```ts
	leadership: [],
	skills: [{ category: 'Languages', skills: 'Analytical Engine' }],
	achievements: [],
};
```

to:

```ts
	leadership: [],
	skills: [{ category: 'Languages', skills: 'Analytical Engine' }],
	achievements: [],
	clearance: [],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `web/`): `npx vitest run src/lib/resume-utils.test.ts src/lib/ai-highlight.test.ts src/lib/extract-client.test.ts`
Expected: PASS — all tests in all three files pass (the ai-highlight/extract-client files are unchanged in behavior, just compiling again).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/resume-utils.ts web/src/lib/resume-utils.test.ts web/src/lib/ai-highlight.test.ts web/src/lib/extract-client.test.ts
git commit -m "feat: assign ids to extracted clearance entries and weigh them in the page estimate"
```

---

### Task 4: AI-highlight support for clearance

**Files:**
- Modify: `web/src/lib/ai-highlight.ts`
- Modify: `web/src/lib/ai-highlight.test.ts`

**Interfaces:**
- Consumes: existing `markObject`, `aiFilled`, `setHighlightsFromData` in this file (unchanged signatures).
- Produces: `ARRAY_SECTIONS` includes `'clearance'`, so `setHighlightsFromData` marks `clearance.{i}.level` / `.status` / `.dateGranted` paths.

- [ ] **Step 1: Write the failing test**

In `web/src/lib/ai-highlight.test.ts`, change the fixture's `clearance` field (added in Task 3) from:

```ts
	achievements: [],
	clearance: [],
};
```

to:

```ts
	achievements: [],
	clearance: [{ level: 'Secret', status: 'Active', dateGranted: '2022-06' }],
};
```

Then add a new test inside the existing `describe('setHighlightsFromData', ...)` block, right after the `'marks nested array item fields with indices'` test:

```ts
	it('marks clearance fields', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('clearance.0.level')).toBe(true);
		expect(aiFilled.has('clearance.0.status')).toBe(true);
		expect(aiFilled.has('clearance.0.dateGranted')).toBe(true);
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `web/`): `npx vitest run src/lib/ai-highlight.test.ts`
Expected: FAIL on the new `'marks clearance fields'` test — `clearance` isn't in `ARRAY_SECTIONS` yet, so nothing under `clearance.*` gets marked.

- [ ] **Step 3: Implement**

In `web/src/lib/ai-highlight.ts`, change:

```ts
const ARRAY_SECTIONS = ['education', 'projects', 'workExperience', 'leadership', 'skills', 'achievements'] as const;
```

to:

```ts
const ARRAY_SECTIONS = [
	'education',
	'projects',
	'workExperience',
	'leadership',
	'skills',
	'achievements',
	'clearance',
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `web/`): `npx vitest run src/lib/ai-highlight.test.ts`
Expected: PASS (all tests, including the new one)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/ai-highlight.ts web/src/lib/ai-highlight.test.ts
git commit -m "feat: highlight AI-extracted clearance fields"
```

---

### Task 5: AI-extraction schema for clearance

**Files:**
- Modify: `web/src/lib/server/extraction.ts`
- Modify: `web/src/lib/server/extraction.test.ts`

**Interfaces:**
- Consumes: nothing new (schema is a plain JSON-schema object literal, not typed against `Clearance`).
- Produces: `RESUME_SCHEMA.required` includes `'clearance'`; `RESUME_SCHEMA.properties.clearance` is an array schema with `level`/`status`/`dateGranted`, `level`/`status` constrained to enums matching `ClearanceLevel`/`ClearanceStatus`.

- [ ] **Step 1: Write the failing test**

In `web/src/lib/server/extraction.test.ts`, change the import:

```ts
import { mapOpenAIError } from './extraction';
```

to:

```ts
import { mapOpenAIError, RESUME_SCHEMA } from './extraction';
```

Add a new `describe` block at the end of the file:

```ts
describe('RESUME_SCHEMA clearance field', () => {
	it('requires a clearance array', () => {
		expect(RESUME_SCHEMA.required).toContain('clearance');
	});

	it('constrains level and status to fixed enums', () => {
		const clearanceItems = RESUME_SCHEMA.properties.clearance.items;
		expect(clearanceItems.properties.level.enum).toEqual([
			'Confidential',
			'Secret',
			'Top Secret',
			'Top Secret/SCI',
			'Public Trust',
		]);
		expect(clearanceItems.properties.status.enum).toEqual(['Active', 'Inactive', 'Eligible']);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `web/`): `npx vitest run src/lib/server/extraction.test.ts`
Expected: FAIL — `RESUME_SCHEMA.properties.clearance` is `undefined` (TypeError reading `.items`), and `required` doesn't contain `'clearance'`.

- [ ] **Step 3: Implement**

In `web/src/lib/server/extraction.ts`, change the `required` array:

```ts
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
```

to:

```ts
	required: [
		'personalInfo',
		'profile',
		'education',
		'projects',
		'workExperience',
		'leadership',
		'skills',
		'achievements',
		'clearance',
	],
```

Add a `clearance` property right after `achievements` in `properties` (this is the last property, so add it just before the closing `},` of the `properties` object):

```ts
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
		clearance: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['level', 'status', 'dateGranted'],
				properties: {
					level: {
						type: 'string',
						enum: ['Confidential', 'Secret', 'Top Secret', 'Top Secret/SCI', 'Public Trust'],
					},
					status: { type: 'string', enum: ['Active', 'Inactive', 'Eligible'] },
					dateGranted: { type: 'string' },
				},
			},
		},
	},
} as const;
```

(Note: this replaces the trailing `},\n} as const;` that previously closed the `properties`/schema object right after `achievements` — keep only one closing pair at the end.)

- [ ] **Step 4: Run test to verify it passes**

Run (from `web/`): `npx vitest run src/lib/server/extraction.test.ts`
Expected: PASS (all tests, including the two new ones)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/server/extraction.ts web/src/lib/server/extraction.test.ts
git commit -m "feat: extract security clearance from uploaded resumes"
```

---

### Task 6: Clearance form component

**Files:**
- Create: `web/src/lib/components/forms/ClearanceForm.svelte`

**Interfaces:**
- Consumes: `ResumeData`, `ClearanceLevel`, `ClearanceStatus` from `$lib/types` (Task 1); `generateId` from `$lib/resume-utils` (Task 3, unchanged signature); `aiFilled`, `clearHighlight` from `$lib/ai-highlight` (Task 4, unchanged signatures).
- Produces: a `ClearanceForm` component taking `{ data: ResumeData }`, mutating `data.clearance` in place — same contract as `AchievementsForm.svelte`.

There is no automated test for this step (no Svelte component-testing library is installed in this repo — see Global Constraints). It's verified manually in Task 8 once it's wired into the page.

- [ ] **Step 1: Create the component**

Create `web/src/lib/components/forms/ClearanceForm.svelte`:

```svelte
<script lang="ts">
	import type { ResumeData, ClearanceLevel, ClearanceStatus } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();

	const LEVELS: ClearanceLevel[] = ['Confidential', 'Secret', 'Top Secret', 'Top Secret/SCI', 'Public Trust'];
	const STATUSES: ClearanceStatus[] = ['Active', 'Inactive', 'Eligible'];

	function addClearance() {
		data.clearance = [...data.clearance, { id: generateId(), level: 'Secret', status: 'Active', dateGranted: '' }];
	}
	function removeClearance(id: string) {
		data.clearance = data.clearance.filter((c) => c.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Clearance</h2>
		<button class="primary text-sm" onclick={addClearance}>+ Add</button>
	</div>
	{#each data.clearance as clearance, i}
		<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
			<div class="flex justify-between items-start">
				<div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<label>Level</label>
						<select
							bind:value={clearance.level}
							class:ai-filled={aiFilled.has(`clearance.${i}.level`)}
							onchange={() => clearHighlight(`clearance.${i}.level`)}
						>
							{#each LEVELS as level}
								<option value={level}>{level}</option>
							{/each}
						</select>
					</div>
					<div>
						<label>Status</label>
						<select
							bind:value={clearance.status}
							class:ai-filled={aiFilled.has(`clearance.${i}.status`)}
							onchange={() => clearHighlight(`clearance.${i}.status`)}
						>
							{#each STATUSES as status}
								<option value={status}>{status}</option>
							{/each}
						</select>
					</div>
					<div>
						<label>Date Granted</label>
						<input
							type="month"
							bind:value={clearance.dateGranted}
							class:ai-filled={aiFilled.has(`clearance.${i}.dateGranted`)}
							oninput={() => clearHighlight(`clearance.${i}.dateGranted`)}
						/>
					</div>
				</div>
				<button class="danger text-sm px-2 py-1 ml-2" onclick={() => removeClearance(clearance.id)}>X</button>
			</div>
		</div>
	{/each}
	{#if data.clearance.length === 0}<p class="text-gray-500 text-center py-8">No clearance info added yet.</p>{/if}
</div>
```

- [ ] **Step 2: Type-check**

Run (from `web/`): `npm run check`
Expected: no new errors from `ClearanceForm.svelte` (it isn't imported anywhere yet, so this mainly confirms the file itself is valid Svelte/TS).

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/components/forms/ClearanceForm.svelte
git commit -m "feat: add ClearanceForm component"
```

---

### Task 7: Wire ClearanceForm into the page

**Files:**
- Modify: `web/src/routes/+page.svelte`

**Interfaces:**
- Consumes: `ClearanceForm` from `$lib/components/forms/ClearanceForm.svelte` (Task 6).

- [ ] **Step 1: Add the import**

In `web/src/routes/+page.svelte`, change:

```svelte
	import PersonalForm from '$lib/components/forms/PersonalForm.svelte';
	import ProfileForm from '$lib/components/forms/ProfileForm.svelte';
	import EducationForm from '$lib/components/forms/EducationForm.svelte';
```

to:

```svelte
	import PersonalForm from '$lib/components/forms/PersonalForm.svelte';
	import ProfileForm from '$lib/components/forms/ProfileForm.svelte';
	import ClearanceForm from '$lib/components/forms/ClearanceForm.svelte';
	import EducationForm from '$lib/components/forms/EducationForm.svelte';
```

- [ ] **Step 2: Add the tab**

Change:

```ts
	const tabs = [
		{ id: 'personal', label: 'Personal' },
		{ id: 'profile', label: 'Profile' },
		{ id: 'education', label: 'Education' },
```

to:

```ts
	const tabs = [
		{ id: 'personal', label: 'Personal' },
		{ id: 'profile', label: 'Profile' },
		{ id: 'clearance', label: 'Clearance' },
		{ id: 'education', label: 'Education' },
```

- [ ] **Step 3: Add the render branch**

Change:

```svelte
				{:else if activeTab === 'profile'}
						<ProfileForm {data} />
					{:else if activeTab === 'education'}
```

to:

```svelte
				{:else if activeTab === 'profile'}
						<ProfileForm {data} />
					{:else if activeTab === 'clearance'}
						<ClearanceForm {data} />
					{:else if activeTab === 'education'}
```

- [ ] **Step 4: Type-check**

Run (from `web/`): `npm run check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/routes/+page.svelte
git commit -m "feat: add Clearance tab to the resume builder"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run (from `web/`): `npm test`
Expected: all test files pass (`ai-highlight.test.ts`, `extract-client.test.ts`, `types.test.ts`, `typst-generator.test.ts`, `resume-utils.test.ts`, `server/extraction.test.ts`).

- [ ] **Step 2: Run the full type-check**

Run (from `web/`): `npm run check`
Expected: no errors.

- [ ] **Step 3: Manual browser verification**

Start the dev server (from `web/`): `npm run dev`, then in a browser:
1. Open the app, click the "Clearance" tab (between Personal/Profile and Education).
2. Click "+ Add", confirm a card appears with Level/Status dropdowns (defaulted to Secret/Active) and a Date Granted month picker.
3. Pick "Top Secret/SCI" and a date; confirm the live preview panel shows a "Clearance" heading positioned after Profile and before Education, rendering `Top Secret/SCI (Active) | <Month Year>`.
4. Click "X" to remove the entry; confirm the preview's Clearance heading disappears and the empty-state message reappears in the form.
5. Open the "Layout" tab; confirm "Clearance" appears in the reorderable section list and moving it up/down changes its position in the preview.

- [ ] **Step 4: Commit (if any fixes were needed)**

If manual verification surfaced issues, fix them, re-run steps 1–3, then:

```bash
git add -A
git commit -m "fix: address issues found during Clearance section verification"
```

If no issues were found, no commit is needed for this task.

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), Typst rendering via `achievement-heading` reuse (Task 2), form with dropdowns (Task 6), page/tab wiring (Task 7), default position after Profile (Task 1 + verified in Task 8), AI extraction schema (Task 5), highlight-store support (Task 4), page-length estimate weight (Task 3), fixture compile fixes (Task 3) — all covered.
- **Type consistency:** `Clearance { id, level, status, dateGranted }` and `ClearanceLevel`/`ClearanceStatus` unions defined once in Task 1 and referenced identically (same field names, same enum value lists) in Tasks 2, 3, 5, and 6 — checked for drift across tasks.
- **Out of scope confirmed:** no new Typst helper function, no extra fields (agency/polygraph), no free-text override for level/status.
