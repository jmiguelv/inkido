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

const { getActiveChild, setActiveChild, clearActiveChild, initActiveChild } =
  await import('../../src/lib/stores.svelte.ts')

describe('activeChild', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    clearActiveChild()
  })

  it('activeChild_initialState_isNull', () => {
    expect(getActiveChild()).toBeNull()
  })

  it('activeChild_setAndGet_persistsToSessionStorage', () => {
    const child = { id: '1', parent_id: 'p1', name: 'Alice', created_at: '2024-01-01' }
    setActiveChild(child)

    expect(getActiveChild()).toEqual(child)
    expect(JSON.parse(sessionStorageMock.getItem('inkido:activeChild') ?? 'null')).toEqual(child)
  })

  it('activeChild_logout_clearsSessionStorage', () => {
    const child = { id: '1', parent_id: 'p1', name: 'Alice', created_at: '2024-01-01' }
    setActiveChild(child)
    clearActiveChild()

    expect(getActiveChild()).toBeNull()
    expect(sessionStorageMock.getItem('inkido:activeChild')).toBeNull()
  })

  it('activeChild_persistsAcrossPageRefresh_loadsFromSessionStorage', () => {
    const child = { id: '2', parent_id: 'p1', name: 'Bob', created_at: '2024-01-01' }
    sessionStorageMock.setItem('inkido:activeChild', JSON.stringify(child))

    // Simulate page refresh: re-run the init that reads from sessionStorage
    initActiveChild()

    expect(getActiveChild()).toEqual(child)
  })
})
