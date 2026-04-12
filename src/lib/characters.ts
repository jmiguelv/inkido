/** Splits a string into an array of Unicode characters (handles surrogate pairs). */
export function splitCharacters(text: string): string[] {
  return [...text]
}

/** Strips diacritical marks (accents) and converts to lowercase. */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Checks if a character is a Chinese Han character. */
export function isChineseCharacter(char: string): boolean {
  return /\p{Script=Han}/u.test(char)
}

/** Aligns characters with their corresponding pinyin syllable, skipping non-Han characters (like punctuation). */
export function alignPinyin(character: string, pinyin: string | null | undefined): Array<{ char: string; pinyin: string | null }> {
  const chars = splitCharacters(character)
  const syllables = pinyin?.trim().split(/\s+/) ?? []
  
  const aligned: Array<{ char: string; pinyin: string | null }> = []
  let pinyinIdx = 0
  
  for (const char of chars) {
    if (isChineseCharacter(char)) {
      aligned.push({ char, pinyin: syllables[pinyinIdx] ?? null })
      pinyinIdx++
    } else {
      aligned.push({ char, pinyin: null })
    }
  }
  
  return aligned
}

/** Tone diacritics mapping for Mandarin. */
const toneMarks: Record<number, string> = {
  1: 'āēīōūǖ',
  2: 'áéíóúǘ',
  3: 'ǎěǐǒǔǚ',
  4: 'àèìòùǜ',
}

const TONE_VOWELS: Record<string, string[]> = {
  a: ['ā','á','ǎ','à'],
  e: ['ē','é','ě','è'],
  i: ['ī','í','ǐ','ì'],
  o: ['ō','ó','ǒ','ò'],
  u: ['ū','ú','ǔ','ù'],
  ü: ['ǖ','ǘ','ǚ','ǜ'],
  v: ['ǖ','ǘ','ǚ','ǜ'],
}

function applyToneMark(syllable: string, tone: number): string {
  if (tone < 1 || tone > 4) return syllable
  const s = syllable.toLowerCase()
  // Rule 1: 'a' or 'e' always gets the mark
  const aeMatch = s.match(/[ae]/)
  if (aeMatch) {
    return syllable.replace(/[ae]/i, v => TONE_VOWELS[v.toLowerCase()][tone - 1])
  }
  // Rule 2: 'ou' → 'o' gets the mark
  if (s.includes('ou')) {
    return syllable.replace(/o/i, v => TONE_VOWELS['o'][tone - 1])
  }
  // Rule 3: last vowel gets the mark
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i]
    if (c in TONE_VOWELS) {
      return syllable.slice(0, i) + TONE_VOWELS[c][tone - 1] + syllable.slice(i + 1)
    }
  }
  return syllable
}

/**
 * Converts numbered pinyin to diacritic form.
 * e.g. "yi2 ge4 ren2" → "yí gè rén"
 * Already-diacritic input is returned unchanged.
 */
export function numberedToTone(pinyin: string): string {
  if (!/[1-5]/.test(pinyin)) return pinyin
  return pinyin.replace(/([a-züv]+)([1-5])/gi, (_, syllable, toneStr) => {
    return applyToneMark(syllable, parseInt(toneStr))
  })
}

/** Extracts the Mandarin tone number (1-5) from a pinyin syllable. Returns 5 for neutral tone. */
export function getTone(pinyin: string | null | undefined): number {
  if (!pinyin) return 5
  const cleanPinyin = pinyin.toLowerCase().normalize('NFC')
  for (const [tone, marks] of Object.entries(toneMarks)) {
    for (const mark of [...marks.normalize('NFC')]) {
      if (cleanPinyin.includes(mark)) return parseInt(tone)
    }
  }
  // Fallback: numbered pinyin (e.g. "yi2" → 2) for legacy DB values
  const numbered = cleanPinyin.match(/[1-4]/)
  if (numbered) return parseInt(numbered[0])
  return 5
}
