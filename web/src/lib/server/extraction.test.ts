import { describe, it, expect } from 'vitest';
import { mapOpenAIError } from './extraction';

describe('mapOpenAIError', () => {
	it('maps insufficient_quota 429 to quota_exceeded', () => {
		const r = mapOpenAIError({ status: 429, code: 'insufficient_quota' });
		expect(r.code).toBe('quota_exceeded');
		expect(r.status).toBe(429);
	});

	it('maps generic 429 to rate_limited', () => {
		expect(mapOpenAIError({ status: 429 }).code).toBe('rate_limited');
	});

	it('maps 401 to auth', () => {
		expect(mapOpenAIError({ status: 401 }).code).toBe('auth');
	});

	it('maps 403 to auth', () => {
		expect(mapOpenAIError({ status: 403 }).code).toBe('auth');
	});

	it('maps 500 to upstream_unavailable', () => {
		expect(mapOpenAIError({ status: 503 }).code).toBe('upstream_unavailable');
	});

	it('maps a connection error (no status) to upstream_unavailable', () => {
		expect(mapOpenAIError(new Error('socket hang up')).code).toBe('upstream_unavailable');
	});

	it('falls back to unknown', () => {
		expect(mapOpenAIError({ status: 418 }).code).toBe('unknown');
	});

	it('always includes a non-empty human message', () => {
		expect(mapOpenAIError({ status: 429 }).message.length).toBeGreaterThan(0);
	});
});
