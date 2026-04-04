/** Splits a string into an array of Unicode characters (handles surrogate pairs). */
export function splitCharacters(text: string): string[] {
  return [...text]
}

/** Strips diacritical marks (accents) and converts to lowercase. */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
