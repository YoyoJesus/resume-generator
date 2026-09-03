import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { MODEL, mapOpenAIError, extractError } from '$lib/server/extraction';
import { fetchOccupation, isValidOnetCode, onetError } from '$lib/server/onet';
import { onetFail, onetKey } from '$lib/server/onet-route';
import { buildTailorInput, validateEdits, TAILOR_SCHEMA } from '$lib/server/tailor';
import type { ResumeData } from '$lib/types';
import type { ExtractError } from '$lib/server/extraction';

export const prerender = false;

// Same { error: { code, message } } envelope the other endpoints use.
function fail(e: ExtractError): Response {
	return json({ error: { code: e.code, message: e.message } }, { status: e.status });
}

// Personalised to the caller's resume, so unlike the other O*NET routes this
// one must not be cached at the edge.
export const POST: RequestHandler = async ({ request }) => {
	let body: { resume?: ResumeData; code?: string };
	try {
		body = await request.json();
	} catch {
		return onetFail(onetError('invalid_code'));
	}

	const code = body.code ?? '';
	if (!isValidOnetCode(code)) return onetFail(onetError('invalid_code'));
	if (!body.resume || typeof body.resume !== 'object') return onetFail(onetError('invalid_code'));

	const key = onetKey();
	if (!key) return onetFail(onetError('auth'));
	if (!env.OPENAI_API_KEY) return fail(extractError('auth'));

	// Fetch the occupation server-side rather than trusting a client-supplied
	// copy; the edge cache means this is usually already warm.
	let occupation;
	try {
		occupation = await fetchOccupation(code, key);
	} catch (err) {
		return onetFail(err);
	}

	const { prompt, allowed } = buildTailorInput(body.resume, occupation);
	if (allowed.bullets.size === 0 && allowed.skills.size === 0) {
		return json({ edits: [], reason: 'no_targets' });
	}

	try {
		const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
		const response = await client.responses.create({
			model: MODEL,
			input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
			reasoning: { effort: 'medium' },
			text: {
				format: {
					type: 'json_schema',
					name: 'tailor_edits',
					strict: true,
					schema: TAILOR_SCHEMA as unknown as Record<string, unknown>,
				},
			},
		});

		const raw = response.output_text;
		if (!raw) return fail(extractError('parse_failed'));

		return json({ edits: validateEdits(JSON.parse(raw), allowed) });
	} catch (err) {
		if (err instanceof SyntaxError) return fail(extractError('parse_failed'));
		return fail(mapOpenAIError(err));
	}
};
