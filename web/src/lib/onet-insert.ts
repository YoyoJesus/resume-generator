import type { ResumeData } from './types';
import { generateId } from './resume-utils';

// Pulling an O*NET item into the resume. These are pure: they return a new
// ResumeData plus the dotted field path(s) to highlight, and the caller assigns
// the result. A null path means nothing changed.

export type BulletTargetKind = 'experience' | 'project';

export interface BulletTarget {
	id: string;
	kind: BulletTargetKind;
	label: string;
}

export interface SkillTarget {
	id: string;
	label: string;
}

export function bulletTargets(data: ResumeData): BulletTarget[] {
	const experience = data.workExperience.map((w) => ({
		id: w.id,
		kind: 'experience' as const,
		label: [w.title, w.company].filter(Boolean).join(' at ') || 'Untitled experience',
	}));
	const projects = data.projects.map((p) => ({
		id: p.id,
		kind: 'project' as const,
		label: p.name || 'Untitled project',
	}));
	return [...experience, ...projects];
}

export function skillTargets(data: ResumeData): SkillTarget[] {
	return data.skills.map((s) => ({ id: s.id, label: s.category || 'Untitled category' }));
}

export function appendBullet(
	data: ResumeData,
	kind: BulletTargetKind,
	id: string,
	text: string,
): { data: ResumeData; path: string | null } {
	const key = kind === 'experience' ? 'workExperience' : 'projects';
	const entries = data[key];
	const index = entries.findIndex((e) => e.id === id);
	if (index === -1) return { data, path: null };

	const entry = entries[index];
	if (entry.bullets.includes(text)) return { data, path: null };

	const updated = [...entries];
	updated[index] = { ...entry, bullets: [...entry.bullets, text] };

	return {
		data: { ...data, [key]: updated },
		path: `${key}.${index}.bullets.${entry.bullets.length}`,
	};
}

// Skill categories store their skills as one comma-separated string.
function listed(skills: string): string[] {
	return skills
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export function appendSkill(
	data: ResumeData,
	categoryId: string,
	name: string,
): { data: ResumeData; path: string | null } {
	const index = data.skills.findIndex((s) => s.id === categoryId);
	if (index === -1) return { data, path: null };

	const category = data.skills[index];
	const existing = listed(category.skills);
	if (existing.some((s) => s.toLowerCase() === name.toLowerCase())) return { data, path: null };

	const updated = [...data.skills];
	updated[index] = { ...category, skills: [...existing, name].join(', ') };

	return { data: { ...data, skills: updated }, path: `skills.${index}.skills` };
}

export function appendSkillToNewCategory(
	data: ResumeData,
	category: string,
	name: string,
): { data: ResumeData; paths: string[] } {
	const index = data.skills.length;
	const skills = [...data.skills, { id: generateId(), category, skills: name }];

	return { data: { ...data, skills }, paths: [`skills.${index}.category`, `skills.${index}.skills`] };
}
