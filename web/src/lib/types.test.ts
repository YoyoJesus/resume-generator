import { describe, it, expect } from 'vitest';
import { defaultResumeData, defaultSectionOrder, sectionLabels } from './types';

describe('clearance defaults', () => {
	it('defaultResumeData includes an empty clearance array', () => {
		expect(defaultResumeData.clearance).toEqual([]);
	});

	it('defaultSectionOrder places clearance right after profile', () => {
		const profileIndex = defaultSectionOrder.indexOf('profile');
		expect(defaultSectionOrder[profileIndex + 1]).toBe('clearance');
	});

	it('sectionLabels has a label for clearance', () => {
		expect(sectionLabels.clearance).toBe('Clearance');
	});
});
