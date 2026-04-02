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
  let reenrichingId = $state<string | null>(null)

  const activeProfile = $derived(getActiveProfile())
  const listId = $derived(page.params.id)
  const busy = $derived(addingWords || enriching || scanLoading || reenrichingId !== null)

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
    if (!list) return
    enriching = true
    try {
      const res = await supabase.functions.invoke('enrich-words', {
        body: { words: characters, language: list.language }
      })
      if (res.error) await throwFnError(res.error)
      const { enriched } = res.data as { enriched: Array<{
        character: string
        phonetic_annotation: string
        translation: string
        example: string
        example_phonetic: string
        example_translation: string
        character_note: string
      }> }
      for (let i = 0; i < wordIds.length; i++) {
        const e = enriched[i]
        const { error } = await supabase.from('words').update({
          phonetic_annotation: e.phonetic_annotation,
          translation: e.translation,
          example: e.example,
          example_phonetic: e.example_phonetic,
          example_translation: e.example_translation,
          character_note: e.character_note
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

  async function handleReenrich(word: Word) {
    reenrichingId = word.id
    try {
      await enrichWords([word.id], [word.character])
    } finally {
      reenrichingId = null
    }
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
      Enriching words with AI…
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
                onclick={() => handleReenrich(word)}
                disabled={busy}
                aria-label="Re-enrich {word.character}"
              >
                {reenrichingId === word.id ? '…' : 'Re-enrich'}
              </button>
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
    border-radius: var(--radius);
    text-decoration: none;
    font-weight: var(--font-weight-6);
  }

  a.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  .enriching-banner {
    display: none;
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-accent);
    color: var(--color-accent);
    border-radius: var(--radius);
    padding: var(--size-2) var(--size-4);
    margin-bottom: var(--size-4);
    font-size: var(--font-size-1);
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
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-4);
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
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
    border-radius: var(--radius);
    cursor: pointer;
    line-height: 1;
    transition: background var(--transition-speed);
  }

  .char-btn:hover { background: var(--color-bg); }

  .translation {
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-6);
    margin: 0;
  }

  .word-actions {
    display: flex;
    gap: var(--size-2);
    margin-top: var(--size-1);
  }

  .word-actions button {
    padding: var(--size-1) var(--size-2);
    border-radius: var(--radius);
    font-size: var(--font-size-0);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    white-space: nowrap;
  }

  .word-actions button:hover { border-color: var(--color-accent); color: var(--color-accent); }
  .word-actions button.danger:hover { border-color: var(--color-danger); color: var(--color-danger); }

  .add-section { max-width: 500px; }

  .add-form {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-6);
  }

  h2 { font-size: var(--font-size-4); margin: 0 0 var(--size-4); }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
    margin-bottom: var(--size-4);
  }

  label { font-size: var(--font-size-1); font-weight: var(--font-weight-6); }

  textarea {
    padding: var(--size-2) var(--size-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-2);
    resize: vertical;
    font-family: var(--font-body);
  }

  textarea:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
    border-color: var(--color-accent);
  }

  .error {
    display: block;
    color: var(--color-danger);
    font-size: var(--font-size-1);
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
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: none;
    border-radius: var(--radius);
    font-size: var(--font-size-2);
    font-weight: var(--font-weight-6);
  }

  button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }

  .scan-label {
    padding: var(--size-2) var(--size-4);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-2);
    cursor: pointer;
    transition: border-color var(--transition-speed);
  }

  .scan-label:hover { border-color: var(--color-accent); color: var(--color-accent); }

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
