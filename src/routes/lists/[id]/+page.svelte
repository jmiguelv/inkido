<script lang="ts">
  import { page } from '$app/state'
  import { supabase } from '$lib/supabase'
  import { FunctionsHttpError } from '@supabase/supabase-js'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte'
  import { onMount } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import CharacterModal from '$lib/components/CharacterModal.svelte'
  import { splitCharacters } from '$lib/characters'
  import type { Word, WordList } from '$lib/types'

  let list = $state<WordList | null>(null)
  let words = $state<Word[]>([])
  let newWordsText = $state('')
  let errorMsg = $state('')
  let enriching = $state(false)
  let addingWords = $state(false)
  let scanLoading = $state(false)
  let strokeMap = new SvelteMap<string, number>()
  const activeProfile = $derived(getActiveProfile())
  const listId = $derived(page.params.id)
  const busy = $derived(addingWords || enriching || scanLoading)

  let modalChar = $state<{ char: string } | null>(null)

  async function loadStrokeCounts(wordList: Word[]) {
    const allChars = [...new Set(wordList.flatMap(w => splitCharacters(w.character)))]
    if (!allChars.length) return
    const { data } = await supabase
      .from('zh_chars')
      .select('char, stroke_count')
      .in('char', allChars)
    data?.forEach(r => { if (r.stroke_count != null) strokeMap.set(r.char, r.stroke_count) })
  }

  function strokeClass(character: string): string {
    const chars = splitCharacters(character)
    const known = chars.filter(c => strokeMap.has(c))
    if (known.length === 0) return 'stroke-lemon'
    const avg = known.reduce((sum, c) => sum + strokeMap.get(c)!, 0) / known.length
    if (avg <= 7)  return 'stroke-mint'
    if (avg <= 11) return 'stroke-sky'
    if (avg <= 16) return 'stroke-lavender'
    return 'stroke-rose'
  }

  async function loadList() {
    const { data, error } = await supabase.from('word_lists').select('*').eq('id', listId).single()
    if (error) throw error
    list = data as WordList
  }

  async function loadWords() {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('list_id', listId)
      .order('sort_order')
      .order('created_at')
    if (error) throw error
    words = data as Word[]
    await loadStrokeCounts(words)
  }

  async function throwFnError(error: unknown): Promise<never> {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      throw new Error(body?.message ?? body?.error ?? (error as Error).message)
    }
    throw error
  }

  async function enrichWords(wordIds: string[], characters: string[]) {
    enriching = true
    try {
      // 1. Try to find the whole words/phrases
      const { data: wordRows } = await supabase
        .from('zh_words')
        .select('word, traditional, pinyin, translation')
        .or(`word.in.(${characters.map(c => `"${c}"`).join(',')}),traditional.in.(${characters.map(c => `"${c}"`).join(',')})`)

      const simplifiedMap = new Map(wordRows?.map(r => [r.word, r]) ?? [])
      const traditionalMap = new Map(wordRows?.filter(r => r.traditional).map(r => [r.traditional, r]) ?? [])

      // 2. For characters not found as words, we'll need their individual pinyin
      const allChars = [...new Set(characters.flatMap(c => splitCharacters(c)))]
      const { data: charPinyinRows } = await supabase
        .from('zh_words')
        .select('word, pinyin')
        .in('word', allChars)
        .like('word', '_') // single chars only
      const charPinyinMap = new Map(charPinyinRows?.map(r => [r.word, r.pinyin]) ?? [])

      // 3. Get glosses for single characters
      const singleCharsOnly = characters.filter(c => [...c].length === 1)
      const { data: charRows } = singleCharsOnly.length
        ? await supabase.from('zh_chars').select('char, gloss').in('char', singleCharsOnly)
        : { data: [] }
      const charMap = new Map(charRows?.map(r => [r.char, r]) ?? [])

      // 4. Identify phrases missing from the local dictionary
      const missingPhrases = characters.filter(ch => {
        const w = simplifiedMap.get(ch) ?? traditionalMap.get(ch)
        return !w || !w.translation
      })

      // 5. Query the LLM Edge Function for missing phrases
      const llmResultsMap = new Map<string, { pinyin: string; translation: string }>()
      if (missingPhrases.length > 0 && list) {
        try {
          const res = await supabase.functions.invoke('enrich-words', {
            body: { phrases: missingPhrases, language: list.language }
          })
          if (res.error) throw res.error
          const { results } = res.data as { results: { word: string; pinyin: string; translation: string }[] }
          results.forEach(r => llmResultsMap.set(r.word, r))
        } catch (e) {
          console.error("LLM Enrichment failed:", e)
        }
      }

      for (let i = 0; i < wordIds.length; i++) {
        const ch = characters[i]
        const w = simplifiedMap.get(ch) ?? traditionalMap.get(ch)
        const c = charMap.get(ch)
        const llmData = llmResultsMap.get(ch)

        let pinyin = llmData?.pinyin ?? w?.pinyin ?? null
        let translation = llmData?.translation ?? w?.translation ?? null
        let isLlmPinyin = !!llmData?.pinyin
        let isLlmTranslation = !!llmData?.translation

        // Fallback: if whole word pinyin is missing, combine character pinyin
        if (!pinyin && [...ch].length > 1) {
          const parts = splitCharacters(ch).map(char => charPinyinMap.get(char) ?? char)
          pinyin = parts.join(' ')
          isLlmPinyin = false // It's from the local character dictionary fallback
        }

        const { error } = await supabase.from('words').update({
          phonetic_annotation: pinyin,
          translation: translation,
          character_note: c?.gloss ?? null,
          is_llm_pinyin: isLlmPinyin,
          is_llm_translation: isLlmTranslation,
          example: null,
          example_phonetic: null,
          example_translation: null
        }).eq('id', wordIds[i])
        if (error) throw error
      }
      await loadWords()
    } finally {
      enriching = false
    }
  }

  async function handleAddWords() {
    if (!newWordsText.trim()) return
    errorMsg = ''
    addingWords = true
    try {
      const characters = newWordsText
        .split(/[,\n]/)
        .map(w => w.trim())
        .filter(w => w.length > 0)

      const inserts = characters.map((character, i) => ({
        list_id: listId,
        character,
        sort_order: words.length + i
      }))

      const { data, error } = await supabase.from('words').insert(inserts).select('id, character')
      if (error) throw error

      newWordsText = ''
      await loadWords()

      const ids = (data as { id: string; character: string }[]).map(r => r.id)
      const chars = (data as { id: string; character: string }[]).map(r => r.character)
      await enrichWords(ids, chars)
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to add words'
    } finally {
      addingWords = false
    }
  }

  async function handleDeleteWord(id: string) {
    const { error } = await supabase.from('words').delete().eq('id', id)
    if (error) throw error
    await loadWords()
  }

  async function handlePhotoScan(event: Event) {
    if (!list) return
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    scanLoading = true
    errorMsg = ''
    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await supabase.functions.invoke('extract-from-image', {
        body: { base64Image, language: list.language }
      })
      if (res.error) await throwFnError(res.error)
      const { characters } = res.data as { characters: string[] }
      newWordsText = characters.join('\n')
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to scan image'
    } finally {
      scanLoading = false
      input.value = ''
    }
  }

  async function handleReEnrichAll() {
    if (words.length === 0) return
    errorMsg = ''
    try {
      const ids = words.map(w => w.id)
      const chars = words.map(w => w.character)
      await enrichWords(ids, chars)
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to re-lookup words'
    }
  }

  onMount(() => {
    if (!activeProfile) { goto('/'); return }
  })

  $effect(() => {
    if (activeProfile?.id) {
      loadList()
      loadWords()
    }
  })
