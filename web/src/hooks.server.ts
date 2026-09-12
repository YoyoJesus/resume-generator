import type { Handle } from '@sveltejs/kit';
import { createApiGuard } from '$lib/server/api-guard';

const guard = createApiGuard();

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		// Use the adapter's client address, never a caller-supplied forwarding header.
		let address = 'unknown';
		try {
			address = event.getClientAddress();
		} catch {
			/* Share a bucket when unavailable. */
		}
		const rejection = guard(event.request, event.url, address);
		if (rejection) return rejection;
	}
	return resolve(event);
};
