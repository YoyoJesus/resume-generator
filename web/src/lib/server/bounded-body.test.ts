import { describe, expect, it, vi } from 'vitest';
import { readBoundedBody, RequestBodyTooLargeError } from './bounded-body';

describe('readBoundedBody', () => {
	it('preserves a UTF-8 body split across chunks', async () => {
		const bytes = new TextEncoder().encode('{"name":"résumé"}');
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(bytes.slice(0, 11));
				controller.enqueue(bytes.slice(11));
				controller.close();
			},
		});
		const request = new Request('https://example.test', {
			method: 'POST',
			body: stream,
			duplex: 'half',
		} as RequestInit);
		expect(await readBoundedBody(request, bytes.length)).toBe('{"name":"résumé"}');
	});

	it('cancels an oversized stream as soon as the limit is exceeded', async () => {
		const cancel = vi.fn();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array(6));
				controller.enqueue(new Uint8Array(6));
			},
			cancel,
		});
		const request = new Request('https://example.test', {
			method: 'POST',
			body: stream,
			duplex: 'half',
		} as RequestInit);

		await expect(readBoundedBody(request, 10)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
		expect(cancel).toHaveBeenCalledOnce();
	});
});
