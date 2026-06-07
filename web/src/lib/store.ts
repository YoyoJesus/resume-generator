import { writable } from 'svelte/store';
import type { ResumeData } from './types';
import { defaultResumeData } from './types';

function createResumeStore() {
	const { subscribe, set, update } = writable<ResumeData>(defaultResumeData);

	return {
		subscribe,
		set,
		update,
		reset: () => set(defaultResumeData),
		loadFromStorage: () => {
			if (typeof window !== 'undefined') {
				const saved = localStorage.getItem('resumeData');
				if (saved) {
					try {
						set(JSON.parse(saved));
					} catch (e) {
						console.error('Failed to load saved resume data:', e);
					}
				}
			}
		},
		saveToStorage: (data: ResumeData) => {
			if (typeof window !== 'undefined') {
				localStorage.setItem('resumeData', JSON.stringify(data));
			}
		},
	};
}

export const resumeStore = createResumeStore();
