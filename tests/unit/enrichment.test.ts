import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateEnrichmentUpdates } from '../../src/lib/enrichment'
import * as dictionary from '../../src/lib/dictionary'

// Mock dictionary fetchers
vi.mock('../../src/lib/dictionary', async () => {
  const actual = await vi.importActual('../../src/lib/dictionary')
  return {
    ...actual as any,
    getCharsData: vi.fn(),
    getWordsData: vi.fn()
  }
})

describe('enrichment logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prioritizes dictionary data over LLM data', async () => {
    const phrases = ['学习']
    const llmResults = [{
      word: '学习',
      pinyin: 'xué xí',
      translation: 'to learn (LLM)'
    }]

    // Mock dictionary returning data
    vi.mocked(dictionary.getWordsData).mockResolvedValue(new Map([
      ['学习', { word: '学习', pinyin: 'xué xí', translation: 'study (Dict)' } as any]
    ]))
    vi.mocked(dictionary.getCharsData).mockResolvedValue(new Map())

    const updates = await calculateEnrichmentUpdates(phrases, llmResults)
    const update = updates.get('学习')

    expect(update?.translation).toBe('study (Dict)')
    expect(update?.is_llm_translation).toBe(false)
  })

  it('uses LLM data when dictionary is missing', async () => {
    const phrases = ['人工智能']
    const llmResults = [{
      word: '人工智能',
      pinyin: 'rén gōng zhì néng',
      translation: 'AI'
    }]

    vi.mocked(dictionary.getWordsData).mockResolvedValue(new Map())
    vi.mocked(dictionary.getCharsData).mockResolvedValue(new Map())

    const updates = await calculateEnrichmentUpdates(phrases, llmResults)
    const update = updates.get('人工智能')

    expect(update?.translation).toBe('AI')
    expect(update?.is_llm_translation).toBe(true)
  })

  it('falls back to character-by-character pinyin if word pinyin is missing', async () => {
    const phrases = ['你好']
    const llmResults = [] as any[]

    vi.mocked(dictionary.getWordsData).mockImplementation(async (words) => {
      const m = new Map()
      if (words.includes('你')) m.set('你', { pinyin: 'nǐ' })
      if (words.includes('好')) m.set('好', { pinyin: 'hǎo' })
      return m
    })
    vi.mocked(dictionary.getCharsData).mockResolvedValue(new Map())

    const updates = await calculateEnrichmentUpdates(phrases, llmResults)
    const update = updates.get('你好')

    expect(update?.phonetic_annotation).toBe('nǐ hǎo')
    expect(update?.is_llm_pinyin).toBe(false)
  })
})
