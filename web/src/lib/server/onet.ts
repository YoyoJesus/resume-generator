import type {
	OnetItem,
	OnetOccupation,
	OnetOccupationRef,
	OnetScaleItem,
	OnetSectionName,
	OnetTechnology,
} from '$lib/onet-types';

// O*NET Web Services v2. The key goes in a header; it cannot be a query param.
const BASE = 'https://api-v2.onetcenter.org';

// Sections are paginated with a default window of 20. Ask for the whole list.
const PAGE_END = 100;

export type OnetErrorCode = 'invalid_code' | 'not_found' | 'rate_limited' | 'auth' | 'upstream_unavailable' | 'unknown';

export interface OnetError {
	code: OnetErrorCode;
	message: string;
	status: number;
}

const MESSAGES: Record<OnetErrorCode, string> = {
	invalid_code: "That job code isn't valid.",
	not_found: 'No O*NET data for that occupation.',
	rate_limited: 'O*NET is busy right now. Wait a moment and retry.',
	auth: 'O*NET access is misconfigured (API key).',
	upstream_unavailable: "Can't reach O*NET. Check your connection and retry.",
	unknown: 'Something went wrong. Please try again.',
};

const STATUSES: Record<OnetErrorCode, number> = {
	invalid_code: 400,
	not_found: 404,
	rate_limited: 429,
	auth: 502,
	upstream_unavailable: 502,
	unknown: 500,
};

export function onetError(code: OnetErrorCode, status?: number): OnetError {
	return { code, message: MESSAGES[code], status: status ?? STATUSES[code] };
}

// Map an upstream HTTP status (or a thrown network error) to our error shape.
// O*NET answers 422 rather than 404 for an unknown code.
export function mapOnetError(err: unknown): OnetError {
	const status = (err as { status?: number })?.status;
	if (status === 401 || status === 403) return onetError('auth');
	if (status === 404 || status === 422) return onetError('not_found');
	if (status === 429) return onetError('rate_limited');
	if (typeof status === 'number' && status >= 500) return onetError('upstream_unavailable');
	if (status === undefined) return onetError('upstream_unavailable'); // network / timeout
	return onetError('unknown');
}

// O*NET-SOC codes look like 15-1252.00. Validate before putting one in a URL
// path so a crafted code can't traverse or append a query.
const CODE_RE = /^\d{2}-\d{4}\.\d{2}$/;

export function isValidOnetCode(code: string): boolean {
	return CODE_RE.test(code);
}

class HttpError extends Error {
	constructor(readonly status: number) {
		super(`O*NET responded ${status}`);
	}
}

async function onetFetch(path: string, key: string): Promise<unknown> {
	let res: Response;
	try {
		res = await fetch(`${BASE}${path}`, {
			headers: { 'X-API-Key': key, Accept: 'application/json' },
		});
	} catch {
		throw onetError('upstream_unavailable');
	}
	if (!res.ok) throw new HttpError(res.status);
	try {
		return await res.json();
	} catch {
		throw onetError('upstream_unavailable');
	}
}

// --- Normalizers -----------------------------------------------------------
// Each takes one raw O*NET payload. They are pure so they can be tested
// against recorded shapes without a key or a network.

type Raw = Record<string, unknown>;

function arr(raw: unknown, key: string): Raw[] {
	const v = (raw as Raw)?.[key];
	return Array.isArray(v) ? (v as Raw[]) : [];
}

export function normalizeSearch(raw: unknown): OnetOccupationRef[] {
	return arr(raw, 'occupation').map((o) => ({
		code: String(o.code ?? ''),
		title: String(o.title ?? ''),
		brightOutlook: (o.tags as Raw)?.bright_outlook === true,
	}));
}

// Tasks carry their prose in `title`.
export function normalizeItems(raw: unknown): OnetItem[] {
	return arr(raw, 'task').map((t) => ({ id: String(t.id ?? ''), text: String(t.title ?? '') }));
}

