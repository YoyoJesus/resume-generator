import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { customTemplateStore, MAX_TEMPLATE_SIZE, TEMPLATE_STORAGE_KEY, validateTemplateSource } from './template-store';

const VALID_TEMPLATE = `
#let resume(body) = body
#let work-heading(title, company, location, start-date, end-date, body) = body
#let project-heading(name, stack: "", project-url: "", award: "", body) = body
#let education-heading(institution, location, degree, major, start-date, end-date, body) = body
#let achievement-heading(title, date, body) = body
#let skills(body) = body
// ========== RESUME CONTENT ==========
`;

function storage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
		clear: () => values.clear(),
		key: (index: number) => [...values.keys()][index] ?? null,
		get length() {
			return values.size;
		},
	};
}

describe('custom Typst templates', () => {
	beforeEach(() => {
		vi.stubGlobal('window', {});
		vi.stubGlobal('sessionStorage', storage());
		customTemplateStore.clear();
	});

	it('requires the content marker and all template helpers', () => {
		expect(validateTemplateSource(VALID_TEMPLATE)).toBeNull();
		expect(validateTemplateSource(VALID_TEMPLATE.replace('// ========== RESUME CONTENT ==========', ''))).toContain(
			'must contain',
		);
		expect(validateTemplateSource(VALID_TEMPLATE.replace('#let skills(body) = body', ''))).toContain('skills');
	});

	it('rejects templates larger than one megabyte', () => {
		expect(validateTemplateSource(`${VALID_TEMPLATE}${'x'.repeat(MAX_TEMPLATE_SIZE)}`)).toContain('1 MB');
	});

	it('saves, restores, and clears a template in session storage', () => {
		const template = { name: 'mine.typ', source: VALID_TEMPLATE };
		customTemplateStore.save(template);
		expect(JSON.parse(sessionStorage.getItem(TEMPLATE_STORAGE_KEY)!)).toEqual(template);

		customTemplateStore.clear();
		sessionStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
		customTemplateStore.loadFromStorage();
		expect(get(customTemplateStore)).toEqual(template);

		customTemplateStore.clear();
		expect(get(customTemplateStore)).toBeNull();
		expect(sessionStorage.getItem(TEMPLATE_STORAGE_KEY)).toBeNull();
	});
});
