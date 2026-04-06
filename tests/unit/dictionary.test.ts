import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCharData, getWordData } from '../../src/lib/dictionary'
import { supabase } from '../../src/lib/supabase'

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          or: vi.fn(() => ({
            maybeSingle: vi.fn()
          }))
        }))
      }))
    }))
  }
}))

describe('dictionary cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getCharData caches results', async () => {
    const mockData = { char: '学', gloss: 'study' }
    const fromSpy = vi.spyOn(supabase, 'from')
    
    // Setup mock return
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockData })
    // @ts-ignore
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock
        })
      })
    }))

    // First call - should hit DB
    const res1 = await getCharData('学')
    expect(res1).toEqual(mockData)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1)

    // Second call - should hit cache
    const res2 = await getCharData('学')
    expect(res2).toEqual(mockData)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1) // Still 1
  })

  it('getWordData caches results', async () => {
    const mockData = { word: '学习', pinyin: 'xué xí' }
    
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockData })
    // @ts-ignore
    supabase.from.mockImplementation(() => ({
      select: () => ({
        or: () => ({
          maybeSingle: maybeSingleMock
        })
      })
    }))

    // First call
    const res1 = await getWordData('学习')
    expect(res1).toEqual(mockData)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1)

    // Second call
    const res2 = await getWordData('学习')
    expect(res2).toEqual(mockData)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1)
  })
})
