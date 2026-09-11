import type { ResumeData } from './types';
import type { TailorEdit } from './onet-types';
import { appendBullet, appendSkill, bulletTargets } from './onet-insert';

// Apply a batch of AI-proposed edits in order, reusing the same append helpers
// the manual "+ Add" buttons use so both paths behave identically (including
// duplicate suppression). Returns the new resume and the dotted paths to
// highlight. An edit whose target has since disappeared is skipped rather than
// aborting the batch.
export function applyTailorEdits(
	data: ResumeData,
	edits: TailorEdit[],
): { data: ResumeData; paths: string[]; removed: number } {
	let next = data;
	const paths: string[] = [];
	const bulletHighlights: { targetId: string; index: number }[] = [];
	let removed = 0;
	const bulletPositions = new Map<string, number[]>();

	for (const entries of [data.workExperience, data.projects, data.education, data.leadership]) {
		for (const entry of entries) {
			bulletPositions.set(
				entry.id,
				entry.bullets.flatMap((bullet, index) => (bullet ? [index] : [])),
			);
		}
	}

	const removals = edits
		.filter((edit) => edit.kind === 'remove_bullet')
		.map((edit) => ({ ...edit, originalIndex: bulletPositions.get(edit.targetId)?.[edit.bulletIndex] }))
		.filter((edit): edit is typeof edit & { originalIndex: number } => edit.originalIndex !== undefined)
		.sort((a, b) => (a.targetId === b.targetId ? b.originalIndex - a.originalIndex : 0));

	for (const edit of edits.filter((item) => item.kind !== 'remove_bullet')) {
		if (edit.kind === 'set_font') {
			const key = edit.targetId as keyof ResumeData['fonts'];
			if (!(key in next.fonts)) continue;
			const value = Number(edit.text);
			if (!Number.isFinite(value) || value === next.fonts[key]) continue;
			next = { ...next, fonts: { ...next.fonts, [key]: value } };
			paths.push(`fonts.${key}`);
			continue;
		}
		if (edit.kind === 'rewrite_field') {
			if (edit.targetId === 'profile') {
				if (edit.text === next.profile.summary) continue;
				next = { ...next, profile: { ...next.profile, summary: edit.text } };
				paths.push('profile.summary');
				continue;
			}
			const [section, id] = edit.targetId.split(':');
			if (section === 'project-stack' && id) {
				const index = next.projects.findIndex((entry) => entry.id === id);
				if (index < 0 || next.projects[index].stack === edit.text) continue;
				const projects = [...next.projects];
				projects[index] = { ...projects[index], stack: edit.text };
				next = { ...next, projects };
				paths.push(`projects.${index}.stack`);
			} else if (section === 'achievement-description' && id) {
				const index = next.achievements.findIndex((entry) => entry.id === id);
				if (index < 0 || next.achievements[index].description === edit.text) continue;
				const achievements = [...next.achievements];
				achievements[index] = { ...achievements[index], description: edit.text };
				next = { ...next, achievements };
				paths.push(`achievements.${index}.description`);
			}
			continue;
		}
		if (edit.kind === 'skill') {
			const result = appendSkill(next, edit.targetId, edit.text);
			next = result.data;
			if (result.path) paths.push(result.path);
			continue;
		}

		// Look the kind up fresh each time: earlier edits can change the arrays.
		const target = bulletTargets(next).find((t) => t.id === edit.targetId);
		const other =
			next.education.find((entry) => entry.id === edit.targetId) ??
			next.leadership.find((entry) => entry.id === edit.targetId);
		if (!target && !other) continue;
		if (edit.kind === 'add_bullet') {
			if (!target) continue;
			const result = appendBullet(next, target.kind, edit.targetId, edit.text);
			next = result.data;
			if (result.path) {
				const index = Number(result.path.split('.').at(-1));
				bulletHighlights.push({ targetId: edit.targetId, index });
			}
			continue;
		}

		const key = target
			? target.kind === 'experience'
				? 'workExperience'
				: 'projects'
			: other
				? next.education.some((e) => e.id === other.id)
					? 'education'
					: 'leadership'
				: 'projects';
		const entries = next[key];
		const entryIndex = entries.findIndex((entry) => entry.id === edit.targetId);
		const entry = entries[entryIndex];
		const originalIndex = bulletPositions.get(edit.targetId)?.[edit.bulletIndex];
		if (!entry || originalIndex === undefined || originalIndex >= entry.bullets.length) continue;

		if (edit.kind !== 'rewrite_bullet' || entry.bullets[originalIndex] === edit.text) continue;
		const updated = [...entries];
		updated[entryIndex] = {
			...entry,
			bullets: entry.bullets.map((bullet, index) => (index === originalIndex ? edit.text : bullet)),
		};
		next = { ...next, [key]: updated };
		bulletHighlights.push({ targetId: edit.targetId, index: originalIndex });
	}

	for (const edit of removals) {
		const target = bulletTargets(next).find((item) => item.id === edit.targetId);
		const other =
			next.education.find((entry) => entry.id === edit.targetId) ??
			next.leadership.find((entry) => entry.id === edit.targetId);
		if (!target && !other) continue;
		const key = target
			? target.kind === 'experience'
				? 'workExperience'
				: 'projects'
			: next.education.some((entry) => entry.id === edit.targetId)
				? 'education'
				: 'leadership';
		const entries = next[key];
		const entryIndex = entries.findIndex((entry) => entry.id === edit.targetId);
		const entry = entries[entryIndex];
		if (!entry || edit.originalIndex >= entry.bullets.length) continue;
		const updated = [...entries];
		updated[entryIndex] = {
			...entry,
			bullets: entry.bullets.filter((_, index) => index !== edit.originalIndex),
		};
		next = { ...next, [key]: updated };
		removed++;
	}

	for (const highlight of bulletHighlights) {
		if (removals.some((edit) => edit.targetId === highlight.targetId && edit.originalIndex === highlight.index)) {
			continue;
		}
		const target = bulletTargets(next).find((item) => item.id === highlight.targetId);
		if (!target) continue;
		const key = target.kind === 'experience' ? 'workExperience' : 'projects';
		const entryIndex = next[key].findIndex((entry) => entry.id === highlight.targetId);
		const shift = removals.filter(
			(edit) => edit.targetId === highlight.targetId && edit.originalIndex < highlight.index,
		).length;
		paths.push(`${key}.${entryIndex}.bullets.${highlight.index - shift}`);
	}

	return { data: next, paths, removed };
}
