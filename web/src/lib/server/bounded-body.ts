export class RequestBodyTooLargeError extends Error {}

/** Reads a request body while enforcing its byte ceiling before buffering the full payload. */
export async function readBoundedBody(request: Request, maxBytes: number): Promise<string> {
	if (!request.body) return '';
	const reader = request.body.getReader();
	const decoder = new TextDecoder();
	let size = 0;
	let text = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxBytes) {
				await reader.cancel().catch(() => undefined);
				throw new RequestBodyTooLargeError(`Request body exceeds ${maxBytes} bytes.`);
			}
			text += decoder.decode(value, { stream: true });
		}
		return text + decoder.decode();
	} finally {
		reader.releaseLock();
	}
}
