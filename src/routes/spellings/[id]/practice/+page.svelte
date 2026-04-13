<script lang="ts">
  import { page } from '$app/state'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { getActiveProfile, setPetMood } from '$lib/stores.svelte'
  import { speak, unlockAudio } from '$lib/audio'
  import { onMount } from 'svelte'
  import { splitCharacters, alignPinyin } from '$lib/characters'
  import { getCharsData, getStrokeClass, getHoverStrokeClass } from '$lib/dictionary'
  import CharacterModal from '$lib/components/CharacterModal.svelte'
  import CharacterWriter from '$lib/components/CharacterWriter.svelte'
  import { fireConfetti } from '$lib/confetti'
  import type { Word, WordList } from '$lib/types'

  let list = $state<WordList | null>(null)
  let words = $state<Word[]>([])
  let currentIndex = $state(0)
  let flipped = $state(false)
  let quizMode = $state(false)
  let quizCharIndex = $state(0)
  let showHint = $state(false)
  let errorMsg = $state('')
  let speechRate = $state(0.75)
  let modalChar = $state<string | null>(null)
  let quizTimeout: ReturnType<typeof setTimeout> | null = $state(null)

  const activeProfile = $derived(getActiveProfile())
  const listId = $derived(page.params.id)
  const currentWord = $derived(words[currentIndex] ?? null)
  const currentChars = $derived(currentWord ? splitCharacters(currentWord.character) : [])

  async function loadPractice() {
    const { data: listData, error: listError } = await supabase
      .from('word_lists').select('*').eq('id', listId).single()
    if (listError) throw listError
    list = listData as WordList

    const { data: wordsData, error: wordsError } = await supabase
      .from('words').select('*').eq('list_id', listId).order('sort_order').order('created_at')
    if (wordsError) throw wordsError
    words = wordsData as Word[]

    const allChars = [...new Set(words.flatMap(w => splitCharacters(w.character)))]
    if (allChars.length > 0) {
      await getCharsData(allChars)
    }

    await supabase.from('word_lists').update({ last_practiced: new Date().toISOString() }).eq('id', listId)

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.speechRate !== undefined) {
      speechRate = user.user_metadata.speechRate as number
    }
  }

  function handleFlip() {
    if (quizMode) return
    unlockAudio()
    flipped = !flipped
  }

  function startQuizTimeout() {
    if (quizTimeout) clearTimeout(quizTimeout)
    quizTimeout = setTimeout(() => {
      handleQuizComplete()
    }, 30000)
  }

  function toggleQuiz(e: MouseEvent) {
    e.stopPropagation()
    quizMode = !quizMode
    quizCharIndex = 0
    flipped = false
    showHint = false
    if (quizMode) startQuizTimeout()
  }

  function handleQuizComplete() {
    setPetMood('happy')
    if (quizCharIndex < currentChars.length - 1) {
      quizCharIndex++
      startQuizTimeout()
    } else {
      // Word complete!
      if (quizTimeout) clearTimeout(quizTimeout)
      fireConfetti()
      quizMode = false
      flipped = true
    }
  }

  function handleQuizPrev() {
    if (quizCharIndex > 0) {
      if (quizTimeout) clearTimeout(quizTimeout)
      quizCharIndex--
      startQuizTimeout()
    }
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
      quizMode = false
      quizCharIndex = 0
      showHint = false
    }
  }

  function handleNext() {
    if (currentIndex < words.length - 1) {
      currentIndex++
      flipped = false
      quizMode = false
      quizCharIndex = 0
      showHint = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') handlePrev()
    else if (e.key === 'ArrowRight') handleNext()
    else if (e.key === ' ' || e.key === 'Enter') handleFlip()
  }

  onMount(() => {
    if (!activeProfile) { goto('/profiles'); return }
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
      if (quizTimeout) clearTimeout(quizTimeout)
    }
  })

  $effect(() => {
    if (activeProfile?.id) {
      loadPractice()
    }
  })
</script>

