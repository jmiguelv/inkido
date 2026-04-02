<script lang="ts">
  import { speak } from '$lib/audio.ts'

  const {
    character,
    language = 'zh',
    note = '',
    onclose
  }: {
    character: string
    language?: string
    note?: string
    onclose: () => void
  } = $props()

  let errorMsg = $state('')

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
      errorMsg = 'Stroke order unavailable for this character.'
    })
  }
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
      {#if errorMsg}
        <p class="stroke-error">{errorMsg}</p>
      {/if}
    {:else}
      <p class="stroke-error">Stroke order is only available for Mandarin Chinese.</p>
    {/if}
  </div>

  <div class="modal-actions">
    <button class="audio-btn" onclick={handleAudio} aria-label="Speak {character}">
      ♪ Listen
    </button>
  </div>

  {#if note}
    <p class="radical-note">{note}</p>
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

  .stroke-error {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
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

  .radical-note {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }
</style>
