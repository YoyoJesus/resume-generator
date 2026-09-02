# O*NET Job Tailoring — Design

Date: 2026-09-02
Status: Approved for implementation

## Problem

A user writing a resume in this builder has no reference for what a target occupation actually involves. They guess at which duties, tools, and competencies matter, and phrase bullets from memory.

O*NET publishes exactly that reference data for roughly 900 occupations. This feature puts it beside the editor and lets the user pull items directly into the resume.

## Scope

A read-only reference drawer plus explicit insert actions. No AI. The existing OpenAI extraction pipeline is untouched.

Out of scope: gap analysis against the current resume, AI rewriting of bullets, occupation recommendations.

## Data source

Use the official O*NET Web Services API, not HTML scraping.

- Base URL: `https://api-v2.onetcenter.org`
- Auth: `X-API-Key` header. Free developer key from <https://services.onetcenter.org/developer/signup>. The key cannot be passed as a query parameter.
- Format: JSON.
- Rate limits: best-effort, unspecified numbers. O*NET's own documentation recommends caching common requests, which this design does.

Scraping onetonline.org was rejected: the same data is a documented endpoint, and HTML parsing would break on any redesign.

### Endpoints used

| Purpose | Path |
| --- | --- |
| Keyword search | `/online/search?keyword=` |
| Overview (title, description) | `/online/occupations/{code}` |
| Tasks | `/online/occupations/{code}/summary/tasks` |
| Technology skills | `/online/occupations/{code}/summary/technology_skills` |
| Skills | `/online/occupations/{code}/summary/skills` |
| Knowledge | `/online/occupations/{code}/summary/knowledge` |
| Abilities | `/online/occupations/{code}/summary/abilities` |
| Detailed work activities | `/online/occupations/{code}/summary/detailed_work_activities` |

There is no combined report endpoint. Selecting an occupation fans out to all seven requests server-side and returns one merged payload.

### Partial availability

O*NET states some services are not available for all occupations. A section that returns 404 or 422 degrades to an empty array and its name is added to `unavailable[]` on the payload. It must not fail the whole request. The drawer renders "Not published for this occupation" for those sections.

## Architecture

### Server

`src/lib/server/onet.ts` holds all logic with no SvelteKit imports, mirroring how `src/lib/server/extraction.ts` separates from its route so it stays unit testable.

- `isValidOnetCode(code)` — O*NET-SOC codes match `^\d{2}-\d{4}\.\d{2}$`. Validate before interpolating into a URL path. Rejects path traversal and query injection.
- `onetFetch(path, key)` — adds `X-API-Key` and `Accept: application/json`.
- `searchOccupations(keyword, key)` — returns `OnetOccupationRef[]`.
- `fetchOccupation(code, key)` — `Promise.all` over the seven endpoints, normalized to `OnetOccupation`.
- `mapOnetError(err)` — mirrors `mapOpenAIError`: 401/403 to `auth`, 404/422 to `not_found`, 429 to `rate_limited`, 5xx or network failure to `upstream_unavailable`, else `unknown`.
- Normalizers are separate exported pure functions per section so each is testable against a recorded fixture.

Routes:

- `src/routes/api/onet/search/+server.ts` — `GET ?keyword=`
- `src/routes/api/onet/occupation/[code]/+server.ts` — `GET`

Both set `export const prerender = false` and `Cache-Control: public, max-age=0, s-maxage=604800, stale-while-revalidate=86400`. O*NET updates on an annual cadence, so a one-week edge TTL is safe.

### Vercel free tier

Verified against Vercel's published Hobby limits:

- Max function duration 300s. A seven-way parallel fetch completes in roughly 1 to 2 seconds.
- Max response body 4.5 MB. The merged payload is tens of KB.
- CDN caching of function responses via `s-maxage` and `stale-while-revalidate` is available on all plans.

No KV store, no database, no new npm dependency.

### Types

New file `src/lib/onet-types.ts`, kept out of `types.ts` which already carries the whole resume model.

