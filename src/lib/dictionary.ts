import { SvelteMap } from 'svelte/reactivity'
import { supabase } from './supabase'
import type { ZHWord, ZHChar } from './types'

const charCache = new SvelteMap<string, ZHChar>()
const wordCache = new SvelteMap<string, ZHWord>()

/**
 * Fetch character data with caching.
 */
export async function getCharData(char: string): Promise<ZHChar | null> {
  if (charCache.has(char)) return charCache.get(char)!
  
  const { data } = await supabase
    .from('zh_chars')
    .select('char, gloss, stroke_count, hint, components, trad_variant')
    .eq('char', char)
    .maybeSingle()
    
  if (data) {
    charCache.set(char, data as ZHChar)
    return data as ZHChar
  }
  return null
}

/**
 * Fetch word data with caching (checks simplified and traditional).
 */
export async function getWordData(word: string): Promise<ZHWord | null> {
  if (wordCache.has(word)) return wordCache.get(word)!
  
  const { data } = await supabase
    .from('zh_words')
    .select('word, traditional, pinyin, translation, hsk_level')
    .or(`word.eq."${word}",traditional.eq."${word}"`)
    .maybeSingle()
    
  if (data) {
    const zhWord = data as ZHWord
    wordCache.set(zhWord.word, zhWord)
    if (zhWord.traditional) wordCache.set(zhWord.traditional, zhWord)
    return zhWord
  }
  return null
}

/**
 * Bulk fetch character data with caching.
 */
export async function getCharsData(chars: string[]): Promise<Map<string, ZHChar>> {
  const uniqueChars = [...new Set(chars)]
  const missing = uniqueChars.filter(c => !charCache.has(c))
  
  if (missing.length > 0) {
    const { data } = await supabase
      .from('zh_chars')
      .select('char, gloss, stroke_count, hint, components, trad_variant')
      .in('char', missing)
      
    data?.forEach(r => charCache.set(r.char, r as ZHChar))
  }
  
  const result = new Map<string, ZHChar>()
  uniqueChars.forEach(c => {
    const d = charCache.get(c)
    if (d) result.set(c, d)
  })
  return result
}

/**
 * Bulk fetch word data with caching.
 */
export async function getWordsData(words: string[]): Promise<Map<string, ZHWord>> {
  const uniqueWords = [...new Set(words)]
  const missing = uniqueWords.filter(w => !wordCache.has(w))
  
  if (missing.length > 0) {
    // Supabase .in() with .or() for two columns
    const { data } = await supabase
      .from('zh_words')
      .select('word, traditional, pinyin, translation, hsk_level')
      .or(`word.in.(${missing.map(m => `"${m}"`).join(',')}),traditional.in.(${missing.map(m => `"${m}"`).join(',')})`)
      
    data?.forEach(r => {
      const zhWord = r as ZHWord
      wordCache.set(zhWord.word, zhWord)
      if (zhWord.traditional) wordCache.set(zhWord.traditional, zhWord)
    })
  }
  
  const result = new Map<string, ZHWord>()
  uniqueWords.forEach(w => {
    const d = wordCache.get(w)
    if (d) result.set(w, d)
  })
  return result
}
