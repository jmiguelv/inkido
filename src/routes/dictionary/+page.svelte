<script lang="ts">
  import { supabase } from '$lib/supabase'
  import CharacterModal from '$lib/components/CharacterModal.svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import { stripDiacritics } from '$lib/characters'
  import { speak } from '$lib/audio'
  import { getCharsData, getHoverStrokeClass } from '$lib/dictionary'

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

  async function runSearch(q: string) {
    if (!q.trim()) { results = []; searched = false; return }

    searching = true
    searched = true
    try {
      const nq = stripDiacritics(q)

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
          .or(`pinyin_search.ilike.%${nq}%,translation.ilike.%${q}%`)
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
      const resultChars = results.map(r => r.char)
      if (resultChars.length > 0) {
        await getCharsData(resultChars)
      }
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
  <hgroup class="page-header">
    <div class="title-group">
      <h1>Dictionary</h1>
      <p><small>Search {(94000).toLocaleString()} characters by pinyin, meaning or stroke count.</small></p>
    </div>
    {#if searched && !searching}
      <span class="result-count">
        {results.length}{results.length === 60 ? '+' : ''} result{results.length === 1 ? '' : 's'}
      </span>
    {/if}
  </hgroup>

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
    <div class="table-wrapper">
      <table class="char-table">
        <thead>
          <tr>
            <th scope="col">Char</th>
            <th scope="col">Play</th>
            <th scope="col">Pinyin</th>
            <th scope="col">Meaning</th>
            <th scope="col">Strokes</th>
          </tr>
        </thead>
        <tbody>
          {#each results as entry (entry.char)}
            <tr onclick={() => modalChar = entry.char} class="clickable-row">
              <td class="td-char">
                <button
                  class="char-btn {getHoverStrokeClass(entry.char)}"
                  lang="zh"
                  onclick={(e) => { e.stopPropagation(); modalChar = entry.char }}
                  aria-label="Details for {entry.char}"
                >{entry.char}</button>
              </td>
              <td>
                <button 
                  class="play-char-btn" 
                  onclick={(e) => { e.stopPropagation(); speak(entry.char, 'zh') }}
                  aria-label="Listen to {entry.char}"
                >
                  ♪
                </button>
              </td>
              <td class="td-pinyin" lang="zh">{entry.pinyin ?? '—'}</td>
              <td class="td-gloss">{entry.gloss ?? '—'}</td>
              <td class="td-strokes">{entry.stroke_count ?? '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
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

  .table-wrapper {
    width: 100%;
    overflow-x: auto;
  }

  .char-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--color-surface);
    border: var(--border);
    box-shadow: var(--shadow-sm);
    text-align: left;
  }

  thead th {
    padding: var(--size-3) var(--size-4);
    border-bottom: var(--border);
    font-size: var(--font-size-1);
    font-weight: 700;
    font-family: var(--font-body);
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-sky);
  }

  .clickable-row {
    cursor: pointer;
    transition: background-color var(--transition-speed);
    border-bottom: 1px solid var(--color-border);
  }

  .clickable-row:hover { background: var(--color-lemon); }

  .clickable-row:last-child {
    border-bottom: none;
  }

  tbody td {
    padding: var(--size-3) var(--size-4);
    vertical-align: middle;
  }

  .play-char-btn {
    background: var(--color-sky);
    border: var(--border);
    border-radius: 0;
    width: var(--size-6);
    height: var(--size-6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-2);
    cursor: pointer;
    padding: 0;
  }

  .play-char-btn:hover {
    background: var(--color-accent-2);
    transform: translate(-1px, -1px);
    box-shadow: 1px 1px 0 var(--color-border);
  }

  .td-pinyin {
    color: var(--color-text-muted);
    font-size: var(--font-size-2);
    white-space: nowrap;
  }

  .td-gloss {
    font-size: var(--font-size-2);
    font-weight: 700;
  }

  .td-strokes {
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

</style>
