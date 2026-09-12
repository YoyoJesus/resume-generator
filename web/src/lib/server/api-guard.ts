import { json } from '@sveltejs/kit';

export const RATE_WINDOW_MS = 60_000;
export const AI_REQUESTS_PER_MINUTE = 6;
export const ONET_REQUESTS_PER_MINUTE = 60;
const MAX_CLIENTS = 10_000;

/**
 * Adapters surface `x-forwarded-for` verbatim, and that header is a proxy chain
 * the caller controls except for the entry the deployment proxy appends last.
 * Keying on the whole string would let any caller-supplied prefix mint a fresh
 * bucket per request, so only the rightmost entry is usable as an identity.
 */
export function rateLimitKey(address: string | null | undefined): string {
	return address?.split(',').pop()?.trim() || 'unknown';
}

/** Best effort per instance. The bounded map cannot provide a deployment-wide quota. */
export function createApiGuard() {
	const clients = new Map<string, { count: number; expires: number }>();
	return (request: Request, url: URL, address: string, now = Date.now()): Response | null => {
		const origin = request.headers.get('origin');
		const site = request.headers.get('sec-fetch-site');
		if ((origin !== null && origin !== url.origin) || (site !== null && site !== 'same-origin' && site !== 'none')) {
			return json(
				{ error: { code: 'forbidden', message: 'Use this API from the application on the same origin.' } },
				{ status: 403, headers: { 'Cache-Control': 'no-store' } },
			);
		}
		const ai = request.method === 'POST';
		const key = `${ai ? 'ai' : 'onet'}:${address}`;
		for (const [key, bucket] of clients) if (bucket.expires <= now) clients.delete(key);
		let bucket = clients.get(key);
		if (!bucket && clients.size < MAX_CLIENTS) {
			bucket = { count: 0, expires: now + RATE_WINDOW_MS };
			clients.set(key, bucket);
		}
		if (!bucket || bucket.count >= (ai ? AI_REQUESTS_PER_MINUTE : ONET_REQUESTS_PER_MINUTE)) {
			return json(
				{ error: { code: 'rate_limited', message: 'Too many requests. Wait a minute and retry.' } },
				{
					status: 429,
					headers: {
						'Retry-After': String(Math.max(1, Math.ceil(((bucket?.expires ?? now + RATE_WINDOW_MS) - now) / 1000))),
						'Cache-Control': 'no-store',
					},
				},
			);
		}
		bucket.count++;
		return null;
	};
}
