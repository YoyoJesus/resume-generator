import { describe, expect, it } from 'vitest';
import { createApiGuard, RATE_WINDOW_MS, AI_REQUESTS_PER_MINUTE, ONET_REQUESTS_PER_MINUTE } from './api-guard';
const url = new URL('https://example.test/api/extract');
const request = (method = 'POST', headers = {}) => new Request(url, { method, headers });
describe('API guard', () => {
	it.each([
		{ origin: 'https://evil.test' },
		{ origin: 'null' },
		{ 'sec-fetch-site': 'cross-site' },
		{ 'sec-fetch-site': 'same-site' },
	])('rejects foreign browser requests', (headers) => {
		expect(createApiGuard()(request('POST', headers), url, 'ip', 0)?.status).toBe(403);
	});
	it.each(['POST', 'GET'])('limits anonymous %s clients and resets the window', (method) => {
		const guard = createApiGuard();
		const limit = method === 'POST' ? AI_REQUESTS_PER_MINUTE : ONET_REQUESTS_PER_MINUTE;
		for (let i = 0; i < limit; i++) expect(guard(request(method), url, 'ip', 0)).toBeNull();
		const denied = guard(request(method), url, 'ip', 0)!;
		expect(denied.status).toBe(429);
		expect(denied.headers.get('retry-after')).toBe('60');
		expect(denied.headers.get('cache-control')).toBe('no-store');
		expect(guard(request(method), url, 'other', 0)).toBeNull();
		expect(guard(request(method), url, 'ip', RATE_WINDOW_MS)).toBeNull();
	});
	it('accepts same-origin requests and shares AI quota across paths', () => {
		const guard = createApiGuard();
		for (let i = 0; i < AI_REQUESTS_PER_MINUTE; i++)
			expect(guard(request('POST', { origin: url.origin, 'sec-fetch-site': 'same-origin' }), url, 'ip', 0)).toBeNull();
		const other = new URL('/api/template/convert', url);
		expect(guard(new Request(other, { method: 'POST' }), other, 'ip', 0)?.status).toBe(429);
	});
	it('does not let new identities evict existing rate limits', () => {
		const guard = createApiGuard();
		for (let i = 0; i < 10000; i++) guard(request(), url, String(i), 0);
		expect(guard(request(), url, 'overflow', 0)?.status).toBe(429);
		expect(guard(request(), url, 'overflow', RATE_WINDOW_MS)).toBeNull();
	});
});
