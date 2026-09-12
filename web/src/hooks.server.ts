import type { Handle } from '@sveltejs/kit';
import { createApiGuard, rateLimitKey } from '$lib/server/api-guard';

const guard = createApiGuard();

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		// SvelteKit throws for adapters that do not implement getClientAddress; those share one bucket.
		let address: string | null = null;
		try {
			address = event.getClientAddress();
		} catch {
			/* Share a bucket when unavailable. */
		}
		const rejection = guard(event.request, event.url, rateLimitKey(address));
		if (rejection) return rejection;
	}
	return resolve(event);
};
