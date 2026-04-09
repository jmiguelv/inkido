<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte'
  import { onMount } from 'svelte'
  import type { HomeworkScan } from '$lib/types'

  let scans = $state<HomeworkScan[]>([])
  let scanning = $state(false)
  let errorMsg = $state('')
  let expandedId = $state<string | null>(null)

  const activeProfile = $derived(getActiveProfile())

  async function loadScans() {
    if (!activeProfile) return
    const { data, error } = await supabase
      .from('homework_scans')
      .select('*')
      .eq('profile_id', activeProfile.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    scans = data as HomeworkScan[]
  }

  async function handleScan(event: Event) {
    if (!activeProfile) return
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    scanning = true
    errorMsg = ''
    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await supabase.functions.invoke('analyse-worksheet', {
        body: { base64Image, language: 'zh' }
      })
      if (res.error) throw new Error(res.error.message)
      const { summary, analysis } = res.data as { summary: string; analysis: HomeworkScan['analysis'] }

      const { error: insertError } = await supabase.from('homework_scans').insert({
        profile_id: activeProfile.id,
        summary,
        analysis
      })
      if (insertError) throw insertError

      await loadScans()
      expandedId = scans[0]?.id ?? null
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to analyse worksheet'
    } finally {
      scanning = false
      input.value = ''
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('homework_scans').delete().eq('id', id)
    if (error) throw error
    if (expandedId === id) expandedId = null
    await loadScans()
  }

  onMount(() => {
    if (!activeProfile) { goto('/profiles'); return }
  })

  $effect(() => {
    if (activeProfile?.id) {
      loadScans()
    }
  })
</script>

<section class="homework">
  <hgroup class="page-header">
    <div class="title-group">
      <h1>Homework Helper</h1>
      <p><small>Photograph a worksheet to get a translation and sample answers.</small></p>
    </div>
  </hgroup>

  {#if errorMsg}
    <output role="alert" class="error">{errorMsg}</output>
  {/if}

  <div class="scan-card">
    <p class="scan-instructions">Take a photo of the homework worksheet. Inkido will describe the task and translate each question.</p>
    <label class="scan-label" class:loading={scanning}>
      {#if scanning}
        Analysing…
      {:else}
        📷 Scan worksheet
      {/if}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        disabled={scanning}
        onchange={handleScan}
        aria-label="Upload worksheet image"
        class="visually-hidden"
      />
    </label>
  </div>

  {#if scans.length > 0}
    <h2 class="history-heading">Past scans</h2>
    <ul class="scan-list">
      {#each scans as scan (scan.id)}
        <li class="scan-item">
          <div class="scan-header">
            <div class="scan-meta">
              <span class="scan-date">{new Date(scan.created_at).toLocaleDateString()}</span>
              <span class="scan-type tag">{scan.analysis.worksheetType}</span>
            </div>
            <div class="scan-actions">
              <button
                class="expand-btn"
                onclick={() => expandedId = expandedId === scan.id ? null : scan.id}
                aria-expanded={expandedId === scan.id}
              >
                {expandedId === scan.id ? 'Hide ▲' : 'Show ▼'}
              </button>
              <button class="delete-btn danger" onclick={() => handleDelete(scan.id)} aria-label="Delete scan">×</button>
            </div>
          </div>
          <p class="scan-summary">{scan.summary}</p>

          {#if expandedId === scan.id}
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
          {/if}
        </li>
      {/each}
    </ul>
  {:else if !scanning}
    <p class="empty-msg">No scans yet. Upload a worksheet above to get started.</p>
  {/if}
</section>

<style>
  .homework {
    max-width: 800px;
    margin: 0 auto;
  }

  .error {
    display: block;
    color: var(--color-danger);
    margin-bottom: var(--size-4);
    font-weight: 700;
  }

  /* ── Scan card ───────────────────────────────────────── */
  .scan-card {
    background: var(--color-surface);
    border: var(--border);
    box-shadow: var(--shadow);
    padding: var(--size-6);
    margin-bottom: var(--size-8);
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  .scan-instructions {
    font-size: var(--font-size-2);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.5;
  }

  .scan-label {
    display: inline-flex;
    align-items: center;
    gap: var(--size-2);
    padding: var(--size-3) var(--size-6);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: var(--border);
    box-shadow: var(--shadow-sm);
    font-size: var(--font-size-2);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    align-self: flex-start;
    transition: transform var(--transition-speed), box-shadow var(--transition-speed);
  }

  .scan-label:hover:not(.loading) {
    transform: translate(-2px, -2px);
    box-shadow: var(--shadow);
  }

  .scan-label.loading {
    opacity: 0.6;
    cursor: default;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  /* ── History ─────────────────────────────────────────── */
  .history-heading {
    font-size: var(--font-size-3);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 var(--size-4);
  }

  .scan-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  .scan-item {
    background: var(--color-surface);
    border: var(--border);
    box-shadow: var(--shadow-sm);
    padding: var(--size-4);
  }

  .scan-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--size-3);
    margin-bottom: var(--size-2);
  }

  .scan-meta {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    flex-wrap: wrap;
  }

  .scan-date {
    font-size: var(--font-size-1);
    font-weight: 700;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tag {
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px var(--size-2);
    background: var(--color-lemon);
    border: var(--border);
    color: var(--color-text);
  }

  .scan-actions {
    display: flex;
    gap: var(--size-2);
    flex-shrink: 0;
  }

  .expand-btn {
    font-size: var(--font-size-1);
    font-weight: 700;
    padding: var(--size-1) var(--size-3);
    border: var(--border);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .expand-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .delete-btn {
    background: none;
    border: none;
    box-shadow: none;
    font-size: var(--font-size-4);
    line-height: 1;
    padding: var(--size-1);
    color: var(--color-text);
    opacity: 0.25;
    cursor: pointer;
  }

  .delete-btn:hover {
    opacity: 1;
    color: var(--color-danger);
    transform: none;
    box-shadow: none;
  }

  .scan-summary {
    font-size: var(--font-size-2);
    color: var(--color-text);
    margin: 0;
    line-height: 1.5;
  }

  /* ── Questions ───────────────────────────────────────── */
  .question-list {
    list-style: none;
    padding: 0;
    margin: var(--size-4) 0 0;
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
    counter-reset: question;
  }

  .question-card {
    border: var(--border);
    padding: var(--size-4);
    background: var(--color-bg);
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
    color: var(--color-text);
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

  .empty-msg {
    color: var(--color-text-muted);
    font-size: var(--font-size-2);
  }
</style>
