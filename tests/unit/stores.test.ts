import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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

const {
  getActiveProfile, setActiveProfile, clearActiveProfile, initActiveProfile,
  getPetMood, setPetMood,
} = await import('../../src/lib/stores.svelte.ts')

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

describe('petMood', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setPetMood('idle')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('petMood_initialState_isIdle', () => {
    expect(getPetMood()).toBe('idle')
  })

  it('petMood_setHappy_returnsHappy', () => {
    setPetMood('happy')
    expect(getPetMood()).toBe('happy')
  })

  it('petMood_setIdle_setsNoRevertTimer', () => {
    setPetMood('idle')
    vi.advanceTimersByTime(10_000)
    expect(getPetMood()).toBe('idle')
  })

  it('petMood_afterDuration_revertsToIdle', () => {
    setPetMood('happy', 700)
    expect(getPetMood()).toBe('happy')
    vi.advanceTimersByTime(700)
    expect(getPetMood()).toBe('idle')
  })

  it('petMood_setWhileTimerPending_cancelsExistingTimer', () => {
    setPetMood('happy', 700)
    vi.advanceTimersByTime(400)           // 400ms into happy timer
    setPetMood('sad', 700)                 // replace with sad; cancels happy timer
    vi.advanceTimersByTime(400)           // would have triggered happy (800ms total)
    expect(getPetMood()).toBe('sad')       // still sad — sad timer not yet elapsed
    vi.advanceTimersByTime(300)           // sad timer now complete (700ms since set)
    expect(getPetMood()).toBe('idle')
  })
})
