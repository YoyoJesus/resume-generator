import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { OPENAI_REQUEST_OPTIONS } from '$lib/server/upstream-limits';
import { MODEL, mapOpenAIError, extractError } from '$lib/server/extraction';
import { fetchOccupation, isValidOnetCode, onetError } from '$lib/server/onet';
import { onetFail, onetKey } from '$lib/server/onet-route';
import {
	buildTailorInput,
	isValidTailorResume,
	MAX_TAILOR_BODY_BYTES,
	validateEdits,
	TAILOR_SCHEMA,
} from '$lib/server/tailor';
import type { ExtractError } from '$lib/server/extraction';
import { readBoundedBody, RequestBodyTooLargeError } from '$lib/server/bounded-body';

export const prerender = false;
export const config = { maxDuration: 60 };

// Same { error: { code, message } } envelope the other endpoints use.
function fail(e: ExtractError): Response {
	return json({ error: { code: e.code, message: e.message } }, { status: e.status });
}

// Personalised to the caller's resume, so unlike the other O*NET routes this
// one must not be cached at the edge.
export const POST: RequestHandler = async ({ request }) => {
	const declaredLength = Number(request.headers.get('content-length') ?? 0);
	if (declaredLength > MAX_TAILOR_BODY_BYTES) return onetFail(onetError('invalid_request', 413));

	let body: Record<string, unknown>;
	try {
		const parsed: unknown = JSON.parse(await readBoundedBody(request, MAX_TAILOR_BODY_BYTES));
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return onetFail(onetError('invalid_request'));
		}
		body = parsed as Record<string, unknown>;
	} catch (error) {
		if (error instanceof RequestBodyTooLargeError) return onetFail(onetError('invalid_request', 413));
		return onetFail(onetError('invalid_request'));
	}

	const code = typeof body.code === 'string' ? body.code : '';
	if (!isValidOnetCode(code)) return onetFail(onetError('invalid_code'));
	if (!isValidTailorResume(body.resume)) return onetFail(onetError('invalid_request'));

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
	if (allowed.bullets.size === 0 && allowed.skills.size === 0 && (allowed.fields?.size ?? 0) === 0) {
		return json({ edits: [], reason: 'no_targets' });
	}

	try {
		const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, ...OPENAI_REQUEST_OPTIONS });
		const response = await client.responses.create(
			{
				model: MODEL,
				store: false,
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
			},
			{ signal: AbortSignal.timeout(OPENAI_REQUEST_OPTIONS.timeout) },
		);

		const raw = response.output_text;
		if (!raw) return fail(extractError('parse_failed'));

		return json({ edits: validateEdits(JSON.parse(raw), allowed) });
	} catch (err) {
		if (err instanceof SyntaxError) return fail(extractError('parse_failed'));
		return fail(mapOpenAIError(err));
	}
};
