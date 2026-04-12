import { describe, it, expect, vi, beforeEach } from 'vitest'
import { speak, unlockAudio } from '../../src/lib/audio.ts'

describe('speak', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('speak_noSpeechSynthesis_throws', () => {
    const original = (globalThis as Record<string, unknown>).speechSynthesis
    delete (globalThis as Record<string, unknown>).speechSynthesis

    expect(() => speak('你好', 'zh')).toThrow('speechSynthesis is not available')

    ;(globalThis as Record<string, unknown>).speechSynthesis = original
  })

  it('speak_withSpeechSynthesis_cancelsThenSpeaks', () => {
    const cancel = vi.fn()
    const speak_ = vi.fn()
    const utterance = { lang: '', rate: 0, text: '' }

    // Must use a regular function (not arrow) so it is constructable
    ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = vi.fn(function (t: string) { utterance.text = t; return utterance })
    ;(globalThis as Record<string, unknown>).speechSynthesis = { cancel, speak: speak_ }

    speak('你好', 'zh')

    expect(cancel).toHaveBeenCalledOnce()
    expect(speak_).toHaveBeenCalledOnce()
    expect(utterance.lang).toBe('zh')
    expect(utterance.rate).toBe(0.75)
    expect(utterance.text).toBe('你好')
  })

  it('speak_customRate_setsRate', () => {
    const cancel = vi.fn()
    const speak_ = vi.fn()
    const utterance = { lang: '', rate: 0, text: '' }

    ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = vi.fn(function (t: string) { utterance.text = t; return utterance })
    ;(globalThis as Record<string, unknown>).speechSynthesis = { cancel, speak: speak_ }

    speak('学习', 'zh', 0.5)

    expect(utterance.rate).toBe(0.5)
  })

  it('speak_japaneseLanguage_setsLangJa', () => {
    const cancel = vi.fn()
    const speak_ = vi.fn()
    const utterance = { lang: '', rate: 0, text: '' }

    ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = vi.fn(function (t: string) { utterance.text = t; return utterance })
    ;(globalThis as Record<string, unknown>).speechSynthesis = { cancel, speak: speak_ }

    speak('学ぶ', 'ja')

    expect(utterance.lang).toBe('ja')
  })
})

describe('unlockAudio', () => {
  it('unlockAudio_withSpeechSynthesis_speaksSilentUtterance', () => {
    const speak_ = vi.fn()
    const utterance = { volume: 1 }

    ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = vi.fn(function () { return utterance })
    ;(globalThis as Record<string, unknown>).speechSynthesis = { speak: speak_ }

    unlockAudio()

    expect(speak_).toHaveBeenCalledOnce()
    expect(utterance.volume).toBe(0)
  })

  it('unlockAudio_noSpeechSynthesis_doesNotThrow', () => {
    const original = (globalThis as Record<string, unknown>).speechSynthesis
    delete (globalThis as Record<string, unknown>).speechSynthesis

    expect(() => unlockAudio()).not.toThrow()

    ;(globalThis as Record<string, unknown>).speechSynthesis = original
  })
})
