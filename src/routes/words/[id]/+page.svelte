<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import { supabase } from '$lib/supabase.ts'
  import { getActiveProfile } from '$lib/stores.svelte.ts'
  import { splitCharacters } from '$lib/characters.ts'
  import { speak } from '$lib/audio.ts'
  import type { Word, WordList } from '$lib/types.ts'

  type CharData = {
    phonetic: string | null
    translation: string | null
    note: string | null
    hint: string | null
    components: { character: string }[] | null
    trad_variant: string | null
    stroke_count: number | null
  }

  const wordId = $derived(page.params.id)
  const activeProfile = $derived(getActiveProfile())

  let word = $state<Word | null>(null)
  let list = $state<WordList | null>(null)
  let charDataMap = new SvelteMap<string, CharData>()
  let loading = $state(true)
  let errorMsg = $state('')

  function makeWriter(char: string) {
    return (node: HTMLDivElement) => {
      import('hanzi-writer').then(({ default: HanziWriter }) => {
        HanziWriter.create(node, char, {
          width: 140,
          height: 140,
          padding: 8,
          showOutline: true,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 300,
          onLoadCharDataError: () => { /* silently ignore */ }
        }).animateCharacter()
      }).catch(() => {})
    }
  }

  function handleListen() {
    if (!word || !list) return
    try {
      speak(word.character, list.language)
    } catch {
      // speech not available
    }
  }

  async function load() {
    loading = true
    errorMsg = ''
    try {
      const { data: wordData, error: wordErr } = await supabase
        .from('words')
        .select('*')
        .eq('id', wordId)
        .single()
      if (wordErr) throw wordErr
      word = wordData as Word

      const { data: listData, error: listErr } = await supabase
        .from('word_lists')
        .select('*')
        .eq('id', word.list_id)
        .single()
      if (listErr) throw listErr
      list = listData as WordList

      const chars = splitCharacters(word.character)
      if (chars.length > 0) {
        const [{ data: charRows }, { data: wordRows }] = await Promise.all([
          supabase
            .from('zh_chars')
            .select('char, gloss, hint, components, trad_variant, stroke_count')
            .in('char', chars),
          supabase
            .from('zh_words')
            .select('word, pinyin, translation')
            .in('word', chars)
        ])

        const charMap = new Map(charRows?.map(r => [r.char, r]) ?? [])
        const wMap = new Map(wordRows?.map(r => [r.word, r]) ?? [])

        for (const char of chars) {
          const c = charMap.get(char)
          const w = wMap.get(char)
          charDataMap.set(char, {
            phonetic: w?.pinyin ?? null,
            translation: w?.translation ?? null,
            note: c?.gloss ?? null,
            hint: c?.hint ?? null,
            components: c?.components ?? null,
            trad_variant: c?.trad_variant ?? null,
            stroke_count: c?.stroke_count ?? null
          })
        }
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to load word'
    } finally {
      loading = false
    }
  }

  onMount(() => {
    if (!activeProfile) { goto('/'); return }
    load()
  })
</script>

<section>
  {#if loading}
    <p class="status" aria-live="polite">Loading…</p>
  {:else if errorMsg}
    <p class="error" role="alert">{errorMsg}</p>
  {:else if word && list}
    <div class="page-header">
      <a href="/lists/{list.id}" class="back-link">← {list.name}</a>
      <button class="listen-btn" onclick={handleListen} aria-label="Listen to {word.character}">
        ♪ Listen
      </button>
    </div>

    <div class="word-hero">
      <p class="word-character" lang={list.language}>{word.character}</p>
      {#if word.phonetic_annotation}
        <p class="word-phonetic">{word.phonetic_annotation}</p>
      {/if}
      {#if word.translation}
        <p class="word-translation">{word.translation}</p>
      {/if}
    </div>

    {#if word.example}
      <div class="section-card example-section">
        <p class="section-label">Example</p>
        <p class="example-text" lang={list.language}>{word.example}</p>
        {#if word.example_phonetic}
          <p class="example-phonetic">{word.example_phonetic}</p>
        {/if}
        {#if word.example_translation}
          <p class="example-translation">{word.example_translation}</p>
        {/if}
      </div>
    {/if}

    {#if splitCharacters(word.character).length > 0}
      <div class="chars-section">
        <p class="section-label">Characters</p>
        <div class="char-grid">
          {#each splitCharacters(word.character) as char (char)}
            {@const data = charDataMap.get(char)}
            <div class="char-card">
              {#if list.language === 'zh'}
                {#key char}
                  <div {@attach makeWriter(char)} class="writer-box" aria-hidden="true"></div>
                {/key}
              {:else}
                <div class="char-fallback" lang={list.language}>{char}</div>
              {/if}

              <p class="card-char" lang={list.language}>{char}</p>

              {#if data?.trad_variant && data.trad_variant !== char}
                <p class="card-trad">Trad: <span lang={list.language}>{data.trad_variant}</span></p>
              {/if}

              {#if data?.phonetic}
                <p class="card-phonetic">{data.phonetic}</p>
              {/if}

              {#if data?.translation}
                <p class="card-translation">{data.translation}</p>
              {/if}

              {#if data?.hint}
                <p class="card-hint">{data.hint}</p>
              {/if}

              {#if data?.note}
                <p class="card-note">{data.note}</p>
              {/if}

              {#if data?.stroke_count != null}
                <p class="card-strokes">
                  {data.stroke_count} {data.stroke_count === 1 ? 'stroke' : 'strokes'}
                </p>
              {/if}

              {#if data?.components?.length}
                <p class="card-components">
                  Made of: {data.components.map(c => c.character).join(' + ')}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  .status {
    color: var(--color-text-muted);
    font-size: var(--font-size-2);
  }

  .error {
    color: var(--color-danger);
    font-weight: 700;
    font-size: var(--font-size-2);
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-4);
    margin-bottom: var(--size-6);
    flex-wrap: wrap;
  }

  .back-link {
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-decoration: none;
    color: var(--color-text-muted);
  }

  .back-link:hover {
    color: var(--color-text);
  }

  .listen-btn {
    padding: var(--size-2) var(--size-5);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-2);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-sky);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
  }

  .listen-btn:hover {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .listen-btn:active {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .word-hero {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
    margin-bottom: var(--size-8);
  }

  .word-character {
    font-size: var(--font-size-10);
    line-height: 1;
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
  }

  .word-phonetic {
    font-size: var(--font-size-3);
    color: var(--color-text-muted);
    margin: 0;
  }

  .word-translation {
    font-size: var(--font-size-5);
    font-weight: 700;
    margin: 0;
  }

  .section-label {
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin: 0 0 var(--size-3);
  }

  .section-card {
    border: var(--border);
    padding: var(--size-5);
    box-shadow: var(--shadow-sm);
    background: var(--color-surface);
    margin-bottom: var(--size-8);
  }

  .example-text {
    font-size: var(--font-size-4);
    margin: 0 0 var(--size-2);
    font-family: var(--font-display);
  }

  .example-phonetic {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    margin: 0 0 var(--size-1);
  }

  .example-translation {
    font-size: var(--font-size-2);
    font-weight: 700;
    margin: 0;
  }

  .chars-section {
    margin-bottom: var(--size-8);
  }

  .char-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--size-4);
  }

  .char-card {
    border: var(--border);
    padding: var(--size-5);
    box-shadow: var(--shadow-sm);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }

  .writer-box {
    width: 140px;
    height: 140px;
    align-self: center;
  }

  .char-fallback {
    width: 140px;
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5rem;
    line-height: 1;
    border: var(--border);
    background: var(--color-bg);
    align-self: center;
  }

  .card-char {
    font-size: var(--font-size-7);
    font-family: var(--font-display);
    font-weight: 800;
    line-height: 1;
    margin: 0;
    text-align: center;
  }

  .card-trad {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
    margin: 0;
    text-align: center;
  }

  .card-phonetic {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    margin: 0;
    text-align: center;
  }

  .card-translation {
    font-size: var(--font-size-2);
    font-weight: 700;
    margin: 0;
    text-align: center;
  }

  .card-hint {
    font-size: var(--font-size-1);
    font-style: italic;
    margin: 0;
    padding: var(--size-2) var(--size-3);
    background: var(--color-mint);
    border-left: 4px solid var(--color-border);
  }

  .card-note {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
  }

  .card-strokes {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
  }

  .card-components {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    margin: 0;
  }
</style>
