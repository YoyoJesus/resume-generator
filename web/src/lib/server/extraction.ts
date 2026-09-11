import type { ExtractedResume } from '$lib/types';

export const MODEL = 'gpt-5.6-luna';

export type ExtractErrorCode =
	| 'invalid_file'
	| 'file_too_large'
	| 'quota_exceeded'
	| 'rate_limited'
	| 'auth'
	| 'upstream_unavailable'
	| 'parse_failed'
	| 'unknown';

export interface ExtractError {
	code: ExtractErrorCode;
	message: string;
	status: number;
}

const MESSAGES: Record<ExtractErrorCode, string> = {
	invalid_file: 'Unsupported file. Upload a PDF, DOCX, or TXT.',
	file_too_large: 'File is too large (max 5 MB).',
	quota_exceeded: 'AI credit limit reached. Please try again later.',
	rate_limited: 'Too many requests - wait a moment and retry.',
	auth: 'AI service is misconfigured (API key).',
	upstream_unavailable: "Can't reach the AI service. Check your connection and retry.",
	parse_failed: "Couldn't read that file. Try another format.",
	unknown: 'Something went wrong. Please try again.',
};

export function extractError(code: ExtractErrorCode, status?: number): ExtractError {
	const defaultStatus: Record<ExtractErrorCode, number> = {
		invalid_file: 400,
		file_too_large: 413,
		quota_exceeded: 429,
		rate_limited: 429,
		auth: 502,
		upstream_unavailable: 502,
		parse_failed: 422,
		unknown: 500,
	};
	return { code, message: MESSAGES[code], status: status ?? defaultStatus[code] };
}

// Map an error thrown by the OpenAI SDK (or a network failure) to our ExtractError.
export function mapOpenAIError(err: unknown): ExtractError {
	const e = err as { status?: number; code?: string };
	const status = typeof e?.status === 'number' ? e.status : undefined;

	if (status === 429) {
		return e?.code === 'insufficient_quota' ? extractError('quota_exceeded', 429) : extractError('rate_limited', 429);
	}
	if (status === 401 || status === 403) return extractError('auth', 502);
	if (status !== undefined && status >= 500) return extractError('upstream_unavailable', 502);
	if (status === undefined) return extractError('upstream_unavailable', 502); // network/timeout
	return extractError('unknown', 500);
}

export const EXTRACTION_PROMPT = [
	'You extract structured data from a resume.',
	'Fill every field of the provided JSON schema using only information present in the resume.',
	'Use an empty string for any missing text field and an empty array for any missing list.',
	'Format dates as "YYYY-MM" when a month and year are available; otherwise use "YYYY" or an empty string.',
	'Set isPresent to true only when the resume says a role/study is ongoing (e.g. "Present", "Current").',
	'For linkedin and github, return just the username/handle, not the full URL.',
	'Do not invent, guess, or derive any value that is not explicitly present in the resume, especially contact details and profile URLs.',
	'You may organize explicitly stated facts into the most appropriate section, but do not add new facts while doing so.',
].join(' ');

const stringArray = { type: 'array', items: { type: 'string' } } as const;

