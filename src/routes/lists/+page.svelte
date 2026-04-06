<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte'
  import { onMount } from 'svelte'
  import type { WordList } from '$lib/types'

  const LANGUAGES = [
    { code: 'zh', label: 'Mandarin Chinese' }
  ]

  let lists = $state<WordList[]>([])
  let newListName = $state('')
  let newListLanguage = $state('zh')
  let errorMsg = $state('')
  let loading = $state(false)
  let renamingId = $state<string | null>(null)
  let renameValue = $state('')

  const activeProfile = $derived(getActiveProfile())

  async function loadLists() {
    if (!activeProfile) return
    const { data, error } = await supabase
      .from('word_lists')
      .select('*')
      .eq('profile_id', activeProfile.id)
      .order('created_at')
    if (error) throw error
    lists = data as WordList[]
  }

  async function handleCreateList() {
    if (!newListName.trim() || !activeProfile) return
    errorMsg = ''
    loading = true
    try {
      const { error } = await supabase.from('word_lists').insert({
        profile_id: activeProfile.id,
        name: newListName.trim(),
        language: newListLanguage
      })
      if (error) throw error
      newListName = ''
      await loadLists()
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to create list'
    } finally {
      loading = false
    }
  }

  async function handleDeleteList(id: string) {
    const { error } = await supabase.from('word_lists').delete().eq('id', id)
    if (error) throw error
    await loadLists()
  }

  function startRename(list: WordList) {
    renamingId = list.id
    renameValue = list.name
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return
    const { error } = await supabase.from('word_lists').update({ name: renameValue.trim() }).eq('id', id)
    if (error) throw error
    renamingId = null
    await loadLists()
  }

  onMount(() => {
    if (!activeProfile) {
      goto('/profiles')
      return
    }
  })

  $effect(() => {
    if (activeProfile?.id) {
      loadLists()
    }
  })
</script>

<section>
  <hgroup class="page-header">
    <div class="title-group">
      <h1>{activeProfile?.name ?? ''}'s Lists</h1>
      <p><small>Manage your practice lists, organized by topic or difficulty.</small></p>
    </div>
  </hgroup>

  {#if lists.length === 0}
    <p>No lists yet. Create one below.</p>
  {:else}
    <ul class="list-grid">
      {#each lists as list (list.id)}
        <li>
          <article class="list-card">
            {#if renamingId === list.id}
              <form onsubmit={(e) => { e.preventDefault(); handleRename(list.id) }} class="rename-form">
                <input
                  type="text"
                  bind:value={renameValue}
                  required
                  aria-label="New name for {list.name}"
                />
                <button type="submit">Save</button>
                <button type="button" onclick={() => { renamingId = null }}>Cancel</button>
              </form>
            {:else}
              <a href="/lists/{list.id}" class="list-name">{list.name}</a>
              <span class="list-meta">
                {LANGUAGES.find(l => l.code === list.language)?.label ?? list.language}
                {#if list.last_practiced}
                  &middot; practised {new Date(list.last_practiced).toLocaleDateString()}
                {/if}
              </span>
              <div class="list-footer">
                <a href="/lists/{list.id}/practice" class="practice-link">Practice →</a>
                <div class="list-actions">
                  <button onclick={() => startRename(list)} aria-label="Rename {list.name}">Rename</button>
                  <button class="danger" onclick={() => handleDeleteList(list.id)} aria-label="Delete {list.name}">×</button>
                </div>
              </div>
            {/if}
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  <hr />

  <form onsubmit={(e) => { e.preventDefault(); handleCreateList() }} class="create-form">
    <h2>New list</h2>
    <div class="field">
      <label for="list-name">Name</label>
      <input id="list-name" type="text" bind:value={newListName} required placeholder="e.g. Week 3" />
    </div>
    <div class="field">
      <label for="list-language">Language</label>
      <select id="list-language" bind:value={newListLanguage}>
        {#each LANGUAGES as lang (lang.code)}
          <option value={lang.code}>{lang.label}</option>
        {/each}
      </select>
    </div>
    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}
    <button type="submit" disabled={loading}>
      {loading ? 'Creating…' : 'Create list'}
    </button>
  </form>
</section>

<style>
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
    text-decoration: none;
    color: var(--color-text);
  }

  .list-name:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 3px;
  }

  .list-meta {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
    flex: 1;
  }

  .list-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-2);
    margin-top: var(--size-3);
  }

  .practice-link {
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-decoration: none;
    color: var(--color-text);
    background: var(--color-text);
    color: var(--color-lemon);
    padding: var(--size-1) var(--size-3);
    border: var(--border);
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-speed), box-shadow var(--transition-speed);
  }

  .practice-link:hover {
    transform: translate(-2px, -2px);
    box-shadow: 5px 5px 0 var(--color-border);
  }

  .practice-link:active {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .list-actions {
    display: flex;
    gap: var(--size-1);
  }

  .list-actions button, .rename-form button {
    padding: var(--size-1) var(--size-2);
    border-radius: 0;
    font-size: var(--font-size-1);
    font-weight: 700;
    border: var(--border);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
  }

  .list-actions button:hover:not(:disabled),
  .rename-form button:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .list-actions button:active:not(:disabled),
  .rename-form button:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .list-actions button.danger:hover {
    background: var(--color-danger);
    color: var(--color-danger-fg);
  }

  .rename-form {
    display: flex;
    gap: var(--size-2);
  }

  .rename-form input {
    flex: 1;
    padding: var(--size-1) var(--size-2);
    font-size: var(--font-size-1);
  }

  .create-form {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    padding: var(--size-6);
    max-width: 400px;
    box-shadow: var(--shadow);
  }

  h2 {
    font-size: var(--font-size-4);
    margin: 0 0 var(--size-4);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
    margin-bottom: var(--size-4);
  }

  label {
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  input, select {
    padding: var(--size-2) var(--size-3);
    font-size: var(--font-size-2);
  }

  .error {
    display: block;
    color: var(--color-danger);
    font-size: var(--font-size-1);
    font-weight: 700;
    margin-bottom: var(--size-3);
  }

  button[type="submit"] {
    padding: var(--size-2) var(--size-5);
    font-size: var(--font-size-2);
  }
</style>
