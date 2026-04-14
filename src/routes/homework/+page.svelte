<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte'
  import { onMount } from 'svelte'
  import type { HomeworkScan } from '$lib/types'

  let scans = $state<HomeworkScan[]>([])
  let scanning = $state(false)
  let isLoading = $state(true)
  let context = $state('')
  let errorMsg = $state('')
  let selectedFileCount = $state(0)
  let confirmDeleteId = $state<string | null>(null)

  const activeProfile = $derived(getActiveProfile())

  async function loadScans() {
    if (!activeProfile) { isLoading = false; return }
    isLoading = true
    const { data, error } = await supabase
      .from('homework_scans')
      .select('*')
      .eq('profile_id', activeProfile.id)
      .order('created_at', { ascending: false })
    isLoading = false
    if (error) throw error
    scans = data as HomeworkScan[]
  }

  async function createThumbnail(base64Str: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 400
        const scale = MAX_WIDTH / img.width
        canvas.width = MAX_WIDTH
        canvas.height = img.height * scale
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = base64Str
    })
  }

  async function handleScan(event: Event) {
    if (!activeProfile) return
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || [])
    selectedFileCount = files.length
    if (files.length === 0) return
    scanning = true
    errorMsg = ''
    try {
      const base64Images = await Promise.all(files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }))

      // Create thumbnail from first image
      const thumbnail = await createThumbnail(base64Images[0])

      const res = await supabase.functions.invoke('analyse-worksheet', {
        body: { base64Images, language: 'zh', context }
      })
      if (res.error) throw new Error(res.error.message)
      const { summary, analysis } = res.data as { summary: string; analysis: HomeworkScan['analysis'] }

      const { error: insertError } = await supabase.from('homework_scans').insert({
        profile_id: activeProfile.id,
        summary,
        context,
        thumbnail,
        analysis
      })
      if (insertError) throw insertError

      context = ''
      await loadScans()
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to analyse worksheet'
    } finally {
      scanning = false
      input.value = ''
      selectedFileCount = 0
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('homework_scans').delete().eq('id', id)
    if (error) throw error
    await loadScans()
  }

  onMount(() => {
    if (!activeProfile) { goto('/profiles'); return }
  })

  $effect(() => {
    if (activeProfile?.id) {
      loadScans().catch(e => {
        errorMsg = e instanceof Error ? e.message : 'Failed to load scans'
      })
    }
  })
</script>

<section>
  <hgroup class="page-header">
    <div class="title-group">
      <h1>HOMEWORK</h1>
      <p><small>Photograph a worksheet to get a translation and sample answers.</small></p>
    </div>
  </hgroup>

  {#if isLoading}
    <p aria-live="polite">Loading…</p>
  {:else if scans.length === 0}
    <p>No scans yet. Upload a worksheet below.</p>
  {:else}
    <ul class="list-grid">
      {#each scans as scan (scan.id)}
        <li>
          <article class="list-card">
            {#if scan.thumbnail}
              <div class="list-thumbnail">
                <img src={scan.thumbnail} alt="" loading="lazy" />
              </div>
            {/if}
            <a href="/homework/{scan.id}" class="list-name">{scan.analysis.title || `Worksheet · ${new Date(scan.created_at).toLocaleDateString()}`}</a>
            <span class="list-tag">{scan.analysis.worksheetType}</span>
            <span class="list-meta">{new Date(scan.created_at).toLocaleDateString()} · {scan.summary}</span>
            <div class="list-footer">
              <a href="/homework/{scan.id}" class="view-btn">View →</a>
            </div>
            <div class="list-actions">
              {#if confirmDeleteId !== scan.id}
                <button class="danger" onclick={() => (confirmDeleteId = scan.id)} aria-label="Delete scan">×</button>
              {/if}
            </div>
            {#if confirmDeleteId === scan.id}
              <div class="list-confirm-delete">
                <button onclick={() => { handleDelete(scan.id); confirmDeleteId = null }} class="confirm-yes-sm" aria-label="Confirm delete">✓</button>
                <button onclick={() => (confirmDeleteId = null)} class="confirm-no-sm" aria-label="Cancel delete">✕</button>
              </div>
            {/if}
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  <hr />

  <form class="scan-form">
    <h2>Scan worksheet</h2>
    <p class="scan-instructions">Take a photo of the homework worksheet. Inkido will describe the task, translate each question, and provide sample answers.</p>

    <div class="field">
      <label for="homework-context">Extra context (optional)</label>
      <textarea 
        id="homework-context"
        bind:value={context}
        placeholder="e.g. Grade 4 fill-in-the-blank exercise, translate to Chinese"
        disabled={scanning}
        rows="3"
        maxlength="500"
      ></textarea>
    </div>

    {#if errorMsg}
      <output role="alert" class="error-banner">{errorMsg} <button type="button" onclick={() => errorMsg = ''} aria-label="Dismiss">×</button></output>
    {/if}
    <label class="scan-label" class:loading={scanning}>
      {scanning ? `Analysing ${selectedFileCount > 1 ? `${selectedFileCount} pages` : ''}…`.trim() : selectedFileCount > 1 ? `📷 ${selectedFileCount} pages selected` : '📷 Scan page(s)'}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        disabled={scanning}
        onchange={handleScan}
        aria-label="Upload worksheet images"
        class="visually-hidden"
      />
    </label>
  </form>
  </section>

  <style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
  }

  .field label {
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  textarea {
    width: 100%;
    resize: vertical;
    padding: var(--size-2);
    min-height: 80px;
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

  .list-thumbnail {
    margin: calc(var(--size-4) * -1) calc(var(--size-4) * -1) var(--size-2);
    border-bottom: var(--border);
    background: var(--color-bg);
    aspect-ratio: 16/9;
    overflow: hidden;
  }

  .list-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  li:nth-child(5n+1) .list-card { background: var(--color-mint); }
  li:nth-child(5n+2) .list-card { background: var(--color-rose); }
  li:nth-child(5n+3) .list-card { background: var(--color-sky); }
  li:nth-child(5n+4) .list-card { background: var(--color-lavender); }
  li:nth-child(5n+5) .list-card { background: var(--color-lemon); }

  li {
    display: flex;
  }

  .list-card {
    flex: 1;
  }

  .list-name {
    font-weight: 800;
    font-family: var(--font-display);
    font-size: var(--font-size-4);
    color: var(--color-text);
    text-decoration: none;
  }

  .list-name:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 3px;
  }

  .list-tag {
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
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
    display: inline-block;
    text-decoration: none;
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
    z-index: 1;
  }

  .list-actions button {
    background: var(--color-surface);
    border: var(--border);
    box-shadow: none;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-0);
    padding: 0;
    color: var(--color-text);
    opacity: 0.6;
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

  .list-confirm-delete {
    position: absolute;
    top: var(--size-2);
    right: var(--size-2);
    display: flex;
    gap: var(--size-1);
  }

  .confirm-yes-sm, .confirm-no-sm {
    background: none;
    border: var(--border);
    box-shadow: none;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--font-size-0);
    padding: 0;
  }

  .confirm-yes-sm { background: var(--color-danger); color: var(--color-danger-fg); }
  .confirm-no-sm { background: var(--color-surface); color: var(--color-text); }

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
