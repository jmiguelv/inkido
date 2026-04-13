import { splitCharacters, numberedToTone } from './characters'
import { getCharsData, getWordsData } from './dictionary'
import { sanitize } from './sanitize'
import type { LlmResult, ZHWord, ZHChar } from './types'

export interface EnrichmentUpdate {
  character: string
  phonetic_annotation: string | null
  translation: string | null
  character_note: string | null
  is_llm_pinyin: boolean
  is_llm_translation: boolean
  example: string | null
  example_phonetic: string | null
  example_translation: string | null
}

function normalizePinyin(s: string | null | undefined): string | null {
  const clean = sanitize(s)
  return clean ? numberedToTone(clean) : null
}

/**
 * Logic to decide which data (Dictionary vs LLM) takes priority for a word's enrichment.
 */
export async function calculateEnrichmentUpdates(
  phrases: string[],
  llmResults: LlmResult[]
): Promise<Map<string, EnrichmentUpdate>> {
  const llmResultsMap = new Map<string, LlmResult>(llmResults.map(r => [r.word, r]))
  
  // 1. Try to find the whole words/phrases (uses cache)
  const simplifiedMap = await getWordsData(phrases)

  // 2. For characters not found as words, we'll need their individual pinyin (uses cache)
  const allChars = [...new Set(phrases.flatMap(c => splitCharacters(c)))]
  const charPinyinMap = await getWordsData(allChars)

  // 3. Get glosses for single characters (uses cache)
  const singleCharsOnly = phrases.filter(c => [...c].length === 1)
  const charMap = await getCharsData(singleCharsOnly)

  const updates = new Map<string, EnrichmentUpdate>()

  for (const ch of phrases) {
    const llmData = llmResultsMap.get(ch)

    // If LLM resolved a non-Chinese input to Chinese characters, use that
    const resolvedChar = llmData?.character ?? ch

    const w = simplifiedMap.get(resolvedChar) ?? simplifiedMap.get(ch)
    const c = charMap.get(resolvedChar) ?? charMap.get(ch)

    let pinyin = w?.pinyin ?? normalizePinyin(llmData?.pinyin) ?? null
    let translation = w?.translation ?? sanitize(llmData?.translation) ?? null
    let isLlmPinyin = !w?.pinyin && !!llmData?.pinyin
    let isLlmTranslation = !w?.translation && !!llmData?.translation

    // Fallback: if whole word pinyin is missing, combine character pinyin
    if (!pinyin && [...resolvedChar].length > 1) {
      pinyin = splitCharacters(resolvedChar)
        .map(char => charPinyinMap.get(char)?.pinyin ?? char)
        .join(' ')
      isLlmPinyin = false // It's from the local character dictionary fallback
    }

    updates.set(ch, {
      character: resolvedChar,
      phonetic_annotation: pinyin,
      translation: translation,
      character_note: c?.gloss ?? null,
      is_llm_pinyin: isLlmPinyin,
      is_llm_translation: isLlmTranslation,
      example: sanitize(llmData?.example),
      example_phonetic: normalizePinyin(llmData?.example_phonetic),
      example_translation: sanitize(llmData?.example_translation)
    })
  }

  return updates
}
