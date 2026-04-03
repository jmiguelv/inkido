<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte.ts'
  import { onMount } from 'svelte'
  import { splitCharacters } from '$lib/characters.ts'
  import CharacterModal from '$lib/components/CharacterModal.svelte'
  import type { Word, WordList } from '$lib/types.ts'

  type WordEntry = Word & { listName: string; language: string }

  const activeProfile = $derived(getActiveProfile())

  let words = $state<WordEntry[]>([])
  let loading = $state(true)
  let query = $state('')
  let modalChar = $state<{ char: string; language: string } | null>(null)

  // Strip diacritic marks for tone-insensitive pinyin search
  function normalize(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  const filtered = $derived(
    query.trim()
      ? words.filter(w => {
          const q = normalize(query)
          return (
            w.character.includes(query) ||
            normalize(w.phonetic_annotation ?? '').includes(q) ||
            normalize(w.translation ?? '').includes(q)
          )
        })
      : words
  )

  async function loadWords() {
    if (!activeProfile) return
    loading = true
    try {
      const { data: lists, error: listsError } = await supabase
        .from('word_lists')
        .select('id, name, language')
        .eq('profile_id', activeProfile.id)
      if (listsError) throw listsError

      const listMap = new Map<string, WordList>(lists?.map(l => [l.id, l as WordList]) ?? [])
      const listIds = [...listMap.keys()]

      if (!listIds.length) { words = []; return }

      const { data, error } = await supabase
        .from('words')
        .select('*')
        .in('list_id', listIds)
        .order('character')
      if (error) throw error

      words = (data as Word[]).map(w => ({
        ...w,
        listName: listMap.get(w.list_id)?.name ?? '',
        language: listMap.get(w.list_id)?.language ?? 'zh'
      }))
    } finally {
      loading = false
    }
  }

  onMount(() => {
    if (!activeProfile) { goto('/'); return }
    loadWords()
  })
</script>

<section>
  <div class="page-header">
    <h1>My Words</h1>
    {#if !loading}
      <span class="word-count">
        {filtered.length}{query.trim() ? ` of ${words.length}` : ''} word{words.length === 1 ? '' : 's'}
      </span>
    {/if}
  </div>

  <div class="search-bar">
    <label for="search" class="visually-hidden">Search words</label>
    <input
      id="search"
      type="search"
      bind:value={query}
      placeholder="Search by character, pinyin or meaning…"
      autocomplete="off"
      spellcheck="false"
    />
  </div>

  {#if loading}
    <p class="state-msg" aria-live="polite">Loading…</p>
  {:else if words.length === 0}
    <p class="state-msg">No words yet. Add some from a <a href="/lists">list</a>.</p>
  {:else if filtered.length === 0}
    <p class="state-msg">No words match <strong>{query}</strong>.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th scope="col">Character</th>
          <th scope="col">Pinyin</th>
          <th scope="col">Meaning</th>
          <th scope="col">List</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as word (word.id)}
          <tr>
            <td class="col-char">
              <div class="char-row">
                {#each splitCharacters(word.character) as char, i (i)}
                  <button
                    class="char-btn"
                    lang={word.language}
                    onclick={() => modalChar = { char, language: word.language }}
                    aria-label="Details for {char}"
                  >{char}</button>
                {/each}
              </div>
            </td>
            <td class="col-phonetic" lang={word.language}>{word.phonetic_annotation ?? '—'}</td>
            <td class="col-translation">{word.translation ?? '—'}</td>
            <td class="col-list">
              <a href="/lists/{word.list_id}" class="list-badge">{word.listName}</a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

{#if modalChar}
  <CharacterModal
    character={modalChar.char}
    language={modalChar.language}
    onclose={() => modalChar = null}
  />
{/if}

<style>
  .page-header {
    display: flex;
    align-items: baseline;
    gap: var(--size-4);
    margin-bottom: var(--size-6);
  }

  h1 {
    font-size: var(--font-size-8);
    margin: 0;
  }

  .word-count {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
  }

  .search-bar {
    margin-bottom: var(--size-5);
  }

  input[type="search"] {
    width: 100%;
    max-width: 480px;
    padding: var(--size-2) var(--size-4);
    border-radius: 0;
    font-size: var(--font-size-2);
  }

  .state-msg {
    color: var(--color-text-muted);
    font-size: var(--font-size-2);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-1);
  }

  thead th {
    text-align: left;
    padding: var(--size-2) var(--size-3);
    border-bottom: var(--border);
    font-size: var(--font-size-0);
    font-weight: 800;
    font-family: var(--font-display);
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  tbody tr {
    border-bottom: var(--border);
    transition: background var(--transition-speed);
  }

  tbody tr:hover { background: var(--color-sky); }

  tbody td {
    padding: var(--size-2) var(--size-3);
    vertical-align: middle;
  }

  .char-row {
    display: flex;
    flex-direction: row;
    gap: var(--size-1);
  }

  .char-btn {
    font-size: var(--font-size-5);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    line-height: 1;
    transition: color var(--transition-speed);
  }

  .char-btn:hover { color: var(--color-accent-2); }

  .col-phonetic {
    color: var(--color-text-muted);
    font-size: var(--font-size-1);
  }

  .col-translation {
    font-size: var(--font-size-2);
  }

  .list-badge {
    display: inline-block;
    padding: var(--size-1) var(--size-2);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-0);
    font-weight: 700;
    color: var(--color-text);
    text-decoration: none;
    white-space: nowrap;
    transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease, background var(--transition-speed);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .list-badge:hover {
    background: var(--color-lemon);
    transform: translate(-1px, -1px);
    box-shadow: 2px 2px 0 var(--color-border);
    text-decoration: none;
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
