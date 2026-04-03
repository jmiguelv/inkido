<script module lang="ts">
  type CharData = { phonetic: string | null; translation: string | null; note: string | null }
  const cache = new Map<string, CharData>()
</script>

<script lang="ts">
  import { onMount } from 'svelte'
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

  let charData = $state<CharData | null>(null)
  let writerError = $state('')

  function handleAudio() {
    try {
      speak(character, language)
    } catch {
      // speech not available — silently ignore
    }
  }

  function openDialog(node: HTMLDialogElement) {
    node.showModal()
  }

  function initWriter(node: HTMLDivElement) {
    import('hanzi-writer').then(({ default: HanziWriter }) => {
      HanziWriter.create(node, character, {
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

  onMount(async () => {
    const key = `${language}:${character}`

    // L1: module cache
    if (cache.has(key)) {
      charData = cache.get(key)!
      return
    }

    // L2: dictionary tables
    const [{ data: w }, { data: c }] = await Promise.all([
      supabase.from('zh_words').select('pinyin, translation').eq('word', character).maybeSingle(),
      supabase.from('zh_chars').select('gloss').eq('char', character).maybeSingle()
    ])

    const data: CharData = {
      phonetic: w?.pinyin ?? null,
      translation: w?.translation ?? null,
      note: c?.gloss ?? null
    }
    cache.set(key, data)
    charData = data
  })
</script>

<dialog
  {@attach openDialog}
  aria-label="Character detail: {character}"
  onclick={(e) => { if (e.target === e.currentTarget) onclose() }}
  oncancel={(e) => { e.preventDefault(); onclose() }}
>
  <header class="modal-header">
    <span class="modal-char" lang={language}>{character}</span>
    <button class="close-btn" onclick={onclose} aria-label="Close">✕</button>
  </header>

  <div class="stroke-area">
    {#if language === 'zh'}
      <div {@attach initWriter} class="writer-container" aria-hidden="true"></div>
      {#if writerError}
        <p class="detail-error">{writerError}</p>
      {/if}
    {:else}
      <p class="detail-error">Stroke order is only available for Mandarin Chinese.</p>
    {/if}
  </div>

  <div class="modal-actions">
    <button class="audio-btn" onclick={handleAudio} aria-label="Speak {character}">
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

  .modal-char {
    font-size: var(--font-size-fluid-2);
    font-weight: var(--font-weight-7);
  }

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
