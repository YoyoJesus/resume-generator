import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { onetError, type OnetError } from './onet';

// O*NET publishes on an annual cadence, so a one-week edge TTL is safe. Vercel's
// CDN honours s-maxage and stale-while-revalidate on every plan, including Hobby,
// which is what keeps this feature inside the free tier.
export const ONET_CACHE_CONTROL = 'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400';

// Read at request time rather than through $env/static/private: a missing key
// should surface as a runtime auth error, not break the build.
export function onetKey(): string {
	return env.ONET_API_KEY ?? '';
}

function isOnetError(e: unknown): e is OnetError {
	const v = e as Record<string, unknown> | null;
	return !!v && typeof v.code === 'string' && typeof v.status === 'number' && typeof v.message === 'string';
}

// Match the { error: { code, message } } shape /api/extract already returns, so
// the client renders failures from either endpoint the same way.
export function onetFail(e: unknown): Response {
	const err = isOnetError(e) ? e : onetError('unknown');
	return json({ error: { code: err.code, message: err.message } }, { status: err.status });
}

export function onetOk(body: unknown): Response {
	return json(body, { headers: { 'Cache-Control': ONET_CACHE_CONTROL } });
}
