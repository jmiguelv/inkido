import { describe, it, expect } from 'vitest'
import { numberedToTone, getTone } from '../../src/lib/characters'

/**
 * Re-implementing the enrichment precedence logic from enrichWords()
 * in /spellings/[id]/+page.svelte to test it in isolation.
 */
type DictEntry = { pinyin?: string | null; translation?: string | null } | undefined
type LlmEntry = { word?: string; pinyin: string; translation: string; example?: string; example_phonetic?: string; example_translation?: string } | undefined

function resolveEnrichment(w: DictEntry, llmData: LlmEntry) {
  return {
    pinyin: w?.pinyin ?? llmData?.pinyin ?? null,
    translation: w?.translation ?? llmData?.translation ?? null,
    isLlmPinyin: !w?.pinyin && !!llmData?.pinyin,
    isLlmTranslation: !w?.translation && !!llmData?.translation,
    example: llmData?.example ?? null,
    example_phonetic: llmData?.example_phonetic ?? null,
    example_translation: llmData?.example_translation ?? null,
  }
}

describe('enrichWords: data source precedence', () => {
  it('enrichment_dictionaryHasBoth_dictionaryWins', () => {
    const result = resolveEnrichment(
      { pinyin: 'hǎo', translation: 'good' },
      { word: '好', pinyin: 'hào', translation: 'to like', example: '你好' }
    )
    expect(result.pinyin).toBe('hǎo')
    expect(result.translation).toBe('good')
    expect(result.isLlmPinyin).toBe(false)
    expect(result.isLlmTranslation).toBe(false)
  })

  it('enrichment_dictionaryMissing_llmFills', () => {
    const result = resolveEnrichment(
      undefined,
      { word: '新词', pinyin: 'xīn cí', translation: 'new word', example: '这是新词。' }
    )
    expect(result.pinyin).toBe('xīn cí')
    expect(result.translation).toBe('new word')
    expect(result.isLlmPinyin).toBe(true)
    expect(result.isLlmTranslation).toBe(true)
  })

  it('enrichment_dictionaryHasOnly_llmExampleStillSaved', () => {
    const result = resolveEnrichment(
      { pinyin: 'hǎo', translation: 'good' },
      { word: '好', pinyin: 'hào', translation: 'to like', example: '你好！', example_phonetic: 'nǐ hǎo', example_translation: 'Hello!' }
    )
    expect(result.example).toBe('你好！')
    expect(result.example_phonetic).toBe('nǐ hǎo')
    expect(result.example_translation).toBe('Hello!')
  })

  it('enrichment_noLlmData_examplesAreNull', () => {
    const result = resolveEnrichment({ pinyin: 'hǎo', translation: 'good' }, undefined)
    expect(result.example).toBeNull()
    expect(result.example_phonetic).toBeNull()
    expect(result.example_translation).toBeNull()
  })
})

/**
 * Re-implementing the mapping logic from /spellings/[id] to test it.
 * In a real refactor, this logic would move to a shared utility file.
 */
function getStrokeClass(avgStrokes: number): string {
  if (avgStrokes === 0) return 'stroke-lemon'
  if (avgStrokes <= 7)  return 'stroke-mint'
  if (avgStrokes <= 11) return 'stroke-sky'
  if (avgStrokes <= 16) return 'stroke-lavender'
  return 'stroke-rose'
}

describe('UI Logic: Stroke Complexity Mapping', () => {
  it('assigns mint for simple characters (<= 7)', () => {
    expect(getStrokeClass(1)).toBe('stroke-mint')
    expect(getStrokeClass(7)).toBe('stroke-mint')
  })

  it('assigns sky for medium-low complexity (8-11)', () => {
    expect(getStrokeClass(8)).toBe('stroke-sky')
    expect(getStrokeClass(11)).toBe('stroke-sky')
  })

  it('assigns lavender for medium-high complexity (12-16)', () => {
    expect(getStrokeClass(12)).toBe('stroke-lavender')
    expect(getStrokeClass(16)).toBe('stroke-lavender')
  })

  it('assigns rose for high complexity (> 16)', () => {
    expect(getStrokeClass(17)).toBe('stroke-rose')
    expect(getStrokeClass(30)).toBe('stroke-rose')
  })

  it('assigns lemon for unknown complexity (0)', () => {
    expect(getStrokeClass(0)).toBe('stroke-lemon')
  })
})

describe('numberedToTone', () => {
  it('numberedToTone_tone2_appliesRisingMark', () => {
    expect(numberedToTone('yi2')).toBe('yí')
  })

  it('numberedToTone_aOrE_getsMarkOverOther', () => {
    expect(numberedToTone('hao3')).toBe('hǎo')
    expect(numberedToTone('mei2')).toBe('méi')
  })

  it('numberedToTone_multiSyllable_convertsAll', () => {
    expect(numberedToTone('ni3 hao3')).toBe('nǐ hǎo')
    expect(numberedToTone('zhong1 wen2')).toBe('zhōng wén')
  })

  it('numberedToTone_vAsU_convertsToUmlaut', () => {
    expect(numberedToTone('lv4')).toBe('lǜ')
    expect(numberedToTone('nv3')).toBe('nǚ')
  })

  it('numberedToTone_alreadyDiacritic_unchanged', () => {
    expect(numberedToTone('nǐ hǎo')).toBe('nǐ hǎo')
  })

  it('numberedToTone_tone5_stripsNumber', () => {
    expect(numberedToTone('ma5')).toBe('ma')
  })
})

describe('getTone: numbered pinyin fallback', () => {
  it('getTone_numberedPinyin_extractsTone', () => {
    expect(getTone('yi2')).toBe(2)
    expect(getTone('hao3')).toBe(3)
    expect(getTone('zhong1')).toBe(1)
    expect(getTone('qu4')).toBe(4)
  })

  it('getTone_diacriticPinyin_stillWorks', () => {
    expect(getTone('yí')).toBe(2)
    expect(getTone('hǎo')).toBe(3)
  })
})
