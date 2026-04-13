import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCharData, getWordData, getStrokeClass, getCharsData, getWordsData } from '../../src/lib/dictionary'
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
        })),
        in: vi.fn(() => ({
          maybeSingle: vi.fn()
        })),
        or: vi.fn(() => ({
          maybeSingle: vi.fn()
        }))
      }))
    }))
  }
}))

describe('dictionary cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear internal SvelteMaps by reloading? 
    // Actually, since they are module scope, we might need a way to clear them or just accept they persist.
  })

  it('getCharData caches results', async () => {
    const mockData = { char: '学', gloss: 'study' }
    
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

    const res1 = await getCharData('学')
    expect(res1).toEqual(mockData)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1)

    const res2 = await getCharData('学')
    expect(res2).toEqual(mockData)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1)
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

    const res1 = await getWordData('学习')
    expect(res1).toEqual(mockData)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1)

    const res2 = await getWordData('学习')
    expect(res2).toEqual(mockData)
    expect(maybeSingleMock).toHaveBeenCalledTimes(1)
  })
})

describe('stroke classification', () => {
  it('classifies characters correctly based on stroke count', async () => {
    // We need to seed the cache for getStrokeClass to work
    const mockChar = { char: '一', stroke_count: 1 }
    
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockChar })
    // @ts-ignore
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock
        })
      })
    }))

    await getCharData('一')
    const cls = getStrokeClass('一')
    expect(cls).toBe('stroke-mint') // 1 stroke is <= 6
  })

  it('handles multi-character words with average stroke count', async () => {
    // @ts-ignore
    supabase.from.mockImplementation((table) => ({
      select: () => ({
        in: () => Promise.resolve({ data: [
          { char: '你', stroke_count: 7 },
          { char: '好', stroke_count: 6 }
        ]})
      })
    }))

    await getCharsData(['你', '好'])
    const cls = getStrokeClass('你好')
    expect(cls).toBe('stroke-sky') // average 6.5, <= 10
  })
})
