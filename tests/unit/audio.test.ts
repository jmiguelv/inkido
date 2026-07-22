import { describe, it, expect, vi, beforeEach } from 'vitest'
import { speak, unlockAudio } from '../../src/lib/audio.ts'

function mockSynth(overrides: Record<string, unknown> = {}) {
  const cancel = vi.fn()
  const speak_ = vi.fn()
  const getVoices = vi.fn(() => [])
  const addEventListener = vi.fn()
  const utterance: Record<string, unknown> = { lang: '', rate: 0, text: '', volume: 1 }

  ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = vi.fn(function (t: string) { utterance.text = t; return utterance })
  ;(globalThis as Record<string, unknown>).speechSynthesis = { cancel, speak: speak_, getVoices, addEventListener, ...overrides }

  return { cancel, speak: speak_, getVoices, addEventListener, utterance }
}

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

  it('speak_available_cancelsThenSpeaks', () => {
    const { cancel, speak: speak_ } = mockSynth()

    speak('你好', 'zh')

    expect(cancel).toHaveBeenCalledOnce()
    expect(speak_).toHaveBeenCalledOnce()
  })

  it('speak_defaultArgs_setsLangRateAndText', () => {
    const { utterance } = mockSynth()

    speak('你好', 'zh')

    expect(utterance.lang).toBe('zh')
    expect(utterance.rate).toBe(0.75)
    expect(utterance.text).toBe('你好')
    expect(utterance.volume).toBe(1)
  })

  it('speak_customRate_setsRate', () => {
    const { utterance } = mockSynth()

    speak('学习', 'zh', 0.5)

    expect(utterance.rate).toBe(0.5)
  })

  it('speak_japaneseLanguage_setsLangJa', () => {
    const { utterance } = mockSynth()

    speak('学ぶ', 'ja')

    expect(utterance.lang).toBe('ja')
  })

  it('speak_matchingVoiceAvailable_setsVoice', () => {
    const zhVoice = { lang: 'zh-CN', name: 'Tingting' }
    const { utterance } = mockSynth({ getVoices: vi.fn(() => [zhVoice]) })

    speak('你好', 'zh')

    expect(utterance.voice).toBe(zhVoice)
  })

  it('speak_noMatchingVoice_doesNotSetVoice', () => {
    const enVoice = { lang: 'en-US', name: 'Samantha' }
    const { utterance } = mockSynth({ getVoices: vi.fn(() => [enVoice]) })

    speak('你好', 'zh')

    expect(utterance.voice).toBeUndefined()
  })

  it('speak_exactLangMatch_preferredOverPrefix', () => {
    const zhTw = { lang: 'zh-TW', name: 'Meijia' }
    const zhCn = { lang: 'zh-CN', name: 'Tingting' }
    const { utterance } = mockSynth({ getVoices: vi.fn(() => [zhTw, zhCn]) })

    speak('你好', 'zh-CN')

    expect(utterance.voice).toBe(zhCn)
  })

  it('speak_attachesKeepAliveHandlers', () => {
    const { utterance } = mockSynth()

    speak('你好', 'zh')

    expect(utterance.onstart).toBeTypeOf('function')
    expect(utterance.onend).toBeTypeOf('function')
    expect(utterance.onerror).toBeTypeOf('function')
  })
})

describe('unlockAudio', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('unlockAudio_speaksSilentSpaceUtterance', () => {
    const { speak: speak_, utterance } = mockSynth()

    unlockAudio()

    expect(speak_).toHaveBeenCalledOnce()
    expect(utterance.volume).toBe(0)
    expect(utterance.text).toBe(' ')
  })

  it('unlockAudio_cancelsBeforeSpeaking', () => {
    const { cancel } = mockSynth()

    unlockAudio()

    expect(cancel).toHaveBeenCalledOnce()
  })

  it('unlockAudio_noSpeechSynthesis_doesNotThrow', () => {
    const original = (globalThis as Record<string, unknown>).speechSynthesis
    delete (globalThis as Record<string, unknown>).speechSynthesis

    expect(() => unlockAudio()).not.toThrow()

    ;(globalThis as Record<string, unknown>).speechSynthesis = original
  })
})
