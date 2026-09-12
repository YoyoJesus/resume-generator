import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Server } from '../.svelte-kit/output/server/index.js';
import { manifest } from '../.svelte-kit/output/server/manifest.js';

// Initialize immediately, as the Vercel entrypoint does. A browser top-level-await
// transform on server chunks previously left Server's options undefined here.
const server = new Server(manifest);
await server.init({ env: {} });

for (const [path, method, status, code] of [
	['/api/onet/search?keyword=engineer', 'GET', 502, 'auth'],
	['/api/onet/occupation/15-1252.00', 'GET', 502, 'auth'],
	['/api/extract', 'POST', 400, 'invalid_file'],
	['/api/onet/tailor', 'POST', 400, 'invalid_code'],
	['/api/template/convert', 'POST', 400, 'invalid_file'],
]) {
	test(`production server handles ${method} ${path}`, async () => {
		const response = await server.respond(
			new Request(`https://example.test${path}`, {
				method,
				headers: { origin: 'https://example.test', 'content-type': 'application/json' },
				...(method === 'POST' ? { body: '{}' } : {}),
			}),
			{ getClientAddress: () => '127.0.0.1' },
		);
		assert.equal(response.status, status);
		assert.equal((await response.json()).error.code, code);
	});
}
