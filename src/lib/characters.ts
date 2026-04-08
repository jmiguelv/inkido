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

/** Extracts the Mandarin tone number (1-5) from a pinyin syllable. Returns 5 for neutral tone. */
export function getTone(pinyin: string | null | undefined): number {
  if (!pinyin) return 5
  const cleanPinyin = pinyin.toLowerCase().normalize('NFC')
  for (const [tone, marks] of Object.entries(toneMarks)) {
    for (const mark of [...marks.normalize('NFC')]) {
      if (cleanPinyin.includes(mark)) return parseInt(tone)
    }
  }
  return 5 // Neutral
}
