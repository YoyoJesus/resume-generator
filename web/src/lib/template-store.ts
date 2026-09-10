import { writable } from 'svelte/store';
import { RESUME_CONTENT_MARKER } from './typst-generator';

export const TEMPLATE_STORAGE_KEY = 'customTypstTemplate';
export const MAX_TEMPLATE_SIZE = 1024 * 1024;

export interface CustomTemplate {
	name: string;
	source: string;
}

const REQUIRED_HELPERS = [
	'resume',
	'work-heading',
	'project-heading',
	'education-heading',
	'achievement-heading',
	'skills',
];

export function validateTemplateSource(source: string): string | null {
	if (!source.trim()) return 'The template is empty.';
	if (new Blob([source]).size > MAX_TEMPLATE_SIZE) return 'The template must be 1 MB or smaller.';
	if (!source.includes(RESUME_CONTENT_MARKER)) {
		return `The template must contain this marker: ${RESUME_CONTENT_MARKER}`;
	}

	const missing = REQUIRED_HELPERS.filter(
		(helper) => !new RegExp(`#let\\s+${helper.replace('-', '\\-')}\\b`).test(source),
	);
	if (missing.length > 0) return `The template is missing required helpers: ${missing.join(', ')}.`;

	return null;
}

function createCustomTemplateStore() {
	const { subscribe, set } = writable<CustomTemplate | null>(null);

	return {
		subscribe,
		loadFromStorage: () => {
			if (typeof window === 'undefined') return;
			const saved = sessionStorage.getItem(TEMPLATE_STORAGE_KEY);
			if (!saved) return;
			try {
				const template = JSON.parse(saved) as CustomTemplate;
				if (template.name && !validateTemplateSource(template.source)) set(template);
				else sessionStorage.removeItem(TEMPLATE_STORAGE_KEY);
			} catch (error) {
				console.error('Failed to load the custom Typst template:', error);
				sessionStorage.removeItem(TEMPLATE_STORAGE_KEY);
			}
		},
		save: (template: CustomTemplate) => {
			if (typeof window !== 'undefined') sessionStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
			set(template);
		},
		clear: () => {
			if (typeof window !== 'undefined') sessionStorage.removeItem(TEMPLATE_STORAGE_KEY);
			set(null);
		},
	};
}

export const customTemplateStore = createCustomTemplateStore();
