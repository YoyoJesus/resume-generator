import type { ResumeData } from '$lib/types';
import type { OnetOccupation, TailorEdit } from '$lib/onet-types';
import { bulletTargets, skillTargets } from '$lib/onet-insert';

// A ceiling on how much one click can change, so a runaway response can't
// rewrite the whole resume in a single pass.
export const MAX_EDITS = 12;

export interface AllowedTargets {
	bullets: Set<string>;
	skills: Set<string>;
}

export const TAILOR_PROMPT = [
	'You help tailor a resume toward a specific occupation using O*NET reference data.',
	'You are given the candidate resume and the O*NET data for the target occupation.',
	"Choose the items most worth adding, rewrite each one in the resume's existing voice and tense, and assign it to a target.",
	'',
	'Grounding rules, in order of importance:',
	'1. Never claim experience the resume does not already evidence. If the resume shows no management, do not add a bullet about leading a team. If it shows no experience with a technology, do not add that technology.',
	'2. Rewrite; do not paste. Match the phrasing, tense and level of detail of the bullets already in that entry, and lead with a strong verb.',
	'3. Prefer a small number of strong, well-grounded additions over filling every slot. Returning few edits, or none, is a correct answer when the resume and the occupation do not overlap.',
	'4. Do not duplicate something the entry already says in different words.',
	'',
	`Return at most ${MAX_EDITS} edits.`,
	'Every targetId MUST be copied exactly from the target lists below; never invent one.',
	'Use kind "bullet" with an experience or project id, and kind "skill" with a skill category id.',
	'A "skill" edit\'s text must be a short skill or technology name, not a sentence.',
].join('\n');

// Strict json_schema for the OpenAI Responses API.
export const TAILOR_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['edits'],
	properties: {
		edits: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['kind', 'targetId', 'text'],
				properties: {
					kind: { type: 'string', enum: ['bullet', 'skill'] },
					targetId: { type: 'string' },
					text: { type: 'string' },
				},
			},
		},
	},
} as const;

function scaleLines(label: string, items: { name: string }[]): string[] {
	return items.length ? [`${label}: ${items.map((i) => i.name).join(', ')}`] : [];
}

// Build the model input. Only resume content that could justify a bullet is
// included; contact details are deliberately left out since they can't inform
// the rewrite and there's no reason to send them.
export function buildTailorInput(
	resume: ResumeData,
	occupation: OnetOccupation,
): { prompt: string; allowed: AllowedTargets } {
	const bullets = bulletTargets(resume);
	const skills = skillTargets(resume);

	const lines: string[] = [TAILOR_PROMPT, '', '=== TARGETS: experience and project entries (kind "bullet") ==='];

	for (const target of bullets) {
		const entry =
			resume.workExperience.find((w) => w.id === target.id) ?? resume.projects.find((p) => p.id === target.id);
		const existing = entry?.bullets.filter(Boolean) ?? [];
		lines.push(`id=${target.id} | ${target.label}`);
		lines.push(existing.length ? existing.map((b) => `    - ${b}`).join('\n') : '    (no bullets yet)');
	}

	lines.push('', '=== TARGETS: skill categories (kind "skill") ===');
	for (const target of skills) {
		const category = resume.skills.find((s) => s.id === target.id);
		lines.push(`id=${target.id} | ${target.label} | currently: ${category?.skills || '(empty)'}`);
	}

	if (resume.profile.summary.trim()) {
		lines.push('', '=== Candidate profile summary ===', resume.profile.summary.trim());
	}
	if (resume.education.length) {
		lines.push(
			'',
			'=== Education ===',
			...resume.education.map((e) => `- ${[e.degree, e.major, e.institution].filter(Boolean).join(', ')}`),
		);
	}

	lines.push(
		'',
		`=== TARGET OCCUPATION: ${occupation.title} (${occupation.code}) ===`,
		occupation.description,
		'',
		'Tasks:',
		...occupation.tasks.map((t) => `- ${t.text}`),
	);

	if (occupation.detailedWorkActivities.length) {
		lines.push('', 'Work activities:', ...occupation.detailedWorkActivities.map((a) => `- ${a.text}`));
	}
	if (occupation.technologySkills.length) {
		lines.push(
			'',
			'Technology:',
			...occupation.technologySkills.map((c) => `- ${c.category}: ${c.examples.map((e) => e.name).join(', ')}`),
		);
	}
	lines.push(
		...scaleLines('Skills', occupation.skills),
		...scaleLines('Knowledge', occupation.knowledge),
		...scaleLines('Abilities', occupation.abilities),
	);

	return {
		prompt: lines.join('\n'),
		allowed: { bullets: new Set(bullets.map((b) => b.id)), skills: new Set(skills.map((s) => s.id)) },
	};
}

// The model can return ids it was never offered, duplicate suggestions, or more
// edits than asked for. Everything that isn't provably addressable is dropped
// rather than failing the batch, so one bad entry can't lose the good ones.
export function validateEdits(raw: unknown, allowed: AllowedTargets): TailorEdit[] {
	const list = (raw as { edits?: unknown })?.edits;
	if (!Array.isArray(list)) return [];

	const out: TailorEdit[] = [];
	const seen = new Set<string>();

	for (const item of list) {
		if (out.length >= MAX_EDITS) break;

		const { kind, targetId, text } = (item ?? {}) as Record<string, unknown>;
		if (kind !== 'bullet' && kind !== 'skill') continue;
		if (typeof targetId !== 'string' || typeof text !== 'string') continue;

		const trimmed = text.trim();
		if (!trimmed) continue;

		const pool = kind === 'bullet' ? allowed.bullets : allowed.skills;
		if (!pool.has(targetId)) continue;

		const key = `${kind}:${targetId}:${trimmed.toLowerCase()}`;
		if (seen.has(key)) continue;
		seen.add(key);

		out.push({ kind, targetId, text: trimmed });
	}

	return out;
}
