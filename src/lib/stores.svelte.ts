import type { ChildProfile } from './types.ts'

const STORAGE_KEY = 'inkido:activeChild'

let activeChild = $state<ChildProfile | null>(null)

export function initActiveChild(): void {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  activeChild = stored ? (JSON.parse(stored) as ChildProfile) : null
}

export function getActiveChild(): ChildProfile | null {
  return activeChild
}

export function setActiveChild(child: ChildProfile): void {
  activeChild = child
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(child))
}

export function clearActiveChild(): void {
  activeChild = null
  sessionStorage.removeItem(STORAGE_KEY)
}
