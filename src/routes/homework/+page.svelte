<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte'
  import { onMount } from 'svelte'
  import type { HomeworkScan } from '$lib/types'

  let scans = $state<HomeworkScan[]>([])
  let scanning = $state(false)
  let errorMsg = $state('')
  let selectedId = $state<string | null>(null)

  const activeProfile = $derived(getActiveProfile())
  const selectedScan = $derived(scans.find(s => s.id === selectedId) ?? null)

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
      selectedId = scans[0]?.id ?? null
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
    if (selectedId === id) selectedId = null
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

<section>
  <hgroup class="page-header">
    <div class="title-group">
      <h1>Homework</h1>
      <p><small>Photograph a worksheet to get a translation and sample answers.</small></p>
    </div>
  </hgroup>

  {#if errorMsg}
    <output role="alert" class="error">{errorMsg}</output>
  {/if}

  {#if scans.length === 0}
    <p>No scans yet. Upload a worksheet below.</p>
  {:else}
    <ul class="list-grid">
      {#each scans as scan (scan.id)}
        <li>
          <article class="list-card">
            <span class="list-name">{new Date(scan.created_at).toLocaleDateString()}</span>
            <span class="list-meta">{scan.summary}</span>
            <div class="list-footer">
              <button
                class="view-btn"
                onclick={() => selectedId = selectedId === scan.id ? null : scan.id}
                aria-expanded={selectedId === scan.id}
              >
                {selectedId === scan.id ? 'Hide ▲' : 'View →'}
              </button>
            </div>
            <div class="list-actions">
              <button class="danger" onclick={() => handleDelete(scan.id)} aria-label="Delete scan">×</button>
            </div>
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  {#if selectedScan}
    <div class="scan-detail">
      <ol class="question-list">
        {#each selectedScan.analysis.questions as q, i (i)}
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
    </div>
  {/if}

  <hr />

  <div class="scan-form">
    <h2>Scan worksheet</h2>
    <p class="scan-instructions">Take a photo of the homework worksheet. Inkido will describe the task, translate each question, and provide sample answers.</p>
    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}
    <label class="scan-label" class:loading={scanning}>
      {scanning ? 'Analysing…' : '📷 Scan worksheet'}
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
</section>

<style>
  .error {
    display: block;
    color: var(--color-danger);
    font-size: var(--font-size-1);
    font-weight: 700;
    margin-bottom: var(--size-3);
  }

  /* ── Card grid — mirrors spellings/+page.svelte ─────── */
  .list-grid {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--size-6);
    display: grid;
    gap: var(--size-4);
  }

  @media (min-width: 600px) {
    .list-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 900px) {
    .list-grid { grid-template-columns: repeat(3, 1fr); }
  }

  .list-card {
    border: var(--border);
    border-radius: 0;
    padding: var(--size-4);
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
    box-shadow: var(--shadow-sm);
    position: relative;
  }

  li:nth-child(5n+1) .list-card { background: var(--color-mint); }
  li:nth-child(5n+2) .list-card { background: var(--color-rose); }
  li:nth-child(5n+3) .list-card { background: var(--color-sky); }
  li:nth-child(5n+4) .list-card { background: var(--color-lavender); }
  li:nth-child(5n+5) .list-card { background: var(--color-lemon); }

  .list-name {
    font-weight: 800;
    font-family: var(--font-display);
    font-size: var(--font-size-4);
    color: var(--color-text);
  }

  .list-meta {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
    flex: 1;
    line-height: 1.4;
  }

  .list-footer {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    margin-top: var(--size-3);
  }

  .view-btn {
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-accent);
    color: var(--color-accent-fg);
    padding: var(--size-1) var(--size-3);
    border: var(--border);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition: transform var(--transition-speed), box-shadow var(--transition-speed);
  }

  .view-btn:hover {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .view-btn:active {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .list-actions {
    position: absolute;
    top: var(--size-2);
    right: var(--size-2);
    display: flex;
    gap: var(--size-1);
  }

  .list-actions button {
    background: none;
    border: none;
    box-shadow: none;
    font-size: var(--font-size-3);
    line-height: 1;
    padding: var(--size-1);
    color: var(--color-text);
    opacity: 0.25;
    cursor: pointer;
  }

  .list-actions button:hover {
    opacity: 1;
    transform: none;
    box-shadow: none;
  }

  .list-actions button.danger:hover {
    color: var(--color-danger);
  }

  /* ── Scan detail ─────────────────────────────────────── */
  .scan-detail {
    margin-bottom: var(--size-6);
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

  /* ── Scan form ───────────────────────────────────────── */
  .scan-form {
    max-width: 400px;
    background: var(--color-surface);
    border: var(--border);
    padding: var(--size-6);
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  .scan-form h2 {
    font-size: var(--font-size-4);
    margin: 0;
  }

  .scan-instructions {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.5;
  }

  .scan-label {
    display: inline-flex;
    align-items: center;
    padding: var(--size-2) var(--size-5);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: var(--border);
    box-shadow: var(--shadow-sm);
    font-size: var(--font-size-2);
    font-weight: 700;
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
</style>