// Strict json_schema for the OpenAI Responses API. All properties required; no extras.
export const RESUME_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: [
		'personalInfo',
		'profile',
		'education',
		'projects',
		'workExperience',
		'leadership',
		'skills',
		'achievements',
		'clearance',
	],
	properties: {
		personalInfo: {
			type: 'object',
			additionalProperties: false,
			required: ['name', 'phone', 'location', 'email', 'website', 'linkedin', 'github'],
			properties: {
				name: { type: 'string' },
				phone: { type: 'string' },
				location: { type: 'string' },
				email: { type: 'string' },
				website: { type: 'string' },
				linkedin: { type: 'string' },
				github: { type: 'string' },
			},
		},
		profile: {
			type: 'object',
			additionalProperties: false,
			required: ['summary'],
			properties: { summary: { type: 'string' } },
		},
		education: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['institution', 'location', 'degree', 'major', 'startDate', 'endDate', 'isPresent', 'bullets'],
				properties: {
					institution: { type: 'string' },
					location: { type: 'string' },
					degree: { type: 'string' },
					major: { type: 'string' },
					startDate: { type: 'string' },
					endDate: { type: 'string' },
					isPresent: { type: 'boolean' },
					bullets: stringArray,
				},
			},
		},
		projects: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['name', 'stack', 'url', 'award', 'bullets'],
				properties: {
					name: { type: 'string' },
					stack: { type: 'string' },
					url: { type: 'string' },
					award: { type: 'string' },
					bullets: stringArray,
				},
			},
		},
		workExperience: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'company', 'location', 'startDate', 'endDate', 'isPresent', 'bullets'],
				properties: {
					title: { type: 'string' },
					company: { type: 'string' },
					location: { type: 'string' },
					startDate: { type: 'string' },
					endDate: { type: 'string' },
					isPresent: { type: 'boolean' },
					bullets: stringArray,
				},
			},
		},
		leadership: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'organization', 'location', 'startDate', 'endDate', 'isPresent', 'bullets'],
				properties: {
					title: { type: 'string' },
					organization: { type: 'string' },
					location: { type: 'string' },
					startDate: { type: 'string' },
					endDate: { type: 'string' },
					isPresent: { type: 'boolean' },
					bullets: stringArray,
				},
			},
		},
		skills: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['category', 'skills'],
				properties: {
					category: { type: 'string' },
					skills: { type: 'string' },
				},
			},
		},
		achievements: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'date', 'description'],
				properties: {
					title: { type: 'string' },
					date: { type: 'string' },
					description: { type: 'string' },
				},
			},
		},
		clearance: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['level', 'status', 'dateGranted'],
				properties: {
					level: {
						type: 'string',
						enum: ['Confidential', 'Secret', 'Top Secret', 'Top Secret/SCI', 'Public Trust'],
					},
					status: { type: 'string', enum: ['Active', 'Inactive', 'Eligible'] },
					dateGranted: { type: 'string' },
				},
			},
		},
	},
} as const;

function record(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasFields(value: unknown, strings: string[], booleans: string[] = []): boolean {
	return (
		record(value) &&
		strings.every((key) => typeof value[key] === 'string') &&
		booleans.every((key) => typeof value[key] === 'boolean')
	);
}

function hasEntries(value: unknown, strings: string[], booleans: string[] = [], bullets = false): boolean {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				hasFields(item, strings, booleans) &&
				(!bullets ||
					(Array.isArray((item as Record<string, unknown>).bullets) &&
						((item as Record<string, unknown>).bullets as unknown[]).every((bullet) => typeof bullet === 'string'))),
		)
	);
}

/** Validates parsed structured output before it reaches the browser. */
export function validateExtractedResume(value: unknown): ExtractedResume | null {
	if (!record(value)) return null;
	if (
		!hasFields(value.personalInfo, ['name', 'phone', 'location', 'email', 'website', 'linkedin', 'github']) ||
		!hasFields(value.profile, ['summary']) ||
		!hasEntries(
			value.education,
			['institution', 'location', 'degree', 'major', 'startDate', 'endDate'],
			['isPresent'],
			true,
		) ||
		!hasEntries(value.projects, ['name', 'stack', 'url', 'award'], [], true) ||
		!hasEntries(value.workExperience, ['title', 'company', 'location', 'startDate', 'endDate'], ['isPresent'], true) ||
		!hasEntries(value.leadership, ['title', 'organization', 'location', 'startDate', 'endDate'], ['isPresent'], true) ||
		!hasEntries(value.skills, ['category', 'skills']) ||
		!hasEntries(value.achievements, ['title', 'date', 'description']) ||
		!hasEntries(value.clearance, ['level', 'status', 'dateGranted'])
	) {
		return null;
	}

	const validClearance = (value.clearance as Record<string, unknown>[]).every(
		(entry) =>
			['Confidential', 'Secret', 'Top Secret', 'Top Secret/SCI', 'Public Trust'].includes(entry.level as string) &&
			['Active', 'Inactive', 'Eligible'].includes(entry.status as string),
	);
	return validClearance ? (value as unknown as ExtractedResume) : null;
}
