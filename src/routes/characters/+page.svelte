<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import CharacterModal from '$lib/components/CharacterModal.svelte'
  import { SvelteMap } from 'svelte/reactivity'

  type CharEntry = {
    char: string
    pinyin: string | null
    gloss: string | null
    stroke_count: number | null
    hint: string | null
  }

  let query = $state('')
  let results = $state<CharEntry[]>([])
  let searching = $state(false)
  let searched = $state(false)
  let modalChar = $state<string | null>(null)
  let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null)

  function normalize(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  async function runSearch(q: string) {
    if (!q.trim()) { results = []; searched = false; return }

    searching = true
    searched = true
    try {
      const nq = normalize(q)

      // Search zh_chars by character or gloss, and zh_words by pinyin or translation
      const [{ data: charRows }, { data: wordRows }] = await Promise.all([
        supabase
          .from('zh_chars')
          .select('char, gloss, stroke_count, hint')
          .or(`char.ilike.%${q}%,gloss.ilike.%${q}%`)
          .limit(50)
          .order('char'),
        supabase
          .from('zh_words')
          .select('word, pinyin')
          .or(`pinyin.ilike.%${nq}%,translation.ilike.%${q}%`)
          .like('word', '_')  // single characters only
          .limit(50)
      ])

      const charMap = new SvelteMap(charRows?.map(r => [r.char, r]) ?? [])
      const pinyinMap = new SvelteMap(wordRows?.map(r => [r.word, r.pinyin]) ?? [])

      // Chars found via zh_words but missing zh_chars data
      const extraChars = wordRows?.map(r => r.word).filter(w => !charMap.has(w)) ?? []
      // Chars found via zh_chars but missing pinyin
      const charsMissingPinyin = charRows?.map(r => r.char).filter(c => !pinyinMap.has(c)) ?? []

      await Promise.all([
        extraChars.length
          ? supabase.from('zh_chars').select('char, gloss, stroke_count, hint').in('char', extraChars)
              .then(({ data }) => data?.forEach(r => charMap.set(r.char, r)))
          : Promise.resolve(),
        charsMissingPinyin.length
          ? supabase.from('zh_words').select('word, pinyin').in('word', charsMissingPinyin)
              .then(({ data }) => data?.forEach(r => pinyinMap.set(r.word, r.pinyin)))
          : Promise.resolve()
      ])

      const allChars = new Set([...charMap.keys(), ...pinyinMap.keys()])

      // Exclude CJK Extension B and above (codepoints ≥ U+20000) — no common
      // font renders them and they never appear in modern Chinese text.
      results = [...allChars]
        .filter(char => (char.codePointAt(0) ?? 0) < 0x20000)
        .sort().slice(0, 60).map(char => ({
        char,
        pinyin: pinyinMap.get(char) ?? null,
        gloss: charMap.get(char)?.gloss ?? null,
        stroke_count: charMap.get(char)?.stroke_count ?? null,
        hint: charMap.get(char)?.hint ?? null
      }))
    } finally {
      searching = false
    }
  }

  function handleInput() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => runSearch(query), 300)
  }
</script>

<section>
  <div class="page-header">
    <h1>Explore</h1>
    {#if searched && !searching}
      <span class="result-count">
        {results.length}{results.length === 60 ? '+' : ''} result{results.length === 1 ? '' : 's'}
      </span>
    {/if}
  </div>

  <div class="search-bar">
    <label for="search" class="visually-hidden">Search characters</label>
    <input
      id="search"
      type="search"
      bind:value={query}
      oninput={handleInput}
      placeholder="Search by character, pinyin or meaning…"
      autocomplete="off"
      spellcheck="false"
    />
  </div>

  {#if searching}
    <p class="state-msg" aria-live="polite">Searching…</p>
  {:else if !searched}
    <p class="state-msg">Type to search {(94000).toLocaleString()} characters.</p>
  {:else if results.length === 0}
    <p class="state-msg">No characters match <strong>{query}</strong>.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th scope="col">Character</th>
          <th scope="col">Pinyin</th>
          <th scope="col">Meaning</th>
          <th scope="col">Strokes</th>
        </tr>
      </thead>
      <tbody>
        {#each results as entry (entry.char)}
          <tr>
            <td class="col-char">
              <button
                class="char-btn"
                lang="zh"
                onclick={() => modalChar = entry.char}
                aria-label="Details for {entry.char}"
              >{entry.char}</button>
            </td>
            <td class="col-phonetic" lang="zh">{entry.pinyin ?? '—'}</td>
            <td class="col-gloss">{entry.gloss ?? '—'}</td>
            <td class="col-strokes">{entry.stroke_count ?? '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

{#if modalChar}
  <CharacterModal
    character={modalChar}
    language="zh"
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

  .result-count {
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

  .char-btn {
    font-size: var(--font-size-6);
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
  }

  .col-strokes {
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
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