</script>

<section>
  {#if list}
    <div class="list-header">
      <div class="list-title">
        <a href="/lists" class="back-link" class:disabled={busy} onclick={(e) => { if (busy) e.preventDefault() }}>← Lists</a>
        <h1>{list.name}</h1>
        <span class="list-lang">{list.language.toUpperCase()}</span>
      </div>
      <div class="header-actions">
        <button class="relookup-btn" disabled={busy || words.length === 0} onclick={handleReEnrichAll} aria-label="Re-lookup words">
          ↻ Re-lookup
        </button>
        <a href="/lists/{list.id}/practice" class="practice-link" class:disabled={busy || words.length === 0} onclick={(e) => { if (busy || words.length === 0) e.preventDefault() }}>Practice →</a>
      </div>
    </div>

    <div
      class="enriching-banner"
      aria-live="polite"
      class:visible={enriching}
    >
      Looking up words…
    </div>
  {/if}

  {#if words.length === 0}
    <p>No words yet. Add some below.</p>
  {:else}
    <ul class="word-list">
      {#each words as word (word.id)}
        <li>
          <article class="word-card {strokeClass(word.character)}">
            {#if word.phonetic_annotation}
              <p class="word-phonetic">
                {word.phonetic_annotation}
                {#if word.is_llm_pinyin}<span class="llm-badge" title="Generated by AI">✨</span>{/if}
              </p>
            {/if}
            <div class="char-row">
              {#each splitCharacters(word.character) as char, i (i)}
                <button
                  class="char-btn"
                  onclick={() => modalChar = { char }}
                  aria-label="Details for {char}"
                  lang={list?.language ?? 'zh'}
                >{char}</button>
              {/each}
            </div>
            {#if word.translation}
              <p class="translation">
                {word.translation}
                {#if word.is_llm_translation}<span class="llm-badge" title="Generated by AI">✨</span>{/if}
              </p>
            {/if}
            <a href="/words/{word.id}" class="detail-link" aria-label="Full details for {word.character}">Detail →</a>
            <button
              class="delete-btn"
              onclick={() => handleDeleteWord(word.id)}
              disabled={busy}
              aria-label="Delete {word.character}"
            >×</button>
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  {#if modalChar}
    <CharacterModal
      character={modalChar.char}
      language={list?.language ?? 'zh'}
      onclose={() => modalChar = null}
    />
  {/if}

  <div class="add-section">
    <form onsubmit={(e) => { e.preventDefault(); handleAddWords() }} class="add-form">
      <h2>Add words</h2>
      <div class="field">
        <label for="new-words">Words (comma or newline separated)</label>
        <textarea
          id="new-words"
          bind:value={newWordsText}
          rows={4}
          placeholder="你好&#10;学习&#10;朋友"
        ></textarea>
      </div>
      {#if errorMsg}
        <output role="alert" class="error">{errorMsg}</output>
      {/if}
      <div class="form-actions">
        <button type="submit" disabled={addingWords || enriching}>
          {addingWords ? 'Adding…' : 'Add words'}
        </button>
        <label class="scan-label" aria-busy={scanLoading}>
          {scanLoading ? 'Scanning…' : 'Scan worksheet'}
          <input
            type="file"
            accept="image/*"
            onchange={handlePhotoScan}
            disabled={scanLoading}
            class="visually-hidden"
          />
        </label>
      </div>
    </form>
  </div>
</section>

<style>
  .list-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--size-4);
    margin-bottom: var(--size-6);
    flex-wrap: wrap;
  }

  .list-title {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
  }

  .back-link {
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-decoration: none;
    color: var(--color-text-muted);
  }

  .back-link:hover { color: var(--color-text); }

  h1 {
    font-size: var(--font-size-8);
    margin: 0;
    line-height: 1;
  }

  .list-lang {
    font-size: var(--font-size-0);
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--size-3);
    flex-wrap: wrap;
  }

  .relookup-btn {
    padding: var(--size-2) var(--size-4);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
    white-space: nowrap;
  }

  .relookup-btn:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .relookup-btn:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .relookup-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .practice-link {
    background: var(--color-accent);
    color: var(--color-accent-fg);
    padding: var(--size-2) var(--size-4);
    border: var(--border);
    text-decoration: none;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
    white-space: nowrap;
    align-self: flex-start;
  }

  .practice-link:hover {
    transform: translate(-2px, -2px);
    box-shadow: 5px 5px 0 var(--color-border);
    text-decoration: none;
  }

  .practice-link:active {
    transform: translate(0, 0);
    box-shadow: none;
  }

  a.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  .enriching-banner {
    display: none;
    background: var(--color-lemon);
    border: var(--border);
    border-radius: 0;
    padding: var(--size-2) var(--size-4);
    margin-bottom: var(--size-4);
    font-size: var(--font-size-1);
    font-weight: 700;
  }

  .enriching-banner.visible { display: block; }

  .word-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--size-6);
    display: grid;
    gap: var(--size-3);
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .word-card {
    border: var(--border);
    padding: var(--size-4);
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
    box-shadow: var(--shadow-sm);
    position: relative;
    min-width: 0;
    container-type: inline-size;
  }

  .word-card.stroke-mint     { background: var(--color-mint); }
  .word-card.stroke-sky      { background: var(--color-sky); }
  .word-card.stroke-lavender { background: var(--color-lavender); }
  .word-card.stroke-rose     { background: var(--color-rose); }
  .word-card.stroke-lemon    { background: var(--color-lemon); }

  .word-phonetic {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
    margin: 0;
    overflow-wrap: break-word;
    display: flex;
    align-items: center;
    gap: var(--size-1);
  }

  .llm-badge {
    font-size: 0.8em;
    cursor: help;
  }

  .char-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0;
  }

  .char-btn {
    font-size: clamp(var(--font-size-3), 10cqi, var(--font-size-6));
    background: none;
    border: none;
    padding: var(--size-1) 0;
    border-radius: 0;
    cursor: pointer;
    line-height: 1;
    transition: color var(--transition-speed);
  }

  .char-btn:hover { color: var(--color-accent-2); }

  .translation {
    font-size: var(--font-size-1);
    font-weight: 700;
    margin: 0;
    overflow-wrap: break-word;
    display: flex;
    align-items: center;
    gap: var(--size-1);
  }

  .delete-btn {
    position: absolute;
    top: var(--size-1);
    right: var(--size-1);
    background: none;
    border: none;
    box-shadow: none;
    font-size: var(--font-size-3);
    line-height: 1;
    padding: var(--size-1);
    color: var(--color-text);
    opacity: 0.2;
    cursor: pointer;
  }

  .delete-btn:hover:not(:disabled) {
    opacity: 1;
    color: var(--color-danger);
    transform: none;
    box-shadow: none;
  }

  .delete-btn:disabled {
    cursor: not-allowed;
  }

  .detail-link {
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-decoration: none;
    color: var(--color-text-muted);
    margin-top: auto;
  }

  .detail-link:hover {
    color: var(--color-text);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .add-section { max-width: 500px; }

  .add-form {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    padding: var(--size-6);
    box-shadow: var(--shadow);
  }

  h2 { font-size: var(--font-size-4); margin: 0 0 var(--size-4); }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
    margin-bottom: var(--size-4);
  }

  label {
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  textarea {
    padding: var(--size-2) var(--size-3);
    font-size: var(--font-size-2);
    resize: vertical;
  }

  .error {
    display: block;
    color: var(--color-danger);
    font-size: var(--font-size-1);
    font-weight: 700;
    margin-bottom: var(--size-3);
  }

  .form-actions {
    display: flex;
    gap: var(--size-3);
    align-items: center;
    flex-wrap: wrap;
  }

  button[type="submit"] {
    padding: var(--size-2) var(--size-5);
    font-size: var(--font-size-2);
  }

  .scan-label {
    padding: var(--size-2) var(--size-4);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-2);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
  }

  .scan-label:hover {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .scan-label:active {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
