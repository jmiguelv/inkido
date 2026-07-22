// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = Record<string, any>

let cachedVoices: SpeechSynthesisVoice[] = []
let voiceInitStarted = false

function getSynth(): SpeechSynthesis {
  return (globalThis as G).speechSynthesis
}

/** Start loading voices. Safari returns [] from getVoices() until voiceschanged fires. */
function initVoices(): void {
  if (voiceInitStarted) return
  voiceInitStarted = true
  const synth = getSynth()
  const update = () => {
    const v = synth.getVoices()
    if (v.length > 0) cachedVoices = v
  }
  update()
  synth.addEventListener?.('voiceschanged', update)
}

/** Pick the best voice for a BCP-47 language tag. */
function pickVoice(language: string): SpeechSynthesisVoice | undefined {
  const synth = getSynth()
  const voices = synth.getVoices?.() ?? cachedVoices
  return voices.find(v => v.lang === language)
    ?? voices.find(v => v.lang.startsWith(language))
}

let keepAlive: ReturnType<typeof setInterval> | null = null

function clearKeepAlive(): void {
  if (keepAlive) {
    clearInterval(keepAlive)
    keepAlive = null
  }
}

export function speak(text: string, language: string, rate = 0.75): void {
  if (!('speechSynthesis' in globalThis)) {
    throw new Error('speechSynthesis is not available')
  }
  const synth = getSynth()
  initVoices()

  clearKeepAlive()
  synth.cancel()

  const Ctor = (globalThis as G).SpeechSynthesisUtterance as new (t: string) => SpeechSynthesisUtterance
  const utterance = new Ctor(text)
  utterance.lang = language
  utterance.rate = rate
  utterance.volume = 1

  // iPadOS Safari requires an explicit voice — lang alone is unreliable
  const voice = pickVoice(language)
  if (voice) {
    utterance.voice = voice
  }

  // Keep-alive: iOS/Chrome cut off speech after ~15s; pause+resume resets the timer
  utterance.onstart = () => {
    keepAlive = setInterval(() => {
      if (synth.speaking && !synth.paused) {
        synth.pause()
        synth.resume()
      }
    }, 14_000)
  }
  utterance.onend = clearKeepAlive
  utterance.onerror = clearKeepAlive

  synth.speak(utterance)
}

export function unlockAudio(): void {
  if (!('speechSynthesis' in globalThis)) return
  const synth = getSynth()
  synth.cancel()
  initVoices()
  // Use a space, not empty string — more reliable on iPadOS Safari
  const Ctor = (globalThis as G).SpeechSynthesisUtterance as new (t: string) => SpeechSynthesisUtterance
  const u = new Ctor(' ')
  u.volume = 0
  synth.speak(u)
}
