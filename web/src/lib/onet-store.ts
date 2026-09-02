import { writable, get } from 'svelte/store';
import type { OnetOccupationRef } from './onet-types';

// Deliberately separate from resumeStore: the target occupation is reference
// state, not resume content, so it must never reach ResumeData or the PDF.
export const ONET_STORAGE_KEY = 'onetSelection';

function isRef(value: unknown): value is OnetOccupationRef {
	const v = value as Record<string, unknown> | null;
	return !!v && typeof v.code === 'string' && v.code !== '' && typeof v.title === 'string';
}

function createOnetStore() {
	const { subscribe, set } = writable<OnetOccupationRef | null>(null);

	return {
		subscribe,
		select: (ref: OnetOccupationRef) => set(ref),
		clear: () => set(null),
		loadFromStorage: () => {
			if (typeof localStorage === 'undefined') return;
			const saved = localStorage.getItem(ONET_STORAGE_KEY);
			if (!saved) return;
			try {
				const parsed = JSON.parse(saved);
				if (isRef(parsed)) set({ ...parsed, brightOutlook: parsed.brightOutlook === true });
			} catch {
				// Corrupt entry from an older version; fall back to no selection.
			}
		},
		saveToStorage: () => {
			if (typeof localStorage === 'undefined') return;
			const current = get({ subscribe });
			if (current) localStorage.setItem(ONET_STORAGE_KEY, JSON.stringify(current));
			else localStorage.removeItem(ONET_STORAGE_KEY);
		},
	};
}

export const onetStore = createOnetStore();
