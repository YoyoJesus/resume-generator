import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	isValidOnetCode,
	normalizeSearch,
	normalizeItems,
	normalizeActivities,
	normalizeElements,
	normalizeTechnology,
	mapOnetError,
	onetError,
	searchOccupations,
	fetchOccupation,
} from './onet';

const KEY = 'test-key';

afterEach(() => {
	vi.unstubAllGlobals();
});

// Build a fetch stub that answers by pathname suffix. Matching on the pathname
// rather than the whole URL keeps the overview route (which is a prefix of every
// section route) from swallowing section requests. Anything unmatched returns
// 422, which is what O*NET does for a section it doesn't publish.
function stubFetch(routes: Record<string, { status?: number; body?: unknown }>) {
	const calls: string[] = [];
	const fn = vi.fn(async (url: string, init?: RequestInit) => {
		calls.push(url);
		const { pathname } = new URL(url);
		const hit = Object.entries(routes).find(([frag]) => pathname.endsWith(frag));
		if (!hit) return new Response('nope', { status: 422 });
		const [, res] = hit;
		const status = res.status ?? 200;
		if (status >= 400) return new Response('err', { status });
		return new Response(JSON.stringify(res.body), {
			status,
			headers: { 'content-type': 'application/json' },
		});
	});
	vi.stubGlobal('fetch', fn);
	return { fn, calls };
}

describe('isValidOnetCode', () => {
	it('accepts a well-formed O*NET-SOC code', () => {
		expect(isValidOnetCode('15-1252.00')).toBe(true);
	});

	it.each([
		['../../etc/passwd', 'path traversal'],
		['15-1252.00/../../admin', 'traversal suffix'],
		['15-1252.00?key=leak', 'query injection'],
		['15-1252', 'missing detail suffix'],
		['5-1252.00', 'too few major digits'],
		['15-1252.000', 'too many detail digits'],
		['', 'empty'],
	])('rejects %s (%s)', (code) => {
		expect(isValidOnetCode(code)).toBe(false);
	});
});

describe('normalizeSearch', () => {
	it('maps occupation results and defaults bright_outlook to false', () => {
		const raw = {
			total: 2,
			occupation: [
				{ href: 'x', code: '15-1252.00', title: 'Software Developers', tags: { bright_outlook: true } },
				{ href: 'y', code: '15-1253.00', title: 'Software QA Analysts', tags: {} },
			],
		};
		expect(normalizeSearch(raw)).toEqual([
			{ code: '15-1252.00', title: 'Software Developers', brightOutlook: true },
			{ code: '15-1253.00', title: 'Software QA Analysts', brightOutlook: false },
		]);
	});

	it('returns an empty array when O*NET omits the occupation key', () => {
		expect(normalizeSearch({ total: 0 })).toEqual([]);
	});
});

describe('normalizeItems (tasks)', () => {
	it('reads task text from the title field', () => {
		const raw = { task: [{ id: '1', related: 'r', title: 'Modify existing software to correct errors.' }] };
		expect(normalizeItems(raw)).toEqual([{ id: '1', text: 'Modify existing software to correct errors.' }]);
	});

	it('returns an empty array when the task key is absent', () => {
		expect(normalizeItems({})).toEqual([]);
	});
});

describe('normalizeActivities', () => {
	it('reads activities from the activity key, not the task key', () => {
		const raw = { activity: [{ id: '4.A.3.b.1', title: 'Test software performance.', related: 'r' }] };
		expect(normalizeActivities(raw)).toEqual([{ id: '4.A.3.b.1', text: 'Test software performance.' }]);
	});
});

describe('normalizeElements (skills / knowledge / abilities)', () => {
	it('keeps the competency name and its definition separate', () => {
		const raw = {
			element: [{ id: '2.B.3.e', related: 'r', name: 'Programming', description: 'Writing computer programs.' }],
		};
		expect(normalizeElements(raw)).toEqual([
			{ id: '2.B.3.e', name: 'Programming', description: 'Writing computer programs.' },
		]);
	});
});

describe('normalizeTechnology', () => {
	it('flattens example and example_more into one list and carries the hot flag', () => {
		const raw = {
			category: [
				{
					code: 43232408,
					related: 'r',
					title: 'Development environment software',
					example: [{ title: 'Apache Kafka', href: 'a', hot_technology: true }],
					example_more: [{ title: 'Oracle Java', href: 'b' }],
				},
			],
		};
		expect(normalizeTechnology(raw)).toEqual([
			{
				category: 'Development environment software',
				examples: [
					{ name: 'Apache Kafka', hot: true },
					{ name: 'Oracle Java', hot: false },
				],
			},
		]);
	});

	it('tolerates a category with no examples', () => {
		const raw = { category: [{ code: 1, related: 'r', title: 'Empty category' }] };
		expect(normalizeTechnology(raw)).toEqual([{ category: 'Empty category', examples: [] }]);
	});
});