// Detailed work activities use `activity` rather than `task`.
export function normalizeActivities(raw: unknown): OnetItem[] {
	return arr(raw, 'activity').map((a) => ({ id: String(a.id ?? ''), text: String(a.title ?? '') }));
}

// Skills, knowledge and abilities all share the `element` shape.
export function normalizeElements(raw: unknown): OnetScaleItem[] {
	return arr(raw, 'element').map((e) => ({
		id: String(e.id ?? ''),
		name: String(e.name ?? ''),
		description: String(e.description ?? ''),
	}));
}

export function normalizeTechnology(raw: unknown): OnetTechnology[] {
	return arr(raw, 'category').map((c) => {
		const examples = [...arr(c, 'example'), ...arr(c, 'example_more')].map((e) => ({
			name: String(e.title ?? ''),
			hot: e.hot_technology === true,
		}));
		return { category: String(c.title ?? ''), examples };
	});
}

// --- Requests --------------------------------------------------------------

export async function searchOccupations(keyword: string, key: string): Promise<OnetOccupationRef[]> {
	const qs = new URLSearchParams({ keyword, start: '1', end: '20' });
	try {
		return normalizeSearch(await onetFetch(`/online/search?${qs}`, key));
	} catch (err) {
		throw err instanceof HttpError ? mapOnetError(err) : err;
	}
}

// A section that O*NET does not publish for this occupation resolves to null
// rather than rejecting, so one missing section can't sink the whole report.
async function section<T>(path: string, key: string, normalize: (raw: unknown) => T): Promise<T | null> {
	try {
		return normalize(await onetFetch(path, key));
	} catch {
		return null;
	}
}

export async function fetchOccupation(code: string, key: string): Promise<OnetOccupation> {
	if (!isValidOnetCode(code)) throw onetError('invalid_code');

	const base = `/online/occupations/${code}`;
	const page = `?start=1&end=${PAGE_END}`;

	const overviewPromise = onetFetch(`${base}/`, key);
	const sections = {
		tasks: section(`${base}/summary/tasks${page}`, key, normalizeItems),
		detailedWorkActivities: section(`${base}/summary/detailed_work_activities${page}`, key, normalizeActivities),
		technologySkills: section(`${base}/summary/technology_skills${page}`, key, normalizeTechnology),
		skills: section(`${base}/summary/skills${page}`, key, normalizeElements),
		knowledge: section(`${base}/summary/knowledge${page}`, key, normalizeElements),
		abilities: section(`${base}/summary/abilities${page}`, key, normalizeElements),
	};

	let overview: Raw;
	try {
		overview = (await overviewPromise) as Raw;
	} catch (err) {
		// Drain the section promises so a rejected overview doesn't leave them unhandled.
		await Promise.allSettled(Object.values(sections));
		throw err instanceof HttpError ? mapOnetError(err) : err;
	}

	const [tasks, detailedWorkActivities, technologySkills, skills, knowledge, abilities] = await Promise.all([
		sections.tasks,
		sections.detailedWorkActivities,
		sections.technologySkills,
		sections.skills,
		sections.knowledge,
		sections.abilities,
	]);

	const resolved = { tasks, detailedWorkActivities, technologySkills, skills, knowledge, abilities };
	const unavailable = (Object.keys(resolved) as OnetSectionName[]).filter((name) => resolved[name] === null);

	return {
		code: String(overview.code ?? code),
		title: String(overview.title ?? ''),
		description: String(overview.description ?? ''),
		brightOutlook: (overview.tags as Raw)?.bright_outlook === true,
		tasks: tasks ?? [],
		detailedWorkActivities: detailedWorkActivities ?? [],
		technologySkills: technologySkills ?? [],
		skills: skills ?? [],
		knowledge: knowledge ?? [],
		abilities: abilities ?? [],
		unavailable,
	};
}
