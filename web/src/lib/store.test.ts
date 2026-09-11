import { describe, it, expect } from 'vitest';
import { mergeWithDefaults } from './store';
import { defaultResumeData } from './types';

describe('mergeWithDefaults', () => {
	it('fills in fields missing from old saved data (e.g. clearance) with defaults', () => {
		const { clearance, ...withoutClearance } = defaultResumeData;
		const merged = mergeWithDefaults(withoutClearance as Partial<typeof defaultResumeData>);
		expect(merged.clearance).toEqual([]);
	});

	it('preserves fields present in the saved data', () => {
		const saved = { ...defaultResumeData, personalInfo: { ...defaultResumeData.personalInfo, name: 'Ada' } };
		const merged = mergeWithDefaults(saved);
		expect(merged.personalInfo.name).toBe('Ada');
	});

	it('deep-merges nested settings and appends newly introduced sections', () => {
		const merged = mergeWithDefaults({
			personalInfo: { name: 'Ada' } as Partial<typeof defaultResumeData.personalInfo> as typeof defaultResumeData.personalInfo,
			fonts: { baseSize: 10 } as typeof defaultResumeData.fonts,
			sectionOrder: ['experience', 'profile'],
		});

		expect(merged.personalInfo.name).toBe('Ada');
		expect(merged.personalInfo.github).toBe('');
		expect(merged.fonts.baseSize).toBe(10);
		expect(merged.fonts.nameSize).toBe(defaultResumeData.fonts.nameSize);
		expect(merged.sectionOrder.slice(0, 2)).toEqual(['experience', 'profile']);
		expect(merged.sectionOrder).toContain('clearance');
	});

	it('returns fresh nested defaults rather than shared mutable objects', () => {
		const first = mergeWithDefaults({});
		first.personalInfo.name = 'Changed';
		first.sectionOrder.pop();
		const second = mergeWithDefaults({});

		expect(second.personalInfo.name).toBe('');
		expect(second.sectionOrder).toEqual(defaultResumeData.sectionOrder);
	});
});
