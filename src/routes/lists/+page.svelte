<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import { goto } from '$app/navigation'
  import { getActiveProfile } from '$lib/stores.svelte.ts'
  import { onMount } from 'svelte'
  import type { WordList } from '$lib/types.ts'

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
      goto('/')
      return
    }
    loadLists()
  })
</script>

<section>
  <h1>{activeProfile?.name ?? ''}'s Lists</h1>

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
              <div class="list-actions">
                <button onclick={() => startRename(list)}>Rename</button>
                <button class="danger" onclick={() => handleDeleteList(list.id)} aria-label="Delete {list.name}">Delete</button>
              </div>
            {/if}
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); handleCreateList() }} class="create-form">
    <h2>New list</h2>
    <div class="field">
      <label for="list-name">Name</label>
      <input id="list-name" type="text" bind:value={newListName} required placeholder="e.g. Week 3" />
    </div>
    <div class="field">
      <label for="list-language">Language</label>
      <select id="list-language" bind:value={newListLanguage}>
        {#each LANGUAGES as lang}
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
  h1 {
    font-size: var(--font-size-8);
    margin: 0 0 var(--size-6);
  }

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
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-4);
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }

  .list-name {
    font-weight: var(--font-weight-7);
    font-size: var(--font-size-4);
    text-decoration: none;
    color: var(--color-text);
  }

  .list-name:hover { color: var(--color-accent); }

  .list-meta {
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
  }

  .list-actions {
    display: flex;
    gap: var(--size-2);
    margin-top: var(--size-2);
  }

  .list-actions button, .rename-form button {
    padding: var(--size-1) var(--size-3);
    border-radius: var(--radius);
    font-size: var(--font-size-1);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    transition: all var(--transition-speed);
  }

  .list-actions button:hover { border-color: var(--color-accent); color: var(--color-accent); }
  .list-actions button.danger:hover { border-color: var(--color-danger); color: var(--color-danger); }

  .rename-form {
    display: flex;
    gap: var(--size-2);
  }

  .rename-form input {
    flex: 1;
    padding: var(--size-1) var(--size-2);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-1);
  }

  .create-form {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-6);
    max-width: 400px;
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
    font-weight: var(--font-weight-6);
  }

  input, select {
    padding: var(--size-2) var(--size-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-2);
  }

  input:focus, select:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
    border-color: var(--color-accent);
  }

  .error {
    display: block;
    color: var(--color-danger);
    font-size: var(--font-size-1);
    margin-bottom: var(--size-3);
  }

  button[type="submit"] {
    padding: var(--size-2) var(--size-5);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: none;
    border-radius: var(--radius);
    font-size: var(--font-size-2);
    font-weight: var(--font-weight-6);
  }

  button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
