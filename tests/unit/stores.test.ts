import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock sessionStorage at the system boundary
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

vi.stubGlobal('sessionStorage', sessionStorageMock)

const { getActiveProfile, setActiveProfile, clearActiveProfile, initActiveProfile } =
  await import('../../src/lib/stores.svelte.ts')

describe('activeProfile', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    clearActiveProfile()
  })

  it('activeProfile_initialState_isNull', () => {
    expect(getActiveProfile()).toBeNull()
  })

  it('activeProfile_setAndGet_persistsToSessionStorage', () => {
    const profile = { id: '1', parent_id: 'p1', name: 'Alice', created_at: '2024-01-01' }
    setActiveProfile(profile)

    expect(getActiveProfile()).toEqual(profile)
    expect(JSON.parse(sessionStorageMock.getItem('inkido:activeProfile') ?? 'null')).toEqual(profile)
  })

  it('activeProfile_logout_clearsSessionStorage', () => {
    const profile = { id: '1', parent_id: 'p1', name: 'Alice', created_at: '2024-01-01' }
    setActiveProfile(profile)
    clearActiveProfile()

    expect(getActiveProfile()).toBeNull()
    expect(sessionStorageMock.getItem('inkido:activeProfile')).toBeNull()
  })

  it('activeProfile_persistsAcrossPageRefresh_loadsFromSessionStorage', () => {
    const profile = { id: '2', parent_id: 'p1', name: 'Bob', created_at: '2024-01-01' }
    sessionStorageMock.setItem('inkido:activeProfile', JSON.stringify(profile))

    initActiveProfile()

    expect(getActiveProfile()).toEqual(profile)
  })
})
