import { describe, it, expect } from 'vitest';
import { generateTypstCode } from './typst-generator';
import { defaultResumeData } from './types';
import type { ResumeData } from './types';

function baseData(clearance: ResumeData['clearance']): ResumeData {
	return { ...structuredClone(defaultResumeData), clearance };
}

describe('generateTypstCode clearance section', () => {
	it('omits the Clearance heading when there are no entries', () => {
		const code = generateTypstCode(baseData([]));
		expect(code).not.toContain('= Clearance');
	});

	it('renders level, status, and date for each entry', () => {
		const code = generateTypstCode(
			baseData([{ id: '1', level: 'Top Secret/SCI', status: 'Active', dateGranted: '2023-03' }]),
		);
		expect(code).toContain('= Clearance');
		expect(code).toContain('#achievement-heading("Top Secret/SCI (Active)", "Mar 2023")[]');
	});

	it('places Clearance before Education per the default section order', () => {
		const data = baseData([{ id: '1', level: 'Secret', status: 'Eligible', dateGranted: '' }]);
		data.education = [
			{
				id: 'e1',
				institution: 'MIT',
				location: '',
				degree: '',
				major: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [],
			},
		];
		const code = generateTypstCode(data);
		expect(code.indexOf('= Clearance')).toBeLessThan(code.indexOf('= Education'));
	});
});
