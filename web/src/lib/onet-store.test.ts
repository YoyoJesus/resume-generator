import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { onetStore, ONET_STORAGE_KEY } from './onet-store';

function fakeStorage() {
	const map = new Map<string, string>();
	return {
		getItem: (k: string) => map.get(k) ?? null,
		setItem: (k: string, v: string) => void map.set(k, v),
		removeItem: (k: string) => void map.delete(k),
		clear: () => map.clear(),
		key: () => null,
		length: 0,
	} as unknown as Storage;
}

beforeEach(() => {
	onetStore.clear();
	vi.stubGlobal('localStorage', fakeStorage());
});

const REF = { code: '15-1252.00', title: 'Software Developers', brightOutlook: true };

describe('onetStore', () => {
	it('starts with no occupation selected', () => {
		expect(get(onetStore)).toBeNull();
	});

	it('round-trips a selection through storage', () => {
		onetStore.select(REF);
		onetStore.saveToStorage();

		onetStore.clear();
		expect(get(onetStore)).toBeNull();

		onetStore.loadFromStorage();
		expect(get(onetStore)).toEqual(REF);
	});

	it('persists under its own key, leaving resume data untouched', () => {
		localStorage.setItem('resumeData', '{"personalInfo":{"name":"Ada"}}');
		onetStore.select(REF);
		onetStore.saveToStorage();

		expect(localStorage.getItem('resumeData')).toBe('{"personalInfo":{"name":"Ada"}}');
		expect(JSON.parse(localStorage.getItem(ONET_STORAGE_KEY)!)).toEqual(REF);
	});

	it('clearing a selection removes it from storage', () => {
		onetStore.select(REF);
		onetStore.saveToStorage();

		onetStore.clear();
		onetStore.saveToStorage();

		onetStore.loadFromStorage();
		expect(get(onetStore)).toBeNull();
	});

	it('ignores corrupt stored JSON rather than throwing', () => {
		localStorage.setItem(ONET_STORAGE_KEY, '{not json');
		expect(() => onetStore.loadFromStorage()).not.toThrow();
		expect(get(onetStore)).toBeNull();
	});

	it('ignores stored data that is missing a code', () => {
		localStorage.setItem(ONET_STORAGE_KEY, JSON.stringify({ title: 'Orphan' }));
		onetStore.loadFromStorage();
		expect(get(onetStore)).toBeNull();
	});
});
