import type { RequestHandler } from './$types';
import { searchOccupations, onetError } from '$lib/server/onet';
import { onetFail, onetOk, onetKey } from '$lib/server/onet-route';

// The root layout prerenders pages; this endpoint is dynamic.
export const prerender = false;

const MAX_KEYWORD = 100;

export const GET: RequestHandler = async ({ url }) => {
	const keyword = (url.searchParams.get('keyword') ?? '').trim();
	if (!keyword) return onetOk({ occupations: [] });
	if (keyword.length > MAX_KEYWORD) return onetFail(onetError('invalid_code'));

	const key = onetKey();
	if (!key) return onetFail(onetError('auth'));

	try {
		return onetOk({ occupations: await searchOccupations(keyword, key) });
	} catch (err) {
		return onetFail(err);
	}
};
