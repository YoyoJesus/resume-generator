import { describe, it, expect } from 'vitest';
import { applyTailorEdits } from './onet-apply';
import { defaultResumeData } from './types';
import type { ResumeData } from './types';
import type { TailorEdit } from './onet-types';

function seed(): ResumeData {
	return {
		...structuredClone(defaultResumeData),
		workExperience: [
			{
				id: 'w1',
				title: 'Software Engineer',
				company: 'Acme',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: true,
				bullets: ['Built an API.'],
			},
		],
		projects: [{ id: 'p1', name: 'Resume Builder', stack: '', url: '', award: '', bullets: [] }],
		skills: [{ id: 's1', category: 'Languages', skills: 'Python' }],
	};
}

const bullet = (targetId: string, text: string): TailorEdit => ({ kind: 'bullet', targetId, text });
const skill = (targetId: string, text: string): TailorEdit => ({ kind: 'skill', targetId, text });

describe('applyTailorEdits', () => {
	it('appends a bullet to the named experience entry', () => {
		const { data, paths } = applyTailorEdits(seed(), [bullet('w1', 'Modified existing software.')]);

		expect(data.workExperience[0].bullets).toEqual(['Built an API.', 'Modified existing software.']);
		expect(paths).toEqual(['workExperience.0.bullets.1']);
	});

	it('routes a bullet to a project when the id is a project', () => {
		const { data, paths } = applyTailorEdits(seed(), [bullet('p1', 'Tested performance.')]);

		expect(data.projects[0].bullets).toEqual(['Tested performance.']);
		expect(paths).toEqual(['projects.0.bullets.0']);
	});

	it('appends a skill to the named category', () => {
		const { data, paths } = applyTailorEdits(seed(), [skill('s1', 'Go')]);

		expect(data.skills[0].skills).toBe('Python, Go');
		expect(paths).toEqual(['skills.0.skills']);
	});

	it('applies several edits across different entries in one pass', () => {
		const { data, paths } = applyTailorEdits(seed(), [
			bullet('w1', 'First added bullet.'),
			bullet('w1', 'Second added bullet.'),
			bullet('p1', 'Project bullet.'),
			skill('s1', 'Rust'),
		]);

		expect(data.workExperience[0].bullets).toEqual(['Built an API.', 'First added bullet.', 'Second added bullet.']);
		expect(data.projects[0].bullets).toEqual(['Project bullet.']);
		expect(data.skills[0].skills).toBe('Python, Rust');
		// Every applied edit reports a distinct highlight path.
		expect(new Set(paths).size).toBe(4);
	});

	it('reports the right index for the second bullet added to one entry', () => {
		const { paths } = applyTailorEdits(seed(), [bullet('w1', 'One.'), bullet('w1', 'Two.')]);
		expect(paths).toEqual(['workExperience.0.bullets.1', 'workExperience.0.bullets.2']);
	});

	it('skips an edit whose target no longer exists without dropping the rest', () => {
		const { data, paths } = applyTailorEdits(seed(), [bullet('ghost', 'Orphan.'), bullet('w1', 'Kept.')]);

		expect(data.workExperience[0].bullets).toEqual(['Built an API.', 'Kept.']);
		expect(paths).toEqual(['workExperience.0.bullets.1']);
	});

	it('skips a duplicate the resume already contains', () => {
		const { data, paths } = applyTailorEdits(seed(), [bullet('w1', 'Built an API.')]);

		expect(data.workExperience[0].bullets).toEqual(['Built an API.']);
		expect(paths).toEqual([]);
	});

	it('leaves the resume untouched when there is nothing to apply', () => {
		const before = seed();
		const { data, paths } = applyTailorEdits(before, []);

		expect(data).toEqual(before);
		expect(paths).toEqual([]);
	});
});
