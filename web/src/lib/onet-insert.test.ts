import { describe, it, expect } from 'vitest';
import { appendBullet, appendSkill, appendSkillToNewCategory, bulletTargets, skillTargets } from './onet-insert';
import { defaultResumeData } from './types';
import type { ResumeData } from './types';

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
				bullets: ['Shipped the thing.'],
			},
			{
				id: 'w2',
				title: 'Intern',
				company: 'Foo',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [],
			},
		],
		projects: [{ id: 'p1', name: 'Resume Builder', stack: '', url: '', award: '', bullets: [] }],
		skills: [
			{ id: 's1', category: 'Languages', skills: 'Python, TypeScript' },
			{ id: 's2', category: 'Tools', skills: '' },
		],
	};
}

describe('bulletTargets', () => {
	it('lists work experience and projects with labels a user can tell apart', () => {
		expect(bulletTargets(seed())).toEqual([
			{ id: 'w1', kind: 'experience', label: 'Software Engineer at Acme' },
			{ id: 'w2', kind: 'experience', label: 'Intern at Foo' },
			{ id: 'p1', kind: 'project', label: 'Resume Builder' },
		]);
	});

	it('falls back to a placeholder label for an unnamed entry', () => {
		const data = seed();
		data.workExperience[0].title = '';
		data.workExperience[0].company = '';
		expect(bulletTargets(data)[0].label).toBe('Untitled experience');
	});

	it('returns nothing when the resume has no entries to insert into', () => {
		expect(bulletTargets(structuredClone(defaultResumeData))).toEqual([]);
	});
});

describe('skillTargets', () => {
	it('lists existing skill categories', () => {
		expect(skillTargets(seed())).toEqual([
			{ id: 's1', label: 'Languages' },
			{ id: 's2', label: 'Tools' },
		]);
	});
});

describe('appendBullet', () => {
	it('appends to the chosen experience entry and reports its highlight path', () => {
		const { data, path } = appendBullet(seed(), 'experience', 'w1', 'Modify existing software.');

		expect(data.workExperience[0].bullets).toEqual(['Shipped the thing.', 'Modify existing software.']);
		expect(path).toBe('workExperience.0.bullets.1');
	});

	it('appends to a project rather than an experience when asked', () => {
		const { data, path } = appendBullet(seed(), 'project', 'p1', 'Test software performance.');

		expect(data.projects[0].bullets).toEqual(['Test software performance.']);
		expect(path).toBe('projects.0.bullets.0');
	});

	it('leaves every other entry untouched', () => {
		const before = seed();
		const { data } = appendBullet(before, 'experience', 'w1', 'New bullet.');

		expect(data.workExperience[1]).toEqual(before.workExperience[1]);
		expect(data.projects).toEqual(before.projects);
		expect(data.skills).toEqual(before.skills);
	});

	it('does not duplicate a bullet that is already on the entry', () => {
		const { data, path } = appendBullet(seed(), 'experience', 'w1', 'Shipped the thing.');

		expect(data.workExperience[0].bullets).toEqual(['Shipped the thing.']);
		expect(path).toBeNull();
	});

	it('returns the resume unchanged when the target id is unknown', () => {
		const before = seed();
		const { data, path } = appendBullet(before, 'experience', 'nope', 'Orphan bullet.');

		expect(data).toEqual(before);
		expect(path).toBeNull();
	});
});

describe('appendSkill', () => {
	it('appends to a comma-separated category', () => {
		const { data, path } = appendSkill(seed(), 's1', 'Git');

		expect(data.skills[0].skills).toBe('Python, TypeScript, Git');
		expect(path).toBe('skills.0.skills');
	});

	it('does not leave a leading comma when the category was empty', () => {
		const { data } = appendSkill(seed(), 's2', 'Docker');
		expect(data.skills[1].skills).toBe('Docker');
	});

	it('ignores a skill already listed in that category, case-insensitively', () => {
		const { data, path } = appendSkill(seed(), 's1', 'python');

		expect(data.skills[0].skills).toBe('Python, TypeScript');
		expect(path).toBeNull();
	});

	it('returns the resume unchanged when the category id is unknown', () => {
		const before = seed();
		const { data, path } = appendSkill(before, 'nope', 'Git');

		expect(data).toEqual(before);
		expect(path).toBeNull();
	});
});

describe('appendSkillToNewCategory', () => {
	it('creates the category with the skill in it and highlights both fields', () => {
		const { data, paths } = appendSkillToNewCategory(seed(), 'Cloud', 'Kubernetes');

		expect(data.skills).toHaveLength(3);
		expect(data.skills[2]).toMatchObject({ category: 'Cloud', skills: 'Kubernetes' });
		expect(data.skills[2].id).toBeTruthy();
		expect(paths).toEqual(['skills.2.category', 'skills.2.skills']);
	});

	it('leaves existing categories untouched', () => {
		const before = seed();
		const { data } = appendSkillToNewCategory(before, 'Cloud', 'Kubernetes');
		expect(data.skills.slice(0, 2)).toEqual(before.skills);
	});
});
