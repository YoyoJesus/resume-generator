import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		warningFilter: (warning) => {
			if (warning.code === 'a11y_label_has_associated_control') return false;
			if (warning.code === 'a11y_invalid_attribute') return false;
			return true;
		},
	},
	kit: {
		adapter: adapter(),
	},
};

export default config;
