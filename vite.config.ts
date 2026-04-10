import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import pkg from './package.json' with { type: 'json' };
import { execSync } from 'child_process';

const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__GIT_BRANCH__: JSON.stringify(gitBranch)
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
