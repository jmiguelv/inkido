<script lang="ts">
  import { page } from '$app/state'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte'
  import { speak, unlockAudio } from '$lib/audio'
  import { onMount } from 'svelte'
  import { alignPinyin, getTone } from '$lib/characters'
  import type { Word, WordList } from '$lib/types'

  interface PracticeItem {
    char: string
    pinyin: string
    tone: number
  }

  let list = $state<WordList | null>(null)
  let items = $state<PracticeItem[]>([])
  let currentIndex = $state(0)
  let showResult = $state(false)
  let selectedTone = $state<number | null>(null)
  let errorMsg = $state('')
  let speechRate = $state(0.75)

  const activeProfile = $derived(getActiveProfile())
  const listId = $derived(page.params.id)
  const currentItem = $derived(items[currentIndex] ?? null)

  async function loadPractice() {
    const { data: listData, error: listError } = await supabase
      .from('word_lists').select('*').eq('id', listId).single()
    if (listError) throw listError
    list = listData as WordList

    const { data: wordsData, error: wordsError } = await supabase
      .from('words').select('*').eq('list_id', listId).order('sort_order').order('created_at')
    if (wordsError) throw wordsError
    
    const words = (wordsData as Word[]).filter(w => w.phonetic_annotation)
    const uniqueItems = new Map<string, PracticeItem>()
    
    for (const word of words) {
      const aligned = alignPinyin(word.character, word.phonetic_annotation)
      for (const { char, pinyin } of aligned) {
        if (pinyin && !uniqueItems.has(char)) {
          uniqueItems.set(char, {
            char,
            pinyin,
            tone: getTone(pinyin)
          })
        }
      }
    }
    items = Array.from(uniqueItems.values())

    await supabase.from('word_lists').update({ last_practiced: new Date().toISOString() }).eq('id', listId)

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.speechRate !== undefined) {
      speechRate = user.user_metadata.speechRate as number
    }
  }

  function handleAudio() {
    if (!currentItem || !list) return
    try {
      speak(currentItem.char, list.language, speechRate)
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Audio unavailable'
    }
  }

  function handleToneSelect(tone: number) {
    if (showResult) return
    selectedTone = tone
    showResult = true
  }

  function handleNext() {
    if (currentIndex < items.length - 1) {
      currentIndex++
      selectedTone = null
      showResult = false
      // Play audio automatically after a small delay for the next character
      setTimeout(handleAudio, 300)
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      currentIndex--
      selectedTone = null
      showResult = false
    }
  }

  onMount(() => {
    if (!activeProfile) { goto('/profiles'); return }
  })

  $effect(() => {
    if (activeProfile?.id) {
      loadPractice()
    }
  })

  // Auto play first item when loaded
  $effect(() => {
    if (items.length > 0 && currentIndex === 0 && !showResult) {
      setTimeout(handleAudio, 500)
    }
  })
</script>

