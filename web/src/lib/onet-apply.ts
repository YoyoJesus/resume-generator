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
	let removed = 0;

	for (const edit of edits) {
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
			if (result.path) paths.push(result.path);
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
		if (!entry || edit.bulletIndex < 0 || edit.bulletIndex >= entry.bullets.length) continue;

		if (edit.kind === 'remove_bullet') {
			const updated = [...entries];
			updated[entryIndex] = { ...entry, bullets: entry.bullets.filter((_, index) => index !== edit.bulletIndex) };
			next = { ...next, [key]: updated };
			removed++;
			continue;
		}

		if (edit.kind !== 'rewrite_bullet' || entry.bullets[edit.bulletIndex] === edit.text) continue;
		const updated = [...entries];
		updated[entryIndex] = {
			...entry,
			bullets: entry.bullets.map((bullet, index) => (index === edit.bulletIndex ? edit.text : bullet)),
		};
		next = { ...next, [key]: updated };
		paths.push(`${key}.${entryIndex}.bullets.${edit.bulletIndex}`);
	}

	return { data: next, paths, removed };
}