<section class="practice">
  {#if list && currentWord}
    <hgroup class="page-header">
      <div class="title-group">
        <a href="/spellings/{list.id}" class="back-link">← {list.name}</a>
        <h1>Spelling Practice</h1>
        <p><small>Practise writing each character in this set stroke-by-stroke.</small></p>
      </div>
      <div class="header-actions">
        <span class="progress">{currentIndex + 1} / {words.length}</span>
      </div>
    </hgroup>

    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}

    <div class="card-container">
      <div
        class="flashcard {getStrokeClass(currentWord.character)}"
        class:flipped
        onclick={handleFlip}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? handleFlip() : null}
        aria-label={flipped ? 'Hide details' : 'Reveal details'}
      >
        <div class="card-front">
          <div class="card-character">
            {#if quizMode}
              <div class="quiz-container">
                <div class="quiz-char-row" lang={list.language}>
                  {#each currentChars as char, i (i)}
                    {#if i < quizCharIndex}
                      <span class="quiz-completed-char">{char}</span>
                    {:else if i === quizCharIndex}
                      <CharacterWriter
                        char={currentChars[quizCharIndex]}
                        size={80}
                        mode="quiz"
                        {showHint}
                        onComplete={handleQuizComplete}
                      />
                    {:else}
                      <span class="quiz-char-block"></span>
                    {/if}
                  {/each}
                </div>
                {#if currentChars.length > 1}
                  <p class="quiz-progress">
                    Writing {quizCharIndex + 1} of {currentChars.length}
                  </p>
                {/if}
                <div class="quiz-char-nav">
                  <button class="quiz-char-nav-btn" onclick={handleQuizPrev} disabled={quizCharIndex === 0}>← Back</button>
                  <button class="quiz-char-nav-btn" onclick={() => { if (quizTimeout) clearTimeout(quizTimeout); handleQuizComplete() }}>Next →</button>
                </div>
              </div>
            {:else if flipped}
              <div class="char-row" lang={list.language}>
                {#each alignPinyin(currentWord.character, currentWord.phonetic_annotation) as {char, pinyin}, i (i)}
                  <button
                    class="char-btn is-large {getHoverStrokeClass(char)}"
                    onclick={(e) => { e.stopPropagation(); modalChar = char }}
                    aria-label="Details for {char}"
                    title={pinyin ?? undefined}
                  >{char}</button>
                {/each}
              </div>
              {#if currentWord.phonetic_annotation}
                <p class="phonetic">{currentWord.phonetic_annotation}</p>
              {/if}
            {:else}
              <div class="char-placeholder" aria-label="Word with {currentChars.length} characters">
                {#each currentChars as _, i (i)}
                  <span class="char-block"></span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="card-front-actions">
            <button
              class="listen-btn"
              onclick={(e) => { e.stopPropagation(); handleAudio() }}
              aria-label="Speak {currentWord.character}"
            >
              {quizMode ? '♪ Word' : '♪ Listen'}
            </button>

            {#if list.language === 'zh' && !flipped}
              <button
                class="quiz-toggle-btn"
                class:active={quizMode}
                onclick={toggleQuiz}
              >
                {quizMode ? '✕ Quit writing' : '✎ Write'}
              </button>
            {/if}
          </div>

          {#if quizMode}
            <div class="hint-toggle">
              <button 
                class="hint-btn" 
                onmousedown={() => (showHint = true)}
                onmouseup={() => (showHint = false)}
                onmouseleave={() => (showHint = false)}
                ontouchstart={(e) => {
                    e.preventDefault();
                    showHint = true;
                }}
                ontouchend={() => (showHint = false)}
              >
                Hold to peek
              </button>
            </div>
          {/if}

          {#if !flipped && !quizMode}
            <p class="tap-hint">Tap card to reveal</p>
          {/if}
        </div>

        {#if flipped}
          <div class="card-back">
            {#if currentWord.translation}
              <p class="translation">{@html currentWord.translation}</p>
            {/if}
            {#if currentWord.example}
              <p class="example">{@html currentWord.example}</p>
            {/if}
            {#if currentWord.example_phonetic}
              <p class="example-phonetic">{currentWord.example_phonetic}</p>
            {/if}
            {#if currentWord.example_translation}
              <p class="example-translation">{@html currentWord.example_translation}</p>
            {/if}
            {#if currentWord.character_note}
              <p class="note">{@html currentWord.character_note}</p>
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
    <p>This set has no words yet. <a href="/spellings/{list.id}">Add some words</a>.</p>
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

  .progress {
    font-size: var(--font-size-2);
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--color-text-muted);
    align-self: flex-end;
    margin-bottom: var(--size-1);
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
    width: 100%;
    min-height: 200px;
    justify-content: center;
  }

  .quiz-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-4);
  }

  .quiz-char-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    align-items: center;
    justify-content: center;
  }

  .quiz-completed-char {
    font-family: var(--font-display);
    font-size: var(--font-size-7);
    font-weight: 800;
    color: var(--color-text);
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .quiz-char-block {
    width: 80px;
    height: 80px;
    background: var(--color-border);
    opacity: 0.15;
    border: var(--border);
    flex-shrink: 0;
  }

  .hint-toggle {
    margin-top: var(--size-2);
  }

  .hint-btn {
    padding: var(--size-1) var(--size-3);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-surface);
    color: var(--color-text-muted);
    box-shadow: 2px 2px 0 var(--color-border);
    cursor: pointer;
    transition: all var(--transition-speed);
  }

  .hint-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--color-border);
    color: var(--color-text);
  }

  .quiz-progress {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
  }

  .card-front-actions {
    display: flex;
    gap: var(--size-2);
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  .quiz-toggle-btn {
    padding: var(--size-2) var(--size-4);
    border: var(--border);
    border-radius: 0;
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
  }

  .quiz-toggle-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .quiz-toggle-btn.active {
    background: var(--color-rose);
    color: var(--color-text);
  }

  .char-placeholder {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    align-items: center;
    justify-content: center;
    max-width: 100%;
  }

  .char-block {
    width: 80px;
    height: 80px;
    background: var(--color-border);
    opacity: 0.15;
    border: var(--border);
    flex-shrink: 0;
  }

  .tap-hint {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
    opacity: 0.6;
    margin: 0;
    font-style: italic;
  }

  .quiz-char-nav {
    display: flex;
    gap: var(--size-2);
    justify-content: center;
  }

  .quiz-char-nav-btn {
    font-size: var(--font-size-0);
    padding: var(--size-1) var(--size-3);
    background: none;
    border: var(--border);
    box-shadow: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }

  .quiz-char-nav-btn:hover:not(:disabled) {
    opacity: 1;
    transform: none;
    box-shadow: none;
  }

  .quiz-char-nav-btn:disabled {
    opacity: 0.25;
    cursor: default;
  }

  .phonetic {
    font-size: var(--font-size-2);
    color: var(--color-text-muted);
    margin: 0;
  }

  .card-back {
    width: 100%;
    margin-top: var(--size-6);
    border-top: var(--border);
    padding-top: var(--size-4);
    text-align: center;
  }

  .card-back p { margin: 0 0 var(--size-2); }
  .translation { font-weight: var(--font-weight-7); font-size: var(--font-size-4); }
  .example { color: var(--color-text-muted); font-size: var(--font-size-2); }
  .example-phonetic { color: var(--color-text-muted); font-size: var(--font-size-1); margin: 0 0 var(--size-1); }
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
