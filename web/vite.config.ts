/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
	// Node supports native top-level await. Rewriting server chunks delays SvelteKit's
	// options initialization until after the Vercel function constructs its Server.
	plugins: [
		wasm(),
		{ ...topLevelAwait(), applyToEnvironment: (environment) => environment.name === 'client' },
		sveltekit(),
	],
	optimizeDeps: {
		exclude: ['@myriaddreamin/typst.ts'],
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
