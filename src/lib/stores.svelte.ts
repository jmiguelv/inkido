import type { Profile } from './types.ts'

const STORAGE_KEY = 'inkido:activeProfile'

let activeProfile = $state<Profile | null>(null)

export function initActiveProfile(): void {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  activeProfile = stored ? (JSON.parse(stored) as Profile) : null
}

export function getActiveProfile(): Profile | null {
  return activeProfile
}

export function setActiveProfile(profile: Profile): void {
  activeProfile = profile
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function clearActiveProfile(): void {
  activeProfile = null
  sessionStorage.removeItem(STORAGE_KEY)
}
