export interface Profile {
  id: string
  parent_id: string
  name: string
  created_at: string
}

export interface WordList {
  id: string
  profile_id: string
  name: string
  language: string        // BCP 47
  last_practiced: string | null
  created_at: string
}

export interface Word {
  id: string
  list_id: string
  character: string
  phonetic_annotation: string | null
  translation: string | null
  example: string | null
  example_phonetic: string | null
  example_translation: string | null
  character_note: string | null
  is_llm_pinyin: boolean
  is_llm_translation: boolean
  sort_order: number
  created_at: string
}

export interface ZHWord {
  word: string
  traditional: string | null
  pinyin: string | null
  pinyin_search: string | null
  translation: string | null
  hsk_level: number | null
}

export interface ZHChar {
  char: string
  gloss: string | null
  stroke_count: number | null
  hint: string | null
  components: { character: string; type: string[] }[] | null
  stroke_fragments: number[][] | null
  trad_variant: string | null
}

export interface UserPreferences {
  speechRate: number    // 0.25 – 1.0
}

export interface ToneStat {
  id: string
  profile_id: string
  character: string
  expected_tone: number
  selected_tone: number
  correct: boolean
  created_at: string
}
