<script lang="ts">
  import { page } from '$app/state'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte'
  import { onMount } from 'svelte'
  import type { HomeworkScan } from '$lib/types'

  let scan = $state<HomeworkScan | null>(null)
  let errorMsg = $state('')

  const activeProfile = $derived(getActiveProfile())
  const scanId = $derived(page.params.id)

  async function loadScan() {
    const { data, error } = await supabase
      .from('homework_scans')
      .select('*')
      .eq('id', scanId)
      .single()
    if (error) throw error
    scan = data as HomeworkScan
  }

  onMount(() => {
    if (!activeProfile) { goto('/profiles'); return }
  })

  $effect(() => {
    if (activeProfile?.id && scanId) {
      loadScan()
    }
  })
</script>

{#if scan}
  <section class="scan-detail">
    <hgroup class="page-header">
      <div class="title-group">
        <a href="/homework" class="back-link">← Homework</a>
        <h1>{new Date(scan.created_at).toLocaleDateString()}</h1>
        <p><small>{scan.summary}</small></p>
      </div>
      <div class="header-actions">
        <span class="worksheet-type">{scan.analysis.worksheetType}</span>
      </div>
    </hgroup>

    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}

    <ol class="question-list">
      {#each scan.analysis.questions as q, i (i)}
        <li class="question-card">
          <div class="question-original">{q.original}</div>
          <div class="question-translation">{q.translation}</div>
          <div class="answer-row">
            <div class="answer-block">
              <span class="answer-label">Chinese</span>
              <span class="answer-text answer-zh">{q.sampleAnswer.chinese}</span>
            </div>
            <div class="answer-block">
              <span class="answer-label">English</span>
              <span class="answer-text">{q.sampleAnswer.english}</span>
            </div>
          </div>
        </li>
      {/each}
    </ol>
  </section>
{:else}
  <p>Loading…</p>
{/if}

<style>
  .scan-detail {
    max-width: 800px;
    margin: 0 auto;
  }

  .worksheet-type {
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: var(--size-1) var(--size-3);
    background: var(--color-lemon);
    border: var(--border);
    color: var(--color-text);
    align-self: flex-end;
    margin-bottom: var(--size-1);
  }

  .error {
    display: block;
    color: var(--color-danger);
    margin-bottom: var(--size-4);
    font-weight: 700;
  }

  .question-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
    counter-reset: question;
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
</style>
