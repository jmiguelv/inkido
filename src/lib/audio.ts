// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = Record<string, any>

export function speak(text: string, language: string, rate = 0.75): void {
  if (!('speechSynthesis' in globalThis)) {
    throw new Error('speechSynthesis is not available')
  }
  ;(globalThis as G).speechSynthesis.cancel()
  const Ctor = (globalThis as G).SpeechSynthesisUtterance as new (t: string) => SpeechSynthesisUtterance
  const utterance = new Ctor(text)
  utterance.lang = language
  utterance.rate = rate
  ;(globalThis as G).speechSynthesis.speak(utterance)
}

export function unlockAudio(): void {
  if (!('speechSynthesis' in globalThis)) return
  const Ctor = (globalThis as G).SpeechSynthesisUtterance as new (t: string) => SpeechSynthesisUtterance
  const u = new Ctor('')
  u.volume = 0
  ;(globalThis as G).speechSynthesis.speak(u)
}
