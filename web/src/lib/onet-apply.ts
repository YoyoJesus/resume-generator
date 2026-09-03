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
		if (edit.kind === 'skill') {
			const result = appendSkill(next, edit.targetId, edit.text);
			next = result.data;
			if (result.path) paths.push(result.path);
			continue;
		}

		// Look the kind up fresh each time: earlier edits can change the arrays.
		const target = bulletTargets(next).find((t) => t.id === edit.targetId);
		if (!target) continue;
		if (edit.kind === 'add_bullet') {
			const result = appendBullet(next, target.kind, edit.targetId, edit.text);
			next = result.data;
			if (result.path) paths.push(result.path);
			continue;
		}

		const key = target.kind === 'experience' ? 'workExperience' : 'projects';
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