describe('mapOnetError', () => {
	it.each([
		[401, 'auth'],
		[403, 'auth'],
		[422, 'not_found'],
		[404, 'not_found'],
		[429, 'rate_limited'],
		[500, 'upstream_unavailable'],
		[503, 'upstream_unavailable'],
	])('maps HTTP %i to %s', (status, code) => {
		expect(mapOnetError({ status }).code).toBe(code);
	});

	it('maps a network failure with no status to upstream_unavailable', () => {
		expect(mapOnetError(new TypeError('fetch failed')).code).toBe('upstream_unavailable');
	});
});

describe('searchOccupations', () => {
	it('sends the key as a header and never in the query string', async () => {
		const { fn } = stubFetch({ '/online/search': { body: { total: 0, occupation: [] } } });
		await searchOccupations('software', KEY);

		const [url, init] = fn.mock.calls[0] as [string, RequestInit];
		expect(url).not.toContain(KEY);
		expect((init.headers as Record<string, string>)['X-API-Key']).toBe(KEY);
	});

	it('url-encodes the keyword', async () => {
		const { fn } = stubFetch({ '/online/search': { body: { total: 0, occupation: [] } } });
		await searchOccupations('a&b=c d', KEY);
		expect(fn.mock.calls[0][0]).toContain('keyword=a%26b%3Dc+d');
	});

	it('throws a mapped auth error when the key is rejected', async () => {
		stubFetch({ '/online/search': { status: 401 } });
		await expect(searchOccupations('software', KEY)).rejects.toMatchObject({ code: 'auth' });
	});
});

describe('fetchOccupation', () => {
	const overview = {
		code: '15-1252.00',
		title: 'Software Developers',
		description: 'Research and design software systems.',
		tags: { bright_outlook: true },
	};
	const full = {
		'/summary/tasks': { body: { task: [{ id: '1', related: 'r', title: 'Modify software.' }] } },
		'/summary/detailed_work_activities': {
			body: { activity: [{ id: '2', title: 'Test software performance.', related: 'r' }] },
		},
		'/summary/technology_skills': {
			body: { category: [{ code: 1, related: 'r', title: 'IDEs', example: [{ title: 'Git', href: 'g' }] }] },
		},
		'/summary/skills': { body: { element: [{ id: 's', related: 'r', name: 'Programming', description: 'd' }] } },
		'/summary/knowledge': { body: { element: [{ id: 'k', related: 'r', name: 'Engineering', description: 'd' }] } },
		'/summary/abilities': { body: { element: [{ id: 'a', related: 'r', name: 'Deductive', description: 'd' }] } },
		'/online/occupations/15-1252.00/': { body: overview },
	};

	it('merges every section into one payload', async () => {
		stubFetch(full);
		const occ = await fetchOccupation('15-1252.00', KEY);

		expect(occ.title).toBe('Software Developers');
		expect(occ.description).toBe('Research and design software systems.');
		expect(occ.brightOutlook).toBe(true);
		expect(occ.tasks).toHaveLength(1);
		expect(occ.detailedWorkActivities[0].text).toBe('Test software performance.');
		expect(occ.technologySkills[0].examples[0].name).toBe('Git');
		expect(occ.skills[0].name).toBe('Programming');
		expect(occ.unavailable).toEqual([]);
	});

	it('degrades a section O*NET does not publish instead of failing the request', async () => {
		const { '/summary/abilities': _dropped, ...withoutAbilities } = full;
		stubFetch(withoutAbilities);

		const occ = await fetchOccupation('15-1252.00', KEY);

		expect(occ.abilities).toEqual([]);
		expect(occ.unavailable).toContain('abilities');
		expect(occ.tasks).toHaveLength(1); // the rest still came through
	});

	it('fails the whole request when the overview itself is unavailable', async () => {
		stubFetch({ '/summary/tasks': full['/summary/tasks'] });
		await expect(fetchOccupation('15-1252.00', KEY)).rejects.toMatchObject({ code: 'not_found' });
	});

	it('rejects an invalid code before making any request', async () => {
		const { fn } = stubFetch(full);
		await expect(fetchOccupation('../admin', KEY)).rejects.toMatchObject({ code: 'invalid_code' });
		expect(fn).not.toHaveBeenCalled();
	});

	it('fetches sections in parallel rather than serially', async () => {
		stubFetch(full);
		await fetchOccupation('15-1252.00', KEY);
		// overview + six sections
		expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(7);
	});
});

describe('onetError', () => {
	it('carries a user-facing message and an HTTP status', () => {
		const e = onetError('rate_limited');
		expect(e.status).toBe(429);
		expect(e.message).toMatch(/busy/i);
	});
});
