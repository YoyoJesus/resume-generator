import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { defaultResumeData } from '$lib/types';
import { TEMPLATE_DESIGN_SCHEMA } from './template-conversion';
const mocks = vi.hoisted(() => ({ create: vi.fn(), options: vi.fn() }));
vi.mock('$env/dynamic/private', () => ({ env: { OPENAI_API_KEY: 'test', ONET_API_KEY: 'test' } }));
vi.mock('openai', () => ({
	default: class {
		responses = { create: mocks.create };
		constructor(options: unknown) {
			mocks.options(options);
		}
	},
}));
import { POST as extract } from '../../routes/api/extract/+server';
import { POST as convert } from '../../routes/api/template/convert/+server';
import { GET as search } from '../../routes/api/onet/search/+server';
import { OPENAI_REQUEST_OPTIONS } from './upstream-limits';
const MAX_EXTRACT_BODY_BYTES = 120_000 * 6 + 16_384;
const MAX_TEMPLATE_BODY_BYTES = 4 * 1024 * 1024 + 64 * 1024;
const text =
	'Software engineer with experience building reliable applications and collaborating with teams to deliver quality products. '.repeat(
		4,
	);
function event(request: Request): never {
	return { request, url: new URL(request.url) } as never;
}
function jsonRequest(body: unknown) {
	return new Request('https://example.test/api/extract', { method: 'POST', body: JSON.stringify(body) });
}
async function docxRequest() {
	const zip = new JSZip();
	zip.file('word/document.xml', '<document>Resume</document>');
	const form = new FormData();
	form.set('file', new File([await zip.generateAsync({ type: 'arraybuffer' })], 'template.docx'));
	return new Request('https://example.test/api/template/convert', { method: 'POST', body: form });
}
beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
describe('bounded upload routes', () => {
	it.each([
		[extract, MAX_EXTRACT_BODY_BYTES],
		[convert, MAX_TEMPLATE_BODY_BYTES],
	] as const)('rejects declared oversized bodies without reading', async (handler, limit) => {
		const request = new Request('https://example.test/api', {
			method: 'POST',
			headers: { 'content-length': String(limit + 1) },
			body: 'small',
		});
		expect((await handler(event(request))).status).toBe(413);
		expect(mocks.create).not.toHaveBeenCalled();
	});
	it.each([
		[extract, MAX_EXTRACT_BODY_BYTES],
		[convert, MAX_TEMPLATE_BODY_BYTES],
	] as const)('rejects streamed oversized bodies without a declared length', async (handler, limit) => {
		const cancel = vi.fn();
		const stream = new ReadableStream({
			start(c) {
				c.enqueue(new Uint8Array(limit + 1));
			},
			cancel,
		});
		const request = new Request('https://example.test/api', {
			method: 'POST',
			body: stream,
			duplex: 'half',
		} as RequestInit);
		expect((await handler(event(request))).status).toBe(413);
		expect(cancel).toHaveBeenCalled();
		expect(mocks.create).not.toHaveBeenCalled();
	});
	it.each([
		null,
		{ filename: 'x'.repeat(256), text },
		{ filename: 'a.txt', text, metrics: [] },
		{ filename: 'a.txt', text, metrics: { method: 'fake' } },
	])('rejects invalid extraction metadata', async (body) => {
		expect((await extract(event(jsonRequest(body)))).status).toBe(400);
		expect(mocks.create).not.toHaveBeenCalled();
	});
	it('maps an OpenAI timeout and configures bounded retries', async () => {
		mocks.create.mockRejectedValue(new Error('timeout'));
		const response = await extract(event(jsonRequest({ filename: 'a.txt', text })));
		expect(await response.json()).toMatchObject({ error: { code: 'upstream_unavailable' } });
		expect(mocks.options).toHaveBeenCalledWith({ apiKey: 'test', ...OPENAI_REQUEST_OPTIONS });
	});
	it('maps an O*NET timeout to a structured error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')));
		const response = await search(event(new Request('https://example.test/api/onet/search?keyword=engineer')));
		expect(await response.json()).toMatchObject({ error: { code: 'upstream_unavailable' } });
		expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
	});
});
describe('template model output', () => {
	it.each([
		{ status: 'completed', output_text: 'null' },
		{ status: 'completed', output_text: '{}' },
		{ status: 'completed', output_text: 'invalid' },
		{ status: 'completed', output_text: 'x'.repeat(16_385) },
		{ status: 'incomplete', output_text: '{}' },
	])('returns conversion_failed for invalid or incomplete output', async (output) => {
		mocks.create.mockResolvedValue(output);
		const response = await convert(event(await docxRequest()));
		expect(response.status).toBe(422);
		expect(await response.json()).toMatchObject({ error: { code: 'conversion_failed' } });
	});
	it('logs only upstream status and code', async () => {
		mocks.create.mockRejectedValue({
			status: 500,
			code: 'server_error',
			body: 'private document',
			headers: { secret: 'private' },
		});
		const response = await convert(event(await docxRequest()));
		expect(response.status).toBe(502);
		expect(console.error).toHaveBeenCalledWith('OpenAI template conversion failed', {
			status: 500,
			code: 'server_error',
		});
	});
});

it('extracts valid content and ignores client quality claims', async () => {
	mocks.create.mockResolvedValue({ output_text: JSON.stringify(defaultResumeData) });
	const response = await extract(
		event(jsonRequest({ filename: 'a'.repeat(251) + '.txt', text, metrics: { method: 'ocr', score: 0 } })),
	);
	expect(response.status).toBe(200);
	expect(mocks.create.mock.calls[0][0].store).toBe(false);
	expect(mocks.create.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
	const rejected = await extract(
		event(jsonRequest({ filename: 'a.txt', text: 'short', metrics: { method: 'text', score: 100 } })),
	);
	expect(rejected.status).toBe(422);
	expect(mocks.create).toHaveBeenCalledTimes(1);
});

it('converts a complete valid design with the binary DOCX intact', async () => {
	const design = Object.fromEntries(
		Object.entries(TEMPLATE_DESIGN_SCHEMA.properties).map(([key, schema]) => [
			key,
			schema.type === 'object'
				? { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
				: 'enum' in schema
					? schema.enum[0]
					: schema.type === 'boolean'
						? true
						: schema.type === 'number'
							? 10
							: '112233',
		]),
	);
	mocks.create.mockResolvedValue({ status: 'completed', output_text: JSON.stringify(design) });
	const response = await convert(event(await docxRequest()));
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({
		data: { name: 'template.typ', source: expect.stringContaining('RESUME CONTENT') },
	});
	expect(mocks.create.mock.calls[0][0]).toMatchObject({
		store: false,
		max_output_tokens: 4000,
		reasoning: { effort: 'low' },
	});
	expect(mocks.create.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});

it('enforces the DOCX file limit within an allowed multipart body', async () => {
	const form = new FormData();
	form.set('file', new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.docx'));
	const request = new Request('https://example.test/api/template/convert', { method: 'POST', body: form });
	expect((await convert(event(request))).status).toBe(413);
	expect(mocks.create).not.toHaveBeenCalled();
});
