<script module lang="ts">
  import { SvelteMap } from 'svelte/reactivity'
  type CharData = {
    phonetic: string | null
    translation: string | null
    note: string | null
    hint: string | null
    components: { character: string }[] | null
    trad_variant: string | null
    stroke_count: number | null
  }
  const cache = new SvelteMap<string, CharData>()
</script>

<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { speak } from '$lib/audio'
  import CharacterWriter from '$lib/components/CharacterWriter.svelte'

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

  async function loadCharData(char: string) {
    const key = `${language}:${char}`

    charData = cache.get(key) ?? null

    if (cache.has(key)) return

    const [{ data: w }, { data: c }] = await Promise.all([
      supabase.from('zh_words').select('pinyin, translation').eq('word', char).maybeSingle(),
      supabase.from('zh_chars').select('gloss, hint, components, trad_variant, stroke_count').eq('char', char).maybeSingle()
    ])

    const data: CharData = {
      phonetic: w?.pinyin ?? null,
      translation: w?.translation ?? null,
      note: c?.gloss ?? null,
      hint: c?.hint ?? null,
      components: c?.components ?? null,
      trad_variant: c?.trad_variant ?? null,
      stroke_count: c?.stroke_count ?? null
    }
    cache.set(key, data)
    charData = data
  }

  $effect(() => {
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

  <div class="detail-meta">
    {#if charData?.trad_variant && charData.trad_variant !== viewChar}
      <p class="detail-trad">Traditional: <span lang={language}>{charData.trad_variant}</span></p>
    {/if}
    {#if charData?.stroke_count != null}
      <p class="detail-strokes">Strokes: <span>{charData.stroke_count}</span></p>
    {/if}
  </div>

  <div class="stroke-area">
    {#key viewChar}
      <CharacterWriter char={viewChar} {language} />
    {/key}
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
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    box-shadow: var(--shadow-lg);
    padding: var(--size-6);
    width: min(320px, 90vw);
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  dialog::backdrop {
    background: rgba(10, 10, 10, 0.65);
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
    font-family: var(--font-display);
    font-weight: 800;
  }

  .back-btn {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-3);
    color: var(--color-text);
    cursor: pointer;
    padding: var(--size-1) var(--size-2);
    line-height: 1;
    font-weight: 700;
    box-shadow: var(--shadow-sm);
  }

  .back-btn:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .back-btn:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .close-btn {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-3);
    color: var(--color-text);
    cursor: pointer;
    padding: var(--size-1) var(--size-2);
    line-height: 1;
    font-weight: 700;
    box-shadow: var(--shadow-sm);
  }

  .close-btn:hover:not(:disabled) {
    background: var(--color-danger);
    color: var(--color-danger-fg);
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .close-btn:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .detail-meta {
    display: flex;
    justify-content: center;
    gap: var(--size-4);
  }

  .detail-trad, .detail-strokes {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }

  .stroke-area {
    display: flex;
    justify-content: center;
  }

  .modal-actions {
    display: flex;
    justify-content: center;
  }

  .audio-btn {
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
  }

  .audio-btn:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .audio-btn:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .detail-phonetic {
    font-size: var(--font-size-2);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }

  .detail-translation {
    font-size: var(--font-size-3);
    font-weight: 700;
    font-family: var(--font-display);
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
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  .components-sep {
    font-size: var(--font-size-1);
    font-weight: 700;
    color: var(--color-text-muted);
  }

  .component-btn {
    font-size: var(--font-size-5);
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    padding: var(--size-1) var(--size-3);
    cursor: pointer;
    line-height: 1;
    box-shadow: var(--shadow-sm);
  }

  .component-btn:hover:not(:disabled) {
    background: var(--color-lemon);
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .component-btn:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .detail-hint {
    font-size: var(--font-size-1);
    color: var(--color-text);
    text-align: left;
    font-style: italic;
    margin: 0;
    padding: var(--size-2) var(--size-3);
    background: var(--color-mint);
    border-radius: 0;
    border-left: 4px solid var(--color-border);
  }

  .detail-note {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
    font-style: italic;
    margin: 0;
  }

  .detail-loading {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }
</style>
