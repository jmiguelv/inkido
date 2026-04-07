import type { Profile } from './types.ts'

const STORAGE_KEY = 'inkido:activeProfile'
const THEME_KEY = 'inkido:theme'

export type Theme = 'light' | 'dark'

let activeProfile = $state<Profile | null>(null)
let theme = $state<Theme>('light')

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

export function initTheme(): void {
  const stored = localStorage.getItem(THEME_KEY) as Theme | null
  if (stored) {
    theme = stored
  } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark'
  } else {
    theme = 'light'
  }
}

export function getTheme(): Theme {
  return theme
}

export function toggleTheme(): void {
  theme = theme === 'light' ? 'dark' : 'light'
  localStorage.setItem(THEME_KEY, theme)
}
