import type { LayoutLoad } from './$types';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

injectSpeedInsights();

export const load: LayoutLoad = ({ url }) => {
	const segment = url.pathname.split('/')[1] || '';
	return {
		activeSection: segment
	};
};
