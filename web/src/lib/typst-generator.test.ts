import { describe, it, expect } from 'vitest';
import { generateTypstCode } from './typst-generator';
import { defaultResumeData, defaultFontSettings } from './types';
import type { ResumeData, WorkExperience } from './types';

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

function withOverrides(overrides: Partial<ResumeData>): ResumeData {
	return { ...structuredClone(defaultResumeData), ...overrides };
}

// The template preamble contains strings like `project-url: ""` and `datetime.today()` as function
// defaults, so assertions about user data have to look at the generated content only.
function contentOf(data: ResumeData): string {
	const [, content] = generateTypstCode(data).split('// ========== RESUME CONTENT ==========');
	if (content === undefined) throw new Error('content marker missing from generated Typst');
	return content;
}

function oneJob(overrides: Partial<WorkExperience>): WorkExperience {
	return {
		id: 'w1',
		title: 'Engineer',
		company: 'Acme',
		location: '',
		startDate: '',
		endDate: '',
		isPresent: true,
		bullets: [],
		...overrides,
	};
}

describe('generateTypstCode sanitization', () => {
	it('escapes a closing bracket in a bullet so it cannot end the content block', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ bullets: ['shipped it] #eval("1+1") ['] })] }));
		expect(content).toContain(String.raw`shipped it\] \#eval(\"1\+1\") \[`);
		expect(content).not.toMatch(/[^\\]\] #eval/);
	});

	it('escapes emphasis markers in a bullet instead of rendering them as formatting', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ bullets: ['grew *sales* by _30_'] })] }));
		expect(content).toContain(String.raw`grew \*sales\* by \_30\_`);
	});

	it('encodes a backslash in a bullet as a codepoint rather than a linebreak', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ bullets: ['ran C:\\build'] })] }));
		expect(content).toContain(String.raw`ran C:\u{5C}build`);
	});

	it('renders a hash in a string field without a stray backslash', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ title: 'C# Developer' })] }));
		expect(content).toContain('"C# Developer"');
	});

	it('closes a quote-based breakout in a string field', () => {
		const content = contentOf(
			withOverrides({ personalInfo: { ...defaultResumeData.personalInfo, name: 'Bob", author: "evil' } }),
		);
		expect(content).toContain(String.raw`author-name: "Bob\", author: \"evil"`);
	});

	it('rejects a date that is not a plain year-month', () => {
		const payload = '2020, month: 1, day: 1) ; let pwned = eval("1+1") ; datetime(year: 2021-01';
		const content = contentOf(withOverrides({ workExperience: [oneJob({ startDate: payload })] }));
		expect(content).not.toContain('pwned');
		expect(content).toContain('datetime.today()');
	});

	it('rejects an out-of-range month', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ startDate: '2020-13' })] }));
		expect(content).not.toContain('month: 13');
		expect(content).toContain('datetime.today()');
	});

	it('still renders a valid date', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ startDate: '2020-03' })] }));
		expect(content).toContain('datetime(year: 2020, month: 3, day: 1)');
	});

	it('falls back to the default colour when a colour carries a payload', () => {
		const code = generateTypstCode(
			withOverrides({ colors: { ...defaultResumeData.colors, headColor: '000"); #eval("1+1"); rgb("000' } }),
		);
		expect(code).not.toContain('eval');
		expect(code).toContain('#let head-color = rgb("22227f")');
	});

	it('clamps a font size instead of interpolating it raw', () => {
		const code = generateTypstCode(
			withOverrides({
				fonts: { ...defaultResumeData.fonts, baseSize: 9000, nameSize: '1pt); #eval("1+1"); (' as unknown as number },
			}),
		);
		expect(code).not.toContain('eval');
		expect(code).toContain('#let font-size = 14pt');
		expect(code).toContain(`#let title-size = ${defaultFontSettings.nameSize}pt`);
	});

	it('drops a javascript URL on a project link', () => {
		const content = contentOf(
			withOverrides({
				projects: [{ id: 'p1', name: 'Thing', stack: '', url: 'javascript:alert(1)', award: '', bullets: [] }],
			}),
		);
		expect(content).toContain('project-url: ""');
		expect(content).not.toContain('javascript');
	});

	it('assumes https for a bare project domain', () => {
		const content = contentOf(
			withOverrides({
				projects: [{ id: 'p1', name: 'Thing', stack: '', url: 'example.com/x', award: '', bullets: [] }],
			}),
		);
		expect(content).toContain('project-url: "https://example.com/x"');
	});
});
