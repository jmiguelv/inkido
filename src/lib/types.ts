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
  sort_order: number
  created_at: string
}

export interface UserPreferences {
  speechRate: number    // 0.25 – 1.0
}
