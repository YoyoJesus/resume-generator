# Clearance Section — Design

Date: 2026-07-16
Status: Approved for planning

## Goal

Add "Clearance" (security clearance) as a first-class resume section, alongside
Education, Experience, Achievements, etc. Users can add one or more clearance
entries (level, status, date granted), have them render as a `= Clearance`
section in the generated Typst resume, reorder the section like any other, and
have it auto-fill from AI resume-upload extraction.

## Data model — `web/src/lib/types.ts`

```ts
export type ClearanceLevel = 'Confidential' | 'Secret' | 'Top Secret' | 'Top Secret/SCI' | 'Public Trust';
export type ClearanceStatus = 'Active' | 'Inactive' | 'Eligible';

export interface Clearance {
  id: string;
  level: ClearanceLevel;
  status: ClearanceStatus;
  dateGranted: string; // "YYYY-MM"
}
```

- `SectionId` gains `'clearance'`.
- `defaultSectionOrder` becomes `['profile', 'clearance', 'education', 'projects', 'experience', 'leadership', 'skills', 'achievements']` — clearance sits right after Profile.
- `sectionLabels.clearance = 'Clearance'`.
- `ResumeData.clearance: Clearance[]`; `defaultResumeData.clearance = []`.
- `ExtractedResume.clearance: Omit<Clearance, 'id'>[]`.

`level` and `status` are constrained unions (dropdowns in the form), not free
text — consistent, resume-ready phrasing without a validation layer.

## Typst rendering — `web/src/lib/typst-generator.ts`

New `generateClearance(clearance: Clearance[]): string`, structured exactly
like `generateAchievements`:

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
  return `= Clearance\n${items}`;
}
```

Reuses the existing `#achievement-heading(title, date, body)` Typst helper —
no new Typst function needed. Renders as bold `Level (Status)` on the left,
date on the right, same visual weight as an Achievements entry.

Add `clearance: generateClearance(data.clearance)` to the `sections` record in
`generateTypstCode`, keyed by `SectionId` so it participates in
`sectionOrder` like every other section.

## Form — `web/src/lib/components/forms/ClearanceForm.svelte`

Mirrors `AchievementsForm.svelte`:

- "+ Add" button pushes `{ id: generateId(), level: 'Secret', status: 'Active', dateGranted: '' }` (sensible defaults so the dropdowns aren't blank).
- Each entry: `<select>` for Level (5 options above), `<select>` for Status (3 options above), `type="month"` input for Date Granted, a remove (`X`) button — same layout as an Achievement card.
- `class:ai-filled={aiFilled.has(\`clearance.${i}.level\`)}` / `.status` / `.dateGranted`, each clearing its own highlight on `oninput`/`onchange`.
- Empty state: "No clearance info added yet." when `data.clearance.length === 0`.

## Wiring

- **`+page.svelte`**: import `ClearanceForm`; add `{ id: 'clearance', label: 'Clearance' }` to `tabs` right after the Profile tab; add `{:else if activeTab === 'clearance'}<ClearanceForm {data} />`.
- **`resume-utils.ts`**:
  - `buildResumeFromExtraction`: add `clearance: withId(ex.clearance ?? [])`.
  - `estimateOverOnePage`: add `lines += data.clearance.length * 2` (same weight as achievements — one heading line + one date line).
- **`ai-highlight.ts`**: add `'clearance'` to `ARRAY_SECTIONS` so AI-filled clearance entries get purple-highlighted like every other array section.

## AI extraction — `web/src/lib/server/extraction.ts`

Add `clearance` to `RESUME_SCHEMA.required` and `properties`:

```ts
clearance: {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['level', 'status', 'dateGranted'],
    properties: {
      level: { type: 'string', enum: ['Confidential', 'Secret', 'Top Secret', 'Top Secret/SCI', 'Public Trust'] },
      status: { type: 'string', enum: ['Active', 'Inactive', 'Eligible'] },
      dateGranted: { type: 'string' },
    },
  },
},
```

No `EXTRACTION_PROMPT` wording changes — the existing "fill every field of the
provided JSON schema" / "do not invent data" instructions already cover a new
schema field. If a resume states a clearance with a level/status outside the
enum, the model should map to the closest option or omit the entry; this is
existing model behavior for constrained enums, not something the prompt needs
to special-case.

## Test fixtures

`ai-highlight.test.ts` and `extract-client.test.ts` each construct a sample
`ExtractedResume` object; both need `clearance: []` added so they keep
type-checking against the widened interface.

## Data flow

```
User fills ClearanceForm -> data.clearance updated -> typstCode regenerated (existing $derived)
                                                     -> section reorderable via sectionOrder (existing LayoutForm)
AI upload -> /api/extract returns clearance[] -> buildResumeFromExtraction adds ids
          -> resumeStore.set -> ai-highlight marks clearance.{i}.{field} -> purple fields in ClearanceForm
```

## Testing

- Manual: add/remove clearance entries, verify dropdown values render correctly
  in the Typst preview (`Level (Status) | Mon YYYY`), verify section
  reordering (Layout tab) moves Clearance correctly, verify empty clearance
  array renders no `= Clearance` heading.
- Manual: upload a resume mentioning a clearance and confirm it extracts and
  highlights.
- Type-check (`svelte-check` / `tsc`) after fixture updates.

## Out of scope (YAGNI)

- Granting agency, polygraph type, or other extra fields (level/status/date
  only, per approved design).
- Free-text override for level/status (dropdowns only).
- New Typst helper function — reuses `achievement-heading`.
- Clearance-specific validation beyond the dropdown's fixed option set.
