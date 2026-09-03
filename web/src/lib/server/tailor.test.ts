import { describe, it, expect } from 'vitest';
import { validateEdits, MAX_EDITS, buildTailorInput, TAILOR_SCHEMA } from './tailor';
import { defaultResumeData } from '$lib/types';
import type { ResumeData } from '$lib/types';
import type { OnetOccupation } from '$lib/onet-types';

const allowed = { bullets: new Set(['w1', 'p1']), skills: new Set(['s1']) };

function edit(over: Record<string, unknown> = {}) {
	return { kind: 'add_bullet', targetId: 'w1', text: 'Shipped a thing.', bulletIndex: -1, ...over };
}

describe('validateEdits', () => {
	it('requires every declared edit property for strict OpenAI JSON schema compatibility', () => {
		expect(TAILOR_SCHEMA.properties.edits.items.required).toEqual(['kind', 'targetId', 'text', 'bulletIndex']);
	});

	it('keeps a well-formed edit', () => {
		expect(validateEdits({ edits: [edit()] }, allowed)).toEqual([
			{ kind: 'add_bullet', targetId: 'w1', text: 'Shipped a thing.', bulletIndex: -1 },
		]);
	});

	// The model can invent an id that was never offered to it; those must not
	// silently become inserts against the wrong entry (or none at all).
	it('drops an edit whose target id was never offered', () => {
		expect(validateEdits({ edits: [edit({ targetId: 'nope' })] }, allowed)).toEqual([]);
	});

	it('drops a bullet edit aimed at a skill category id', () => {
		expect(validateEdits({ edits: [edit({ kind: 'add_bullet', targetId: 's1' })] }, allowed)).toEqual([]);
	});

	it('drops a skill edit aimed at an experience id', () => {
		expect(validateEdits({ edits: [edit({ kind: 'skill', targetId: 'w1', text: 'Go' })] }, allowed)).toEqual([]);
	});

	it('drops an unknown kind', () => {
		expect(validateEdits({ edits: [edit({ kind: 'profile' })] }, allowed)).toEqual([]);
	});

	it.each([[''], ['   '], [null], [42]])('drops an edit whose text is %p', (text) => {
		expect(validateEdits({ edits: [edit({ text })] }, allowed)).toEqual([]);
	});

	it('trims surrounding whitespace from the text', () => {
		expect(validateEdits({ edits: [edit({ text: '  Shipped a thing.  ' })] }, allowed)[0].text).toBe(
			'Shipped a thing.',
		);
	});

	it('drops duplicates of the same text on the same target', () => {
		expect(validateEdits({ edits: [edit(), edit()] }, allowed)).toHaveLength(1);
	});

	it('keeps the same text on two different targets', () => {
		expect(validateEdits({ edits: [edit(), edit({ targetId: 'p1' })] }, allowed)).toHaveLength(2);
	});

	it('caps runaway output at MAX_EDITS', () => {
		const many = Array.from({ length: MAX_EDITS + 15 }, (_, i) => edit({ text: `Bullet number ${i}.` }));
		expect(validateEdits({ edits: many }, allowed)).toHaveLength(MAX_EDITS);
	});

	it.each([[{}], [{ edits: null }], [{ edits: 'nope' }], [null], ['garbage']])(
		'returns an empty list for malformed payload %p',
		(raw) => {
			expect(validateEdits(raw, allowed)).toEqual([]);
		},
	);

	it('keeps good edits alongside bad ones rather than failing the batch', () => {
		const raw = { edits: [edit({ targetId: 'ghost' }), edit({ text: 'Real bullet.' })] };
		expect(validateEdits(raw, allowed)).toEqual([
			{ kind: 'add_bullet', targetId: 'w1', text: 'Real bullet.', bulletIndex: -1 },
		]);
	});
});

describe('buildTailorInput', () => {
	const occupation = {
		code: '15-1252.00',
		title: 'Software Developers',
		description: 'Design software.',
		brightOutlook: false,
		tasks: [{ id: 't1', text: 'Modify existing software.' }],
		detailedWorkActivities: [],
		technologySkills: [{ category: 'IDEs', examples: [{ name: 'Git', hot: true }] }],
		skills: [{ id: 'k1', name: 'Programming', description: 'Writing programs.' }],
		knowledge: [],
		abilities: [],
		unavailable: [],
	} as OnetOccupation;

	function resume(): ResumeData {
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
			skills: [{ id: 's1', category: 'Languages', skills: 'Python' }],
		};
	}

	it('offers every insertable target so the model can only choose a real one', () => {
		const { allowed: a } = buildTailorInput(resume(), occupation);
		expect([...a.bullets]).toEqual(['w1']);
		expect([...a.skills]).toEqual(['s1']);
	});

	it('includes the resume evidence and the O*NET items in the prompt text', () => {
		const { prompt } = buildTailorInput(resume(), occupation);
		expect(prompt).toContain('Built an API.'); // existing bullet, so the model can ground its rewrite
		expect(prompt).toContain('Modify existing software.'); // O*NET task
		expect(prompt).toContain('Git'); // technology
		expect(prompt).toContain('w1'); // target id it must cite back
	});

	it('does not leak contact details into the prompt', () => {
		const r = resume();
		r.personalInfo.email = 'secret@example.com';
		r.personalInfo.phone = '555-0100';
		const { prompt } = buildTailorInput(r, occupation);
		expect(prompt).not.toContain('secret@example.com');
		expect(prompt).not.toContain('555-0100');
	});
});
