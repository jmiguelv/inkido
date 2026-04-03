<script module lang="ts">
  type CharData = {
    phonetic: string | null
    translation: string | null
    note: string | null
    hint: string | null
    components: { character: string }[] | null
    trad_variant: string | null
  }
  const cache = new Map<string, CharData>()
</script>

<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import { speak } from '$lib/audio.ts'

  const {
    character,
    language = 'zh',
    onclose
  }: {
    character: string
    language?: string
    onclose: () => void
  } = $props()

  // null means "show the prop character"; non-null is a user-navigated override
  let _viewChar = $state<string | null>(null)
  const viewChar = $derived(_viewChar ?? character)

  let charData = $state<CharData | null>(null)
  let writerError = $state('')

  function handleAudio() {
    try {
      speak(viewChar, language)
    } catch {
      // speech not available — silently ignore
    }
  }

  function openDialog(node: HTMLDialogElement) {
    node.showModal()
  }

  function initWriter(node: HTMLDivElement) {
    import('hanzi-writer').then(({ default: HanziWriter }) => {
      HanziWriter.create(node, viewChar, {
        width: 200,
        height: 200,
        padding: 10,
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300
      }).animateCharacter()
    }).catch(() => {
      writerError = 'Stroke order unavailable for this character.'
    })
  }

  async function loadCharData(char: string) {
    const key = `${language}:${char}`

    charData = cache.get(key) ?? null

    if (cache.has(key)) return

    const [{ data: w }, { data: c }] = await Promise.all([
      supabase.from('zh_words').select('pinyin, translation').eq('word', char).maybeSingle(),
      supabase.from('zh_chars').select('gloss, hint, components, trad_variant').eq('char', char).maybeSingle()
    ])

    const data: CharData = {
      phonetic: w?.pinyin ?? null,
      translation: w?.translation ?? null,
      note: c?.gloss ?? null,
      hint: c?.hint ?? null,
      components: c?.components ?? null,
      trad_variant: c?.trad_variant ?? null
    }
    cache.set(key, data)
    charData = data
  }

  $effect(() => {
    writerError = ''
    charData = null
    loadCharData(viewChar)
  })
</script>

<dialog
  {@attach openDialog}
  aria-label="Character detail: {viewChar}"
  onclick={(e) => { if (e.target === e.currentTarget) onclose() }}
  oncancel={(e) => { e.preventDefault(); onclose() }}
>
  <header class="modal-header">
    <div class="modal-nav">
      {#if viewChar !== character}
        <button class="back-btn" onclick={() => _viewChar = null} aria-label="Back">←</button>
      {/if}
      <span class="modal-char" lang={language}>{viewChar}</span>
    </div>
    <button class="close-btn" onclick={onclose} aria-label="Close">✕</button>
  </header>

  {#if charData?.trad_variant && charData.trad_variant !== viewChar}
    <p class="detail-trad">Traditional: <span lang={language}>{charData.trad_variant}</span></p>
  {/if}

  <div class="stroke-area">
    {#if language === 'zh'}
      {#key viewChar}
        <div {@attach initWriter} class="writer-container" aria-hidden="true"></div>
      {/key}
      {#if writerError}
        <p class="detail-error">{writerError}</p>
      {/if}
    {:else}
      <p class="detail-error">Stroke order is only available for Mandarin Chinese.</p>
    {/if}
  </div>

  <div class="modal-actions">
    <button class="audio-btn" onclick={handleAudio} aria-label="Speak {viewChar}">
      ♪ Listen
    </button>
  </div>

  {#if charData}
    {#if charData.phonetic}
      <p class="detail-phonetic">{charData.phonetic}</p>
    {/if}
    {#if charData.translation}
      <p class="detail-translation">{charData.translation}</p>
    {/if}
    {#if charData.components?.length}
      <div class="components">
        <span class="components-label">Made of</span>
        {#each charData.components as comp, i (i)}
          {#if i > 0}<span class="components-sep">+</span>{/if}
          <button
            class="component-btn"
            lang={language}
            onclick={() => _viewChar = comp.character}
            aria-label="Explore component {comp.character}"
          >{comp.character}</button>
        {/each}
      </div>
    {/if}
    {#if charData.hint}
      <p class="detail-hint">{charData.hint}</p>
    {/if}
    {#if charData.note}
      <p class="detail-note">{charData.note}</p>
    {/if}
  {:else}
    <p class="detail-loading" aria-live="polite">Loading…</p>
  {/if}
</dialog>

<style>
  dialog {
    background: var(--color-bg);
    border: none;
    border-radius: var(--radius);
    box-shadow: var(--shadow-4);
    padding: var(--size-6);
    width: min(320px, 90vw);
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-nav {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }

  .modal-char {
    font-size: var(--font-size-fluid-2);
    font-weight: var(--font-weight-7);
  }

  .back-btn {
    background: none;
    border: none;
    font-size: var(--font-size-3);
    color: var(--color-text-muted);
    cursor: pointer;
    padding: var(--size-1);
    line-height: 1;
  }

  .back-btn:hover { color: var(--color-text); }

  .close-btn {
    background: none;
    border: none;
    font-size: var(--font-size-3);
    color: var(--color-text-muted);
    cursor: pointer;
    padding: var(--size-1);
    line-height: 1;
  }

  .close-btn:hover { color: var(--color-text); }

  .detail-trad {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }

  .stroke-area {
    display: flex;
    justify-content: center;
  }

  .writer-container {
    width: 200px;
    height: 200px;
  }

  .modal-actions {
    display: flex;
    justify-content: center;
  }

  .audio-btn {
    padding: var(--size-2) var(--size-5);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-2);
    background: var(--color-surface);
    color: var(--color-text);
    transition: all var(--transition-speed);
  }

  .audio-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .detail-phonetic {
    font-size: var(--font-size-2);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }

  .detail-translation {
    font-size: var(--font-size-3);
    font-weight: var(--font-weight-6);
    text-align: center;
    margin: 0;
  }

  .components {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-2);
    flex-wrap: wrap;
  }

  .components-label {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
  }

  .components-sep {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
  }

  .component-btn {
    font-size: var(--font-size-5);
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-1) var(--size-3);
    cursor: pointer;
    line-height: 1;
    transition: all var(--transition-speed);
  }

  .component-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .detail-hint {
    font-size: var(--font-size-1);
    color: var(--color-text);
    text-align: center;
    font-style: italic;
    margin: 0;
    padding: var(--size-2) var(--size-3);
    background: var(--color-surface);
    border-radius: var(--radius);
    border-left: 3px solid var(--color-accent);
  }

  .detail-note {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
    font-style: italic;
    margin: 0;
  }

  .detail-error {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }

  .detail-loading {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }
</style>
