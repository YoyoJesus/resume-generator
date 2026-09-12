export class RequestBodyTooLargeError extends Error {}

/** Reads a request body while enforcing its byte ceiling before buffering the full payload. */
export async function readBoundedBytes(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
	if (Number(request.headers.get('content-length')) > maxBytes) {
		void request.body?.cancel().catch(() => undefined);
		throw new RequestBodyTooLargeError(`Request body exceeds ${maxBytes} bytes.`);
	}
	if (!request.body) return new Uint8Array();
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxBytes) {
				void reader.cancel().catch(() => undefined);
				throw new RequestBodyTooLargeError(`Request body exceeds ${maxBytes} bytes.`);
			}
			chunks.push(value);
		}
		const bytes = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return bytes;
	} finally {
		reader.releaseLock();
	}
}

export async function readBoundedBody(request: Request, maxBytes: number): Promise<string> {
	return new TextDecoder().decode(await readBoundedBytes(request, maxBytes));
}
