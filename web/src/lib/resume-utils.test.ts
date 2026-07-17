import { describe, it, expect } from 'vitest';
import { buildResumeFromExtraction, estimateOverOnePage } from './resume-utils';
import { defaultResumeData } from './types';
import type { ExtractedResume, ResumeData } from './types';

const sample: ExtractedResume = {
	personalInfo: { name: '', phone: '', location: '', email: '', website: '', linkedin: '', github: '' },
	profile: { summary: '' },
	education: [],
	projects: [],
	workExperience: [],
	leadership: [],
	skills: [],
	achievements: [],
	clearance: [{ level: 'Secret', status: 'Active', dateGranted: '2022-06' }],
};

describe('buildResumeFromExtraction clearance handling', () => {
	it('assigns an id to each extracted clearance entry', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.clearance).toHaveLength(1);
		expect(r.clearance[0].id).toBeTruthy();
		expect(r.clearance[0].level).toBe('Secret');
	});

	it('defaults to an empty clearance array when none is extracted', () => {
		const r = buildResumeFromExtraction({ ...sample, clearance: [] });
		expect(r.clearance).toEqual([]);
	});
});

describe('estimateOverOnePage clearance weight', () => {
	function baseData(): ResumeData {
		return structuredClone(defaultResumeData);
	}

	it('pushes the one-page estimate over the threshold', () => {
		const data = baseData();
		for (let i = 0; i < 55; i++) {
			data.skills.push({ id: `s${i}`, category: 'X', skills: 'Y' });
		}
		expect(estimateOverOnePage(data)).toBe(false);

		data.clearance = [{ id: '1', level: 'Secret', status: 'Active', dateGranted: '' }];
		expect(estimateOverOnePage(data)).toBe(true);
	});
});
