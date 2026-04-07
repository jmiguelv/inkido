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
