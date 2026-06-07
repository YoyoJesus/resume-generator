import { describe, it, expect } from 'vitest';
import { buildResumeFromExtraction } from './resume-utils';
import { defaultResumeData } from './types';
import type { ExtractedResume } from './types';

const sample: ExtractedResume = {
	personalInfo: {
		name: 'Ada Lovelace',
		phone: '',
		location: 'London',
		email: 'ada@example.com',
		website: '',
		linkedin: 'adalovelace',
		github: '',
	},
	profile: { summary: 'Mathematician.' },
	education: [
		{
			institution: 'Uni',
			location: 'London',
			degree: 'BSc',
			major: 'Math',
			startDate: '1830-01',
			endDate: '1834-01',
			isPresent: false,
			bullets: ['Top of class'],
		},
	],
	projects: [],
	workExperience: [],
	leadership: [],
	skills: [{ category: 'Languages', skills: 'Analytical Engine' }],
	achievements: [],
};

describe('buildResumeFromExtraction', () => {
	it('copies personal info and profile', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.personalInfo.name).toBe('Ada Lovelace');
		expect(r.profile.summary).toBe('Mathematician.');
	});

	it('assigns a unique id to every array item', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.education[0].id).toBeTruthy();
		expect(r.skills[0].id).toBeTruthy();
		expect(r.education[0].id).not.toBe(r.skills[0].id);
	});

	it('applies default colors, fonts, and section order', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.colors).toEqual(defaultResumeData.colors);
		expect(r.fonts).toEqual(defaultResumeData.fonts);
		expect(r.sectionOrder).toEqual(defaultResumeData.sectionOrder);
	});

	it('preserves extracted bullets', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.education[0].bullets).toEqual(['Top of class']);
	});

	it('does not share array references with defaults', () => {
		const r = buildResumeFromExtraction(sample);
		r.colors.headColor = '#000000';
		expect(defaultResumeData.colors.headColor).not.toBe('#000000');
	});
});
