import type { ResumeData } from './types';
import type { TailorEdit } from './onet-types';
import { appendBullet, appendSkill, bulletTargets } from './onet-insert';

// Apply a batch of AI-proposed edits in order, reusing the same append helpers
// the manual "+ Add" buttons use so both paths behave identically (including
// duplicate suppression). Returns the new resume and the dotted paths to
// highlight. An edit whose target has since disappeared is skipped rather than
// aborting the batch.
export function applyTailorEdits(data: ResumeData, edits: TailorEdit[]): { data: ResumeData; paths: string[] } {
	let next = data;
	const paths: string[] = [];

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

		const result = appendBullet(next, target.kind, edit.targetId, edit.text);
		next = result.data;
		if (result.path) paths.push(result.path);
	}

	return { data: next, paths };
}