```ts
interface OnetOccupationRef { code: string; title: string; brightOutlook: boolean }
interface OnetItem { id: string; text: string }
interface OnetScaleItem { id: string; name: string; description: string }
interface OnetTechnology { category: string; examples: string[]; hot: boolean }
interface OnetOccupation {
  code: string; title: string; description: string;
  tasks: OnetItem[];
  detailedWorkActivities: OnetItem[];
  skills: OnetScaleItem[];
  knowledge: OnetScaleItem[];
  abilities: OnetScaleItem[];
  technologySkills: OnetTechnology[];
  unavailable: string[];
}
```

### Client state

`src/lib/onet-store.ts` uses the same shape as `resumeStore`, with its own localStorage key `onetSelection`, holding only `{ code, title }`.

`ResumeData`, `mergeWithDefaults`, and `typst-generator.ts` are not modified. The target occupation is not resume content and must never reach the PDF.

The fetched `OnetOccupation` payload is not persisted. It is refetched on load, which the edge cache makes cheap.

### UI

`src/lib/components/OnetDrawer.svelte` is a fixed right slide-over over the whole app, so O*NET data stays visible while editing any tab.

- Opened from a "Tailor" button in `AppHeader.svelte`, next to Upload.
- Backdrop, Escape to close, `translate-x` transition.
- Debounced (300ms) search box, then a result list, then on select fetch and render collapsible sections.

`src/lib/components/OnetInsertMenu.svelte` is the per-item dropdown picker.

### Insert behavior

The picker is explicit per insert. No sticky target, no fixed destination.

| Item type | Picker lists | Effect |
| --- | --- | --- |
| Task, detailed work activity | `workExperience` entries ("Title at Company"), `projects` entries | Appends text to that entry's `bullets` |
| Technology skill | `skills` categories, plus "New category" | Appends the example name to that category's comma-separated string |
| Skill, knowledge, ability | `skills` categories, plus "New category" | Appends the competency name |

Every insert registers its dotted field path in the existing `aiFilled` set from `ai-highlight.ts`, so inserted text renders purple until the user edits it.

Consequence: the review banner in `+page.svelte` currently reads "AI filled the highlighted (purple) fields". O*NET text is not AI-generated. The copy is generalized to cover both sources rather than building a second highlight system.

## Error handling

Server errors map to a stable `{ error: { code, message } }` shape matching the existing `/api/extract` contract, so the drawer renders messages the same way `UploadModal` does.

| Code | Status | Message |
| --- | --- | --- |
| `invalid_code` | 400 | That job code isn't valid. |
| `not_found` | 404 | No O*NET data for that occupation. |
| `rate_limited` | 429 | O*NET is busy right now. Wait a moment and retry. |
| `auth` | 502 | O*NET access is misconfigured (API key). |
| `upstream_unavailable` | 502 | Can't reach O*NET. Check your connection and retry. |
| `unknown` | 500 | Something went wrong. Please try again. |

A missing `ONET_API_KEY` surfaces as `auth`, matching how a missing OpenAI key behaves today.

## Environment

`ONET_API_KEY` read at request time via `$env/dynamic/private`, not `$env/static/private`. Static private env would fail the build outright when the variable is absent; dynamic makes a missing key a runtime `auth` error instead, which is what the error table above specifies. Added to `.env.example` and to the Vercel project environment.

## Attribution

O*NET data is CC BY 4.0 and attribution is mandatory. `AppFooter.svelte` gains the required text verbatim:

> This site incorporates information from O*NET Web Services by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET is a trademark of USDOL/ETA.

with "O*NET Web Services" linking to <https://services.onetcenter.org/> and a CC BY 4.0 license link.

## Testing

Vitest, alongside the existing suites.

- `onet.test.ts` — code validation rejects injection and malformed codes; each section normalizer against recorded fixture JSON; partial-section failure degrades to `unavailable` rather than throwing; error mapping table.
- `onet-store.test.ts` — persistence round-trip, corrupt JSON tolerated.
- `onet-insert.test.ts` — insert into an experience entry, into a project, into an existing skills category, into a new category; correct highlight paths registered; no mutation of unrelated resume fields.

Fixtures are recorded JSON committed under `src/lib/server/fixtures/`, so tests require no API key and no network.