<section class="tones-practice">
  {#if list && currentItem}
    <hgroup class="page-header">
      <div class="title-group">
        <a href="/spellings/{list.id}" class="back-link">← {list.name}</a>
        <h1>Tone Listening</h1>
        <p><small>Listen to the character and identify its tone.</small></p>
      </div>
      <div class="header-actions">
        <span class="progress">{currentIndex + 1} / {items.length}</span>
      </div>
    </hgroup>

    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}

    <div class="card-container">
      <div class="tone-card">
        <button class="listen-btn is-large" onclick={handleAudio} aria-label="Listen again">
          ♪ Listen
        </button>

        {#if showResult}
          <div class="result-area">
            <div class="character-display">
               <span class="char">{currentItem.char}</span>
               <span class="pinyin">{currentItem.pinyin}</span>
            </div>
          </div>
        {:else}
          <div class="tone-options">
            <p class="instruction">Choose the tone:</p>
          </div>
        {/if}

        <div class="tone-grid" class:has-result={showResult}>
          {#each [1, 2, 3, 4, 5] as tone}
            <button 
              class="tone-btn tone-{tone}" 
              class:correct={showResult && tone === currentItem.tone}
              class:incorrect={showResult && tone === selectedTone && tone !== currentItem.tone}
              disabled={showResult}
              onclick={() => handleToneSelect(tone)}
              aria-label="Tone {tone}"
            >
              <div class="tone-mark-container">
                <span class="tone-mark">
                  {#if tone === 1}¯{:else if tone === 2}´{:else if tone === 3}ˇ{:else if tone === 4}`{:else}•{/if}
                </span>
              </div>
              <span class="tone-number">{tone}</span>
              <span class="tone-name">
                {#if tone === 1}1st (High){/if}
                {#if tone === 2}2nd (Rising){/if}
                {#if tone === 3}3rd (Falling-Rising){/if}
                {#if tone === 4}4th (Falling){/if}
                {#if tone === 5}Neutral{/if}
              </span>
            </button>
          {/each}
        </div>

        {#if showResult}
          <div class="result-actions">
            {#if currentIndex < items.length - 1}
              <button class="next-btn" onclick={handleNext}>Next Character →</button>
            {:else}
              <p class="complete-msg">Practice complete!</p>
              <a href="/spellings/{list.id}" class="finish-link">Back to List</a>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <nav class="nav-controls" aria-label="Practice navigation">
      <button onclick={handlePrev} disabled={currentIndex === 0} aria-label="Previous character">
        ← Prev
      </button>
      <button onclick={handleNext} disabled={currentIndex === items.length - 1 || !showResult} aria-label="Next character">
        Next →
      </button>
    </nav>
  {:else if items.length === 0 && list}
    <p>This set has no characters with pinyin yet. <a href="/spellings/{list.id}">Add some words</a>.</p>
  {:else}
    <p>Loading…</p>
  {/if}
</section>

<style>
  .tones-practice {
    max-width: 800px;
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

  .card-container {
    margin-bottom: var(--size-6);
  }

  .tone-card {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    box-shadow: var(--shadow-lg);
    padding: var(--size-8);
    min-height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--size-6);
  }

  .listen-btn.is-large {
    font-size: var(--font-size-4);
    padding: var(--size-4) var(--size-6);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: var(--border);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition: all var(--transition-speed);
  }

  .listen-btn.is-large:hover {
    transform: translate(-2px, -2px);
    box-shadow: 4px 4px 0 var(--color-border);
  }

  .tone-options {
    width: 100%;
    text-align: center;
  }

  .instruction {
    font-size: var(--font-size-2);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    margin-bottom: var(--size-4);
  }

  .tone-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--size-3);
    width: 100%;
  }

  @media (max-width: 600px) {
    .tone-grid {
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
  }

  .tone-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 0;
    padding: var(--size-4) var(--size-2);
    border: var(--border);
    background: var(--color-surface);
    cursor: pointer;
    transition: all var(--transition-speed);
    box-shadow: var(--shadow-sm);
    height: 160px;
  }

  .tone-btn:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 3px 3px 0 var(--color-border);
  }

  .tone-btn.correct {
    background: var(--color-mint);
    border-color: var(--color-border);
    transform: translate(2px, 2px);
    box-shadow: none;
  }

  .tone-btn.incorrect {
    background: var(--color-rose);
    border-color: var(--color-border);
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  
  .tone-btn:disabled {
    opacity: 1;
    cursor: default;
  }
  
  .tone-grid.has-result .tone-btn:not(.correct):not(.incorrect) {
    opacity: 0.5;
  }

  .tone-mark-container {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-bottom: auto;
  }

  .tone-mark {
    font-size: var(--font-size-7);
    font-weight: 800;
    line-height: 1;
    color: var(--color-text);
    display: block;
  }

  .tone-number {
    font-size: var(--font-size-3);
    font-weight: 700;
    color: var(--color-text-muted);
    line-height: 1;
    margin-bottom: var(--size-1);
  }

  .tone-name {
    font-size: var(--font-size-0);
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: none;
    letter-spacing: normal;
    text-align: center;
    line-height: 1.1;
    height: 2.2em;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .result-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-4);
    animation: fadeIn 0.3s ease-out;
  }

  .result-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-4);
    margin-top: var(--size-2);
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .character-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-1);
  }

  .char {
    font-family: var(--font-display);
    font-size: var(--font-size-8);
    font-weight: 800;
  }

  .pinyin {
    font-size: var(--font-size-4);
    color: var(--color-text-muted);
  }

  .next-btn {
    padding: var(--size-3) var(--size-6);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: var(--border);
    font-weight: 700;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }

  .next-btn:hover {
    transform: translate(-2px, -2px);
    box-shadow: 4px 4px 0 var(--color-border);
  }

  .complete-msg {
    font-size: var(--font-size-3);
    font-weight: 700;
  }

  .finish-link {
    padding: var(--size-3) var(--size-6);
    background: var(--color-surface);
    border: var(--border);
    text-decoration: none;
    color: var(--color-text);
    font-weight: 700;
    box-shadow: var(--shadow-sm);
  }

  .finish-link:hover {
    transform: translate(-2px, -2px);
    box-shadow: 4px 4px 0 var(--color-border);
  }

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

  .error {
    display: block;
    color: var(--color-danger);
    margin-bottom: var(--size-3);
  }
</style>
