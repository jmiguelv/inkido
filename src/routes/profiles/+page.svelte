<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import { goto } from '$app/navigation'
  import { setActiveProfile, getActiveProfile } from '$lib/stores.svelte.ts'
  import { onMount } from 'svelte'
  import type { Profile } from '$lib/types.ts'

  let profiles = $state<Profile[]>([])
  let newProfileName = $state('')
  let errorMsg = $state('')
  let loading = $state(false)
  let renamingId = $state<string | null>(null)
  let renameValue = $state('')

  const activeProfile = $derived(getActiveProfile())

  async function loadProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (error) throw error
    profiles = data as Profile[]
  }

  async function handleAddProfile() {
    if (!newProfileName.trim()) return
    errorMsg = ''
    loading = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('profiles').insert({ name: newProfileName.trim(), parent_id: user.id })
      if (error) throw error
      newProfileName = ''
      await loadProfiles()
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to add profile'
    } finally {
      loading = false
    }
  }

  async function handleDeleteProfile(id: string) {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) throw error
    if (activeProfile?.id === id) setActiveProfile(profiles.find(p => p.id !== id) ?? null as unknown as Profile)
    await loadProfiles()
  }

  function handleSelectProfile(profile: Profile) {
    setActiveProfile(profile)
    goto('/lists')
  }

  function startRename(profile: Profile) {
    renamingId = profile.id
    renameValue = profile.name
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return
    const { error } = await supabase.from('profiles').update({ name: renameValue.trim() }).eq('id', id)
    if (error) throw error
    if (activeProfile?.id === id) setActiveProfile({ ...activeProfile, name: renameValue.trim() })
    renamingId = null
    await loadProfiles()
  }

  onMount(() => {
    loadProfiles()
  })
</script>

<section>
  <h1>Who's learning today?</h1>

  {#if profiles.length === 0}
    <p class="empty-state">No profiles yet. Add one below to get started.</p>
  {:else}
    <ul class="profile-list">
      {#each profiles as profile (profile.id)}
        <li class="profile-item">
          {#if renamingId === profile.id}
            <form
              class="rename-form"
              onsubmit={(e) => { e.preventDefault(); handleRename(profile.id) }}
            >
              <input
                type="text"
                bind:value={renameValue}
                required
                aria-label="New name for {profile.name}"
              />
              <button type="submit">Save</button>
              <button type="button" onclick={() => { renamingId = null }}>Cancel</button>
            </form>
          {:else}
            <button
              class="profile-card"
              class:active={activeProfile?.id === profile.id}
              onclick={() => handleSelectProfile(profile)}
            >
              <span class="profile-name">{profile.name}</span>
              {#if activeProfile?.id === profile.id}
                <span class="active-badge">Active</span>
              {/if}
            </button>
            <button
              class="rename-btn"
              onclick={() => startRename(profile)}
              aria-label="Rename {profile.name}"
            >✎</button>
            <button
              class="delete-btn"
              onclick={() => handleDeleteProfile(profile.id)}
              aria-label="Delete {profile.name}"
            >×</button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); handleAddProfile() }} class="add-profile-form">
    <h2>Add a profile</h2>
    <div class="field">
      <label for="profile-name">Name</label>
      <input id="profile-name" type="text" bind:value={newProfileName} required placeholder="e.g. Alice" />
    </div>
    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}
    <button type="submit" disabled={loading}>
      {loading ? 'Adding…' : 'Add profile'}
    </button>
  </form>
</section>

<style>
  h1 {
    font-size: var(--font-size-8);
    margin: 0 0 var(--size-6);
  }

  h2 {
    font-size: var(--font-size-4);
    margin: 0 0 var(--size-4);
  }

  .empty-state {
    color: var(--color-text-muted);
    font-size: var(--font-size-2);
    margin: 0 0 var(--size-6);
  }

  .profile-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--size-8);
    display: grid;
    gap: var(--size-3);
  }

  @media (min-width: 480px) {
    .profile-list { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 720px) {
    .profile-list { grid-template-columns: repeat(3, 1fr); }
  }

  .profile-item {
    position: relative;
  }

  .profile-card {
    width: 100%;
    background: var(--color-surface);
    border: var(--border);
    padding: var(--size-5) var(--size-4);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--size-2);
    box-shadow: var(--shadow);
    cursor: pointer;
    text-align: left;
    transition: transform var(--transition-speed), box-shadow var(--transition-speed);
  }

  .profile-card:hover {
    transform: translate(-3px, -3px);
    box-shadow: 8px 8px 0 var(--color-border);
  }

  .profile-card:active {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .profile-card.active {
    background: var(--color-lemon);
  }

  .profile-name {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--font-size-5);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
  }

  .active-badge {
    font-size: var(--font-size-0);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
  }

  .rename-btn,
  .delete-btn {
    position: absolute;
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

  .rename-btn {
    top: var(--size-2);
    right: calc(var(--size-2) + var(--size-6));
  }

  .delete-btn {
    top: var(--size-2);
    right: var(--size-2);
  }

  .rename-btn:hover {
    opacity: 1;
    color: var(--color-text);
  }

  .delete-btn:hover {
    opacity: 1;
    color: var(--color-danger);
  }

  .rename-form {
    display: flex;
    gap: var(--size-2);
    align-items: center;
    border: var(--border);
    padding: var(--size-3) var(--size-4);
    background: var(--color-surface);
    box-shadow: var(--shadow);
  }

  .rename-form input {
    flex: 1;
    padding: var(--size-1) var(--size-2);
    font-size: var(--font-size-2);
    font-family: var(--font-display);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    min-width: 0;
  }

  .rename-form button {
    padding: var(--size-1) var(--size-3);
    border: var(--border);
    background: var(--color-surface);
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    white-space: nowrap;
  }

  .rename-form button:hover {
    transform: translate(-2px, -2px);
    box-shadow: 5px 5px 0 var(--color-border);
  }

  .rename-form button:active {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .add-profile-form {
    background: var(--color-surface);
    border: var(--border);
    padding: var(--size-6);
    max-width: 400px;
    box-shadow: var(--shadow);
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

  input {
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
