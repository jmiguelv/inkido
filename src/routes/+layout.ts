import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
	const segment = url.pathname.split('/')[1] || '';
	return {
		activeSection: segment === 'spellings' ? 'lists' : segment
	};
};
