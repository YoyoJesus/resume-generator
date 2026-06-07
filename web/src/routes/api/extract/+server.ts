import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import {
	MODEL,
	RESUME_SCHEMA,
	EXTRACTION_PROMPT,
	mapOpenAIError,
	extractError,
	type ExtractError,
} from '$lib/server/extraction';
import type { ExtractedResume } from '$lib/types';

// This endpoint is dynamic (the root layout sets prerender=true for pages).
export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024;

function fail(e: ExtractError): Response {
	return json({ error: { code: e.code, message: e.message } }, { status: e.status });
}

function extOf(name: string): string {
	const i = name.lastIndexOf('.');
	return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export const POST: RequestHandler = async ({ request }) => {
	let file: File | null = null;
	try {
		const form = await request.formData();
		const f = form.get('file');
		if (f instanceof File) file = f;
	} catch {
		return fail(extractError('invalid_file'));
	}

	if (!file) return fail(extractError('invalid_file'));
	if (file.size > MAX_BYTES) return fail(extractError('file_too_large'));

	const ext = extOf(file.name);
	if (!['pdf', 'docx', 'txt'].includes(ext)) return fail(extractError('invalid_file'));

	const client = new OpenAI({ apiKey: OPENAI_API_KEY });

	// Build the user content depending on file type.
	let content: OpenAI.Responses.ResponseInputContent[];
	try {
		if (ext === 'pdf') {
			const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
			content = [
				{ type: 'input_text', text: EXTRACTION_PROMPT },
				{
					type: 'input_file',
					filename: file.name,
					file_data: `data:application/pdf;base64,${base64}`,
				},
			];
		} else {
			let text: string;
			if (ext === 'docx') {
				const buffer = Buffer.from(await file.arrayBuffer());
				text = (await mammoth.extractRawText({ buffer })).value;
			} else {
				text = await file.text();
			}
			if (!text.trim()) return fail(extractError('parse_failed'));
			content = [{ type: 'input_text', text: `${EXTRACTION_PROMPT}\n\nRESUME:\n${text}` }];
		}
	} catch {
		return fail(extractError('parse_failed'));
	}

	// Call OpenAI with structured output.
	try {
		const response = await client.responses.create({
			model: MODEL,
			input: [{ role: 'user', content }],
			reasoning: { effort: 'medium' },
			text: {
				format: {
					type: 'json_schema',
					name: 'resume',
					strict: true,
					schema: RESUME_SCHEMA as unknown as Record<string, unknown>,
				},
			},
		});

		const raw = response.output_text;
		if (!raw) return fail(extractError('parse_failed'));

		const data = JSON.parse(raw) as ExtractedResume;
		return json({ data });
	} catch (err) {
		console.error('OPENAI_DEBUG', JSON.stringify({ name: (err as any)?.name, status: (err as any)?.status, code: (err as any)?.code, message: (err as any)?.message, error: (err as any)?.error }, null, 2));
		// SyntaxError from JSON.parse -> parse_failed; otherwise map the OpenAI/network error.
		if (err instanceof SyntaxError) return fail(extractError('parse_failed'));
		return fail(mapOpenAIError(err));
	}
};
