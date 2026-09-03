import type { RequestHandler } from './$types';
import { fetchOccupation, isValidOnetCode, onetError } from '$lib/server/onet';
import { onetFail, onetOk, onetKey } from '$lib/server/onet-route';

export const prerender = false;

export const GET: RequestHandler = async ({ params }) => {
	const code = params.code ?? '';
	if (!isValidOnetCode(code)) return onetFail(onetError('invalid_code'));

	const key = onetKey();
	if (!key) return onetFail(onetError('auth'));

	try {
		// One request from the browser; the seven-way O*NET fan-out happens here.
		return onetOk({ occupation: await fetchOccupation(code, key) });
	} catch (err) {
		return onetFail(err);
	}
};
