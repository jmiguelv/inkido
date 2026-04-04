import type { Session, SupabaseClient } from '@supabase/supabase-js'

declare global {
	const __APP_VERSION__: string
	namespace App {
		interface Locals {
			supabase: SupabaseClient
			session: Session | null
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}
