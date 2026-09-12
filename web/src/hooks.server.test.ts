import { expect, it, vi } from 'vitest';
import { handle } from './hooks.server';
it('guards API routes before resolving them while leaving pages accessible', async () => {
	const resolve = vi.fn().mockResolvedValue(new Response('ok'));
	const event = (path: string) => ({
		url: new URL(path, 'https://example.test'),
		request: new Request(new URL(path, 'https://example.test'), { headers: { origin: 'https://foreign.test' } }),
		getClientAddress: () => 'test-ip',
	});
	const response = await handle({ event: event('/api/extract'), resolve } as never);
	expect(response.status).toBe(403);
	expect(resolve).not.toHaveBeenCalled();
	expect((await handle({ event: event('/'), resolve } as never)).status).toBe(200);
});
