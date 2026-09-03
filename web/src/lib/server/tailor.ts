import type { ResumeData } from '$lib/types';
import type { OnetOccupation, TailorEdit } from '$lib/onet-types';
import { bulletTargets, skillTargets } from '$lib/onet-insert';
import { estimateOverOnePage } from '$lib/resume-utils';

// A ceiling on how much one click can change, so a runaway response can't
// rewrite the whole resume in a single pass.
export const MAX_EDITS = 12;

export interface AllowedTargets {
	bullets: Set<string>;
	skills: Set<string>;
	fields?: Set<string>;
	bulletCounts?: Map<string, number>;
}

export const TAILOR_PROMPT = [
	'You actively tailor a resume toward a specific occupation using O*NET reference data.',
	'You are given the candidate resume and the O*NET data for the target occupation.',
	"Choose the strongest relevant changes, rewrite in the resume's existing voice and tense, and assign each to an exact target.",
	'',
	'Grounding rules, in order of importance:',
	'1. Never claim experience the resume does not already evidence. If the resume shows no management, do not add a bullet about leading a team. If it shows no experience with a technology, do not add that technology.',
	'2. Rewrite; do not paste. Match the phrasing, tense and level of detail of the bullets already in that entry, and lead with a strong verb.',
	'3. Prefer a small number of strong, well-grounded changes over filling every slot. Returning few edits, or none, is correct only when the resume and the occupation do not overlap.',
	'4. Do not duplicate something the entry already says in different words.',
	'',
	`Return at most ${MAX_EDITS} edits.`,
	'Every targetId MUST be copied exactly from the target lists below; never invent one.',
	'Use kind "add_bullet" to add a grounded bullet, "rewrite_bullet" to improve an existing bullet, "remove_bullet" to remove an existing bullet, "rewrite_field" to tailor an explicitly listed profile, project, education, leadership, or achievement field, "set_font" to adjust one listed font size, or "skill" with a skill category id.',
	'For rewrite_bullet and remove_bullet, bulletIndex MUST be the zero-based index shown beside that bullet. For add_bullet and skill, bulletIndex MUST be -1.',
	'For rewrite_field and set_font, bulletIndex MUST be -1. set_font text MUST be a numeric point size within the listed bounds, and should be used to help an overlong resume fit one page.',
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
				required: ['kind', 'targetId', 'text', 'bulletIndex'],
				properties: {
					kind: {
						type: 'string',
						enum: ['add_bullet', 'rewrite_bullet', 'remove_bullet', 'rewrite_field', 'set_font', 'skill'],
					},
					targetId: { type: 'string' },
					text: { type: 'string' },
					bulletIndex: { type: 'integer', minimum: -1 },
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
	const bullets = [
		...bulletTargets(resume),
		...resume.education.map((e) => ({
			id: e.id,
			kind: 'education' as const,
			label: `${e.degree} at ${e.institution}`,
		})),
		...resume.leadership.map((e) => ({
			id: e.id,
			kind: 'leadership' as const,
			label: `${e.title} at ${e.organization}`,
		})),
	];
	const skills = skillTargets(resume);
	const fields = resume.profile.summary.trim() ? ['profile'] : [];
	const fontBounds = 'baseSize=6-14, nameSize=14-32, headingSize=10-24, contactSize=7-16';

	const isOverOnePage = estimateOverOnePage(resume);
	const lines: string[] = [
		TAILOR_PROMPT,
		'',
		`=== CURRENT FONT CONTROLS ===\n${fontBounds}\n${Object.entries(resume.fonts)
			.map(([key, value]) => `${key}=${value}pt`)
			.join(', ')}`,
		'',
		isOverOnePage
			? '=== LENGTH MODE ===\nThe output must fit on exactly one side of one A4 page. This resume is estimated to exceed one page. Do not add content unless it replaces more text. Prioritize concise rewrites, removals, and font-size reductions for generic, repetitive, or least relevant content until it fits.'
			: '=== LENGTH MODE ===\nThis resume is within the one-page target. Make concrete, grounded improvements; use add_bullet only when it adds job-relevant evidence not already stated.',
		'',
		'=== TARGETS: all resume entries (bullet kinds) ===',
	];

	for (const target of bullets) {
		const entry =
			resume.workExperience.find((w) => w.id === target.id) ??
			resume.projects.find((p) => p.id === target.id) ??
			resume.education.find((e) => e.id === target.id) ??
			resume.leadership.find((e) => e.id === target.id);
		const existing = entry?.bullets.filter(Boolean) ?? [];
		lines.push(`id=${target.id} | ${target.label}`);
		lines.push(existing.length ? existing.map((b, index) => `    [${index}] ${b}`).join('\n') : '    (no bullets yet)');
	}

	lines.push('', '=== TARGETS: skill categories (kind "skill") ===');
	for (const target of skills) {
		const category = resume.skills.find((s) => s.id === target.id);
		lines.push(`id=${target.id} | ${target.label} | currently: ${category?.skills || '(empty)'}`);
	}

	if (resume.profile.summary.trim()) {
		lines.push('', '=== Editable profile summary ===', 'id=profile', resume.profile.summary.trim());
	}
	for (const project of resume.projects) {
		if (project.stack.trim()) {
			fields.push(`project-stack:${project.id}`);
			lines.push(
				'',
				`=== Editable project field ===`,
				`id=project-stack:${project.id}`,
				`Project: ${project.name}`,
				`Stack: ${project.stack}`,
			);
		}
	}
	for (const achievement of resume.achievements) {
		if (achievement.description.trim()) {
			fields.push(`achievement-description:${achievement.id}`);
			lines.push(
				'',
				`=== Editable achievement field ===`,
				`id=achievement-description:${achievement.id}`,
				`${achievement.title} (${achievement.date})`,
				achievement.description,
			);
		}
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
		allowed: {
			bullets: new Set(bullets.map((b) => b.id)),
			skills: new Set(skills.map((s) => s.id)),
			fields: new Set([...fields, 'baseSize', 'nameSize', 'headingSize', 'contactSize']),
			bulletCounts: new Map(
				bullets.map((target) => {
					const entry =
						resume.workExperience.find((work) => work.id === target.id) ??
						resume.projects.find((project) => project.id === target.id) ??
						resume.education.find((education) => education.id === target.id) ??
						resume.leadership.find((leadership) => leadership.id === target.id);
					return [target.id, entry?.bullets.length ?? 0];
				}),
			),
		},
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

		const { kind, targetId, text, bulletIndex } = (item ?? {}) as Record<string, unknown>;
		if (
			kind !== 'add_bullet' &&
			kind !== 'rewrite_bullet' &&
			kind !== 'remove_bullet' &&
			kind !== 'rewrite_field' &&
			kind !== 'set_font' &&
			kind !== 'skill'
		)
			continue;
		if (
			typeof targetId !== 'string' ||
			typeof text !== 'string' ||
			typeof bulletIndex !== 'number' ||
			!Number.isInteger(bulletIndex)
		)
			continue;

		const trimmed = text.trim();
		if (kind !== 'remove_bullet' && !trimmed) continue;
		if (
			(kind === 'add_bullet' || kind === 'skill' || kind === 'rewrite_field' || kind === 'set_font') &&
			bulletIndex !== -1
		)
			continue;
		if ((kind === 'rewrite_bullet' || kind === 'remove_bullet') && bulletIndex < 0) continue;

		if (kind === 'set_font') {
			const bounds: Record<string, [number, number]> = {
				baseSize: [6, 14],
				nameSize: [14, 32],
				headingSize: [10, 24],
				contactSize: [7, 16],
			};
			const value = Number(trimmed);
			const range = bounds[targetId];
			if (!range || !Number.isFinite(value) || value < range[0] || value > range[1]) continue;
		} else if (kind === 'rewrite_field') {
			if (!allowed.fields?.has(targetId)) continue;
		} else {
			const pool = kind === 'skill' ? allowed.skills : allowed.bullets;
			if (!pool.has(targetId)) continue;
		}
		if (
			(kind === 'rewrite_bullet' || kind === 'remove_bullet') &&
			allowed.bulletCounts !== undefined &&
			bulletIndex >= (allowed.bulletCounts.get(targetId) ?? 0)
		)
			continue;

		const key = `${kind}:${targetId}:${bulletIndex}:${trimmed.toLowerCase()}`;
		if (seen.has(key)) continue;
		seen.add(key);

		out.push({ kind, targetId, text: trimmed, bulletIndex });
	}

	return out;
}
