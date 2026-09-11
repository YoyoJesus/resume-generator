import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { mapOpenAIError } from '$lib/server/extraction';
import { DOCX_TEMPLATE_MAX_LABEL } from '$lib/template-limits';
import {
	DOCX_TEMPLATE_MAX_BYTES,
	extractDocxTemplateContext,
	generateTypstTemplateFromDesign,
	TEMPLATE_CONVERSION_MODEL,
	TEMPLATE_CONVERSION_PROMPT,
	TEMPLATE_DESIGN_SCHEMA,
	type TemplateDesign,
} from '$lib/server/template-conversion';

export const prerender = false;
// Bound AI conversion for Vercel Hobby projects even when Fluid Compute is disabled.
export const config = { maxDuration: 60 };

function error(code: string, message: string, status: number): Response {
	return json({ error: { code, message } }, { status });
}

export const POST: RequestHandler = async ({ request }) => {
	let file: File | null = null;
	try {
		const form = await request.formData();
		const candidate = form.get('file');
		if (candidate instanceof File) file = candidate;
	} catch {
		return error('invalid_file', 'Choose a valid DOCX template.', 400);
	}

	if (!file || !file.name.toLowerCase().endsWith('.docx')) {
		return error('invalid_file', 'Choose a Word template ending in .docx.', 400);
	}
	if (file.size > DOCX_TEMPLATE_MAX_BYTES) {
		return error('file_too_large', `The DOCX template must be ${DOCX_TEMPLATE_MAX_LABEL} or smaller.`, 413);
	}

	let buffer: Buffer;
	let ooxml: string;
	try {
		buffer = Buffer.from(await file.arrayBuffer());
		ooxml = await extractDocxTemplateContext(buffer);
	} catch {
		return error('parse_failed', "Couldn't read that DOCX template. Try saving it again in Microsoft Word.", 422);
	}

	try {
		if (!env.OPENAI_API_KEY) return error('auth', 'AI service is misconfigured (API key).', 502);
		const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
		const response = await client.responses.create({
			model: TEMPLATE_CONVERSION_MODEL,
			instructions: TEMPLATE_CONVERSION_PROMPT,
			input: [
				{
					role: 'user',
					content: [
						{
							type: 'input_text',
							text: `Convert this DOCX resume template. Here are its relevant OOXML layout, text, and style parts:\n\n${ooxml}`,
						},
					],
				},
			],
			reasoning: { effort: 'medium' },
			max_output_tokens: 2_000,
			store: false,
			text: {
				format: {
					type: 'json_schema',
					name: 'template_design',
					strict: true,
					schema: TEMPLATE_DESIGN_SCHEMA as unknown as Record<string, unknown>,
				},
			},
		});

		if (!response.output_text) throw new SyntaxError('AI response was empty.');
		const design = JSON.parse(response.output_text) as TemplateDesign;
		const source = generateTypstTemplateFromDesign(design);
		const name = file.name.replace(/\.docx$/i, '.typ');
		return json({ data: { name, source } });
	} catch (cause) {
		console.error('TEMPLATE_CONVERSION_DEBUG', cause);
		if (cause instanceof SyntaxError) {
			return error('conversion_failed', "AI couldn't create a compatible Typst template. Please try again.", 422);
		}
		const mapped = mapOpenAIError(cause);
		return error(mapped.code, mapped.message, mapped.status);
	}
};
