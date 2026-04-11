<script lang="ts">
  import { page } from '$app/state'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte'
  import { onMount } from 'svelte'
  import { speak } from '$lib/audio'
  import { splitCharacters, isChineseCharacter } from '$lib/characters'
  import { getCharsData, getHoverStrokeClass } from '$lib/dictionary'
  import CharacterModal from '$lib/components/CharacterModal.svelte'
  import type { HomeworkScan, UserPreferences } from '$lib/types'

  let scan = $state<HomeworkScan | null>(null)
  let isLoading = $state(true)
  let isTranslating = $state(false)
  let errorMsg = $state('')
  let speechRate = $state(0.75)
  let modalChar = $state<string | null>(null)
  let editingIndex = $state<number | null>(null)
  let editValue = $state('')
  let userEmail = $state('')

  const activeProfile = $derived(getActiveProfile())
  const scanId = $derived(page.params.id)

  async function loadPreferences() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userEmail = user.email || ''
      const prefs = user.user_metadata as Partial<UserPreferences>
      if (prefs.speechRate !== undefined) speechRate = prefs.speechRate
    }
  }

  async function loadScan() {
    isLoading = true
    const { data, error } = await supabase
      .from('homework_scans')
      .select('*')
      .eq('id', scanId)
      .single()
    
    if (error) {
      isLoading = false
      throw error
    }

    const scanData = data as HomeworkScan
    
    // Pre-fetch character data for clickable characters
    const allChars = [...new Set(scanData.analysis.questions.flatMap(q => 
      splitCharacters(q.original).filter(isChineseCharacter)
    ))]
    
    if (allChars.length > 0) {
      await getCharsData(allChars)
    }

    scan = scanData
    isLoading = false
  }

  async function handleTranslate(index: number) {
    if (!scan || !userEmail) return
    isTranslating = true
    errorMsg = ''
    try {
      const q = encodeURIComponent(editValue)
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${q}&langpair=en|zh&de=${userEmail}`)
      const data = await res.json()
      
      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || 'Translation failed')
      }

      const translatedText = data.responseData.translatedText
      
      // Update local scan state
      const updatedAnalysis = { ...scan.analysis }
      updatedAnalysis.questions = [...updatedAnalysis.questions]
      updatedAnalysis.questions[index] = {
        ...updatedAnalysis.questions[index],
        sampleAnswer: {
          english: editValue,
          chinese: translatedText
        }
      }

      // Save to Supabase
      const { error: updateError } = await supabase
        .from('homework_scans')
        .update({ analysis: updatedAnalysis })
        .eq('id', scan.id)

      if (updateError) throw updateError

      scan.analysis = updatedAnalysis
      editingIndex = null
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Translation failed'
    } finally {
      isTranslating = false
    }
  }

  function startEdit(index: number, value: string) {
    editingIndex = index
    editValue = value
  }

  function handleAudio(text: string) {
    try {
      speak(text, 'zh', speechRate)
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Audio unavailable'
    }
  }

  onMount(() => {
    if (!activeProfile) { goto('/profiles'); return }
    loadPreferences()
  })

  $effect(() => {
    if (activeProfile?.id && scanId) {
      loadScan()
    }
  })
</script>

{#if scan}
  <section class="scan-detail">
    <header class="page-header">
      <div class="title-group">
        <a href="/homework" class="back-link">← Homework</a>
        <h1>{scan.analysis.title || 'Worksheet'}</h1>
        <p><small>{scan.summary} · {new Date(scan.created_at).toLocaleDateString()}</small></p>
        {#if scan.context}
          <div class="user-context">
            <strong>Provided context:</strong>
            <p>{scan.context}</p>
          </div>
        {/if}
      </div>
      <div class="header-actions">
        <span class="worksheet-type">{scan.analysis.worksheetType}</span>
      </div>
    </header>

    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}

    <ol class="question-list">
      {#each scan.analysis.questions as q, i (i)}
        <li class="question-card">
          <div class="question-original">
            {#each splitCharacters(q.original) as char}
              {#if isChineseCharacter(char)}
                <button 
                  class="char-btn {getHoverStrokeClass(char)}"
                  onclick={() => modalChar = char}
                >{char}</button>
              {:else}
                {char}
              {/if}
            {/each}
          </div>
          <div class="question-translation">{q.translation}</div>
          <div class="answer-row">
            <div class="answer-block">
              <div class="answer-header">
                <span class="answer-label">
                  Chinese
                  <span class="llm-badge" title="AI-generated — verify and write your own answers" aria-label="AI-generated">&#10022;</span>
                </span>
                <button class="icon-btn" onclick={() => handleAudio(q.sampleAnswer.chinese)} aria-label="Listen to answer">♪</button>
              </div>
              <span class="answer-text answer-zh">{q.sampleAnswer.chinese}</span>
            </div>
            <div class="answer-block">
              <div class="answer-header">
                <span class="answer-label">
                  English
                  <span class="llm-badge" title="AI-generated — verify and write your own answers" aria-label="AI-generated">&#10022;</span>
                </span>
                {#if editingIndex !== i}
                  <button class="icon-btn edit-btn" onclick={() => startEdit(i, q.sampleAnswer.english)} aria-label="Edit answer">✎</button>
                {/if}
              </div>
              {#if editingIndex === i}
                <div class="edit-area">
                  <textarea 
                    bind:value={editValue} 
                    disabled={isTranslating}
                    placeholder="Type replacement in English..."
                    rows="2"
                  ></textarea>
                  <div class="edit-actions">
                    <button class="save-btn" onclick={() => handleTranslate(i)} disabled={isTranslating || !editValue}>
                      {isTranslating ? 'Translating...' : 'Translate & Save'}
                    </button>
                    <button class="cancel-btn" onclick={() => editingIndex = null} disabled={isTranslating}>Cancel</button>
                  </div>
                </div>
              {:else}
                <span class="answer-text">{q.sampleAnswer.english}</span>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ol>
  </section>

  {#if modalChar}
    <CharacterModal character={modalChar} onclose={() => modalChar = null} />
  {/if}
{:else if isLoading}
  <p>Loading…</p>
{:else}
  <p>Scan not found.</p>
{/if}

<style>
  .scan-detail {
    width: 100%;
  }

  .worksheet-type {
    display: inline-block;
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: var(--size-1) var(--size-3);
    background: var(--color-lemon);
    border: var(--border);
    color: var(--color-text);
  }

  .error {
    display: block;
    color: var(--color-danger);
    margin-bottom: var(--size-4);
    font-weight: 700;
  }

  .user-context {
    margin-top: var(--size-4);
    padding: var(--size-3);
    background: var(--color-surface);
    border-left: 4px solid var(--color-lemon);
    font-size: var(--font-size-1);
  }

  .user-context strong {
    display: block;
    font-size: var(--font-size-0);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: var(--size-1);
  }

  .user-context p {
    margin: 0;
    color: var(--color-text);
    white-space: pre-wrap;
  }

  .question-list {
    list-style: none;
    padding: 0;
    margin: 0;
    columns: 2 340px;
    column-gap: var(--size-3);
    counter-reset: question;
  }

  .question-list li {
    break-inside: avoid;
    margin-bottom: var(--size-3);
  }

  .question-card {
    border: var(--border);
    padding: var(--size-4);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    counter-increment: question;
    position: relative;
    padding-left: calc(var(--size-4) + 2ch + var(--size-3));
  }

  .question-card::before {
    content: counter(question);
    position: absolute;
    left: var(--size-4);
    top: var(--size-4);
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--font-size-2);
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .question-original {
    font-family: var(--font-display);
    font-size: var(--font-size-5);
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: var(--size-2);
  }

  .question-translation {
    font-size: var(--font-size-2);
    color: var(--color-text-muted);
    margin-bottom: var(--size-4);
    line-height: 1.4;
  }

  .answer-row {
    display: flex;
    gap: var(--size-4);
    flex-wrap: wrap;
  }

  .answer-block {
    flex: 1;
    min-width: 140px;
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
    background: var(--color-mint);
    border: var(--border);
    padding: var(--size-3);
  }

  .answer-label {
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-text-muted);
  }

  .answer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .icon-btn {
    background: none;
    border: none;
    box-shadow: none;
    padding: 0 var(--size-2);
    font-size: var(--font-size-3);
    color: var(--color-text);
    cursor: pointer;
    opacity: 0.5;
    transition: opacity var(--transition-speed), transform var(--transition-speed);
  }

  .icon-btn:hover {
    opacity: 1;
    transform: translate(-2px, -2px);
  }

  .icon-btn:active {
    transform: translate(0, 0);
  }

  .answer-text {
    font-size: var(--font-size-2);
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.4;
  }

  .answer-zh {
    font-family: var(--font-display);
    font-size: var(--font-size-3);
  }

  .answer-block:nth-child(2) {
    background: var(--color-sky);
  }

  .edit-area {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
    width: 100%;
  }

  .edit-area textarea {
    width: 100%;
    font-size: var(--font-size-1);
    padding: var(--size-2);
    border: var(--border);
    resize: vertical;
  }

  .edit-actions {
    display: flex;
    gap: var(--size-2);
  }

  .edit-actions button {
    padding: var(--size-1) var(--size-3);
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: var(--border);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }

  .save-btn {
    background: var(--color-accent);
    color: var(--color-accent-fg);
  }

  .cancel-btn {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .edit-actions button:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .edit-actions button:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .edit-btn {
    opacity: 0.25;
  }

  .edit-btn:hover {
    opacity: 1;
  }
</style>
