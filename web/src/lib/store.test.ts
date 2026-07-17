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
});
