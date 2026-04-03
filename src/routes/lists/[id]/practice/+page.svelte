<script lang="ts">
  import { page } from '$app/state'
  import { supabase } from '$lib/supabase.ts'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte.ts'
  import { speak, unlockAudio } from '$lib/audio.ts'
  import { onMount } from 'svelte'
  import { splitCharacters } from '$lib/characters.ts'
  import CharacterModal from '$lib/components/CharacterModal.svelte'
  import type { Word, WordList } from '$lib/types.ts'

  let list = $state<WordList | null>(null)
  let words = $state<Word[]>([])
  let currentIndex = $state(0)
  let flipped = $state(false)
  let errorMsg = $state('')
  let speechRate = $state(0.75)
  let modalChar = $state<string | null>(null)

  const activeProfile = $derived(getActiveProfile())
  const listId = $derived(page.params.id)
  const currentWord = $derived(words[currentIndex] ?? null)

  async function loadPractice() {
    const { data: listData, error: listError } = await supabase
      .from('word_lists').select('*').eq('id', listId).single()
    if (listError) throw listError
    list = listData as WordList

    const { data: wordsData, error: wordsError } = await supabase
      .from('words').select('*').eq('list_id', listId).order('sort_order').order('created_at')
    if (wordsError) throw wordsError
    words = wordsData as Word[]

    await supabase.from('word_lists').update({ last_practiced: new Date().toISOString() }).eq('id', listId)

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.speechRate !== undefined) {
      speechRate = user.user_metadata.speechRate as number
    }
  }

  function handleFlip() {
    unlockAudio()
    flipped = !flipped
  }

  function handleAudio() {
    if (!currentWord || !list) return
    try {
      speak(currentWord.character, list.language, speechRate)
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Audio unavailable'
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      currentIndex--
      flipped = false
    }
  }

  function handleNext() {
    if (currentIndex < words.length - 1) {
      currentIndex++
      flipped = false
    }
  }

  onMount(() => {
    if (!activeProfile) { goto('/'); return }
    loadPractice()
  })
</script>

<section class="practice">
  {#if list && currentWord}
    <div class="practice-header">
      <a href="/lists/{list.id}">← {list.name}</a>
      <span class="progress">{currentIndex + 1} / {words.length}</span>
    </div>

    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}

    <div class="card-container">
      <div
        class="flashcard"
        class:flipped
        onclick={handleFlip}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? handleFlip() : null}
        aria-label={flipped ? 'Hide details' : 'Reveal details'}
      >
        <div class="card-front">
          <div class="card-character">
            <div class="char-row" lang={list.language}>
              {#each splitCharacters(currentWord.character) as char, i (i)}
                <button
                  class="char-btn"
                  onclick={(e) => { e.stopPropagation(); modalChar = char }}
                  aria-label="Details for {char}"
                >{char}</button>
              {/each}
            </div>
            {#if flipped && currentWord.phonetic_annotation}
              <p class="phonetic">{currentWord.phonetic_annotation}</p>
            {/if}
          </div>
          <button
            class="audio-btn"
            onclick={(e) => { e.stopPropagation(); handleAudio() }}
            aria-label="Speak {currentWord.character}"
          >
            ♪
          </button>
        </div>

        {#if flipped}
          <div class="card-back">
            {#if currentWord.translation}
              <p class="translation">{currentWord.translation}</p>
            {/if}
            {#if currentWord.example}
              <p class="example">{@html currentWord.example}</p>
            {/if}
            {#if currentWord.example_translation}
              <p class="example-translation">{currentWord.example_translation}</p>
            {/if}
            {#if currentWord.character_note}
              <p class="note">{currentWord.character_note}</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <nav class="nav-controls" aria-label="Flashcard navigation">
      <button onclick={handlePrev} disabled={currentIndex === 0} aria-label="Previous card">
        ← Prev
      </button>
      <button onclick={handleNext} disabled={currentIndex === words.length - 1} aria-label="Next card">
        Next →
      </button>
    </nav>
  {:else if words.length === 0 && list}
    <p>This list has no words yet. <a href="/lists/{list.id}">Add some words</a>.</p>
  {:else}
    <p>Loading…</p>
  {/if}
</section>

{#if modalChar && list}
  <CharacterModal
    character={modalChar}
    language={list.language}
    onclose={() => modalChar = null}
  />
{/if}

<style>
  .practice {
    max-width: 600px;
    margin: 0 auto;
  }

  .practice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--size-6);
  }

  .progress {
    font-size: var(--font-size-1);
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--color-text-muted);
  }

  .error {
    display: block;
    color: var(--color-danger);
    margin-bottom: var(--size-3);
  }

  .card-container {
    perspective: 1000px;
    margin-bottom: var(--size-6);
  }

  .flashcard {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    box-shadow: var(--shadow-lg);
    padding: var(--size-8);
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: box-shadow var(--transition-speed);
    position: relative;
  }

  .flashcard:hover { box-shadow: var(--shadow); }
  .flashcard.flipped { background: var(--color-lavender); }
  .flashcard:focus { outline: 3px solid var(--color-lemon); outline-offset: 0; }

  .card-front {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-4);
  }

  .card-character {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-2);
  }

  .char-row {
    display: flex;
    gap: var(--size-2);
  }

  .char-btn {
    font-size: var(--font-size-fluid-3);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    line-height: 1;
    transition: color var(--transition-speed);
  }

  .char-btn:hover { color: var(--color-accent-2); }

  .phonetic {
    font-size: var(--font-size-2);
    color: var(--color-text-muted);
    margin: 0;
  }

  .audio-btn {
    background: var(--color-sky);
    border: var(--border);
    border-radius: 0;
    width: 3rem;
    height: 3rem;
    font-size: var(--font-size-4);
    display: flex;
    align-items: center;
    justify-content: center;
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

  .card-back {
    width: 100%;
    margin-top: var(--size-6);
    border-top: var(--border-width) solid var(--color-border);
    padding-top: var(--size-4);
    text-align: center;
  }

  .card-back p { margin: 0 0 var(--size-2); }
  .translation { font-weight: var(--font-weight-7); font-size: var(--font-size-4); }
  .example { color: var(--color-text-muted); font-size: var(--font-size-2); }
  .example-translation { color: var(--color-text-muted); font-size: var(--font-size-1); }
  .note { font-size: var(--font-size-0); color: var(--color-text-muted); font-style: italic; }

  .nav-controls {
    display: flex;
    justify-content: space-between;
    gap: var(--size-4);
  }

  .nav-controls button {
    flex: 1;
    padding: var(--size-3);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-2);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
  }

  .nav-controls button:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .nav-controls button:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }
</style>
