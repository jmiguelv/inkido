<script lang="ts">
  import { page } from '$app/state'
  import { supabase } from '$lib/supabase.ts'
  import { FunctionsHttpError } from '@supabase/supabase-js'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte.ts'
  import { onMount } from 'svelte'
  import CharacterModal from '$lib/components/CharacterModal.svelte'
  import { splitCharacters } from '$lib/characters.ts'
  import type { Word, WordList } from '$lib/types.ts'

  let list = $state<WordList | null>(null)
  let words = $state<Word[]>([])
  let newWordsText = $state('')
  let errorMsg = $state('')
  let enriching = $state(false)
  let addingWords = $state(false)
  let scanLoading = $state(false)
  const activeProfile = $derived(getActiveProfile())
  const listId = $derived(page.params.id)
  const busy = $derived(addingWords || enriching || scanLoading)

  let modalChar = $state<{ char: string } | null>(null)

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
      const { data: wordRows } = await supabase
        .from('zh_words')
        .select('word, pinyin, translation')
        .in('word', characters)

      const wordMap = new Map(wordRows?.map(r => [r.word, r]) ?? [])

      const singleChars = characters.filter(c => [...c].length === 1)
      const { data: charRows } = singleChars.length
        ? await supabase.from('zh_chars').select('char, gloss').in('char', singleChars)
        : { data: [] }
      const charMap = new Map(charRows?.map(r => [r.char, r]) ?? [])

      for (let i = 0; i < wordIds.length; i++) {
        const ch = characters[i]
        const w = wordMap.get(ch)
        const c = charMap.get(ch)
        const { error } = await supabase.from('words').update({
          phonetic_annotation: w?.pinyin ?? null,
          translation: w?.translation ?? null,
          character_note: c?.gloss ?? null,
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

  onMount(() => {
    if (!activeProfile) { goto('/'); return }
    loadList()
    loadWords()
  })
</script>

<section>
  {#if list}
    <div class="list-header">
      <h1>{list.name}</h1>
      <a href="/lists/{list.id}/practice" class="practice-link" class:disabled={busy} onclick={(e) => { if (busy) e.preventDefault() }}>Practice</a>
      <a href="/lists" class:disabled={busy} onclick={(e) => { if (busy) e.preventDefault() }}>← All lists</a>
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
          <article class="word-card">
            {#if word.phonetic_annotation}
              <p class="word-phonetic">{word.phonetic_annotation}</p>
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
              <p class="translation">{word.translation}</p>
            {/if}
            <div class="word-actions">
              <button
                class="danger"
                onclick={() => handleDeleteWord(word.id)}
                disabled={busy}
                aria-label="Delete {word.character}"
              >Delete</button>
            </div>
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
    align-items: baseline;
    gap: var(--size-4);
    margin-bottom: var(--size-6);
    flex-wrap: wrap;
  }

  h1 {
    font-size: var(--font-size-8);
    margin: 0;
  }

  .practice-link {
    background: var(--color-accent);
    color: var(--color-accent-fg);
    padding: var(--size-2) var(--size-4);
    border: var(--border);
    border-radius: 0;
    text-decoration: none;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
  }

  .practice-link:hover {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
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
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
  }

  .word-card {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    padding: var(--size-4);
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
    box-shadow: var(--shadow-sm);
  }

  .word-phonetic {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
    margin: 0;
  }

  .char-row {
    display: flex;
    flex-direction: row;
  }

  .char-btn {
    font-size: var(--font-size-7);
    background: none;
    border: none;
    padding: var(--size-1);
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
  }

  .word-actions {
    display: flex;
    gap: var(--size-2);
    margin-top: var(--size-1);
  }

  .word-actions button {
    padding: var(--size-1) var(--size-2);
    border-radius: 0;
    font-size: var(--font-size-0);
    font-weight: 700;
    border: var(--border);
    background: var(--color-surface);
    color: var(--color-text);
    white-space: nowrap;
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .word-actions button:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 1px 1px 0 var(--color-border);
  }

  .word-actions button:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .word-actions button.danger:hover {
    background: var(--color-danger);
    color: var(--color-danger-fg);
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
