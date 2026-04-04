import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'node',
					include: ['tests/unit/**/*.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
