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

  onMount(() => {
    loadProfiles()
  })
</script>

<section>
  <h1>Dashboard</h1>

  <h2>Profiles</h2>

  {#if profiles.length === 0}
    <p>No profiles yet. Add one below.</p>
  {:else}
    <ul class="profile-list">
      {#each profiles as profile (profile.id)}
        <li>
          <article class="profile-card" class:active={activeProfile?.id === profile.id}>
            <span class="profile-name">{profile.name}</span>
            <div class="profile-actions">
              <button onclick={() => handleSelectProfile(profile)}>Select</button>
              <button class="danger" onclick={() => handleDeleteProfile(profile.id)} aria-label="Delete {profile.name}">Delete</button>
            </div>
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); handleAddProfile() }} class="add-profile-form">
    <h3>Add a profile</h3>
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
    font-size: var(--font-size-5);
    margin: 0 0 var(--size-4);
  }

  .profile-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--size-6);
    display: grid;
    gap: var(--size-3);
  }

  @media (min-width: 600px) {
    .profile-list { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 900px) {
    .profile-list { grid-template-columns: repeat(3, 1fr); }
  }

  .profile-card {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-3);
    transition: border-color var(--transition-speed);
  }

  .profile-card.active {
    border-color: var(--color-accent);
  }

  .profile-name {
    font-weight: var(--font-weight-6);
    font-size: var(--font-size-3);
  }

  .profile-actions {
    display: flex;
    gap: var(--size-2);
  }

  .profile-actions button {
    padding: var(--size-1) var(--size-3);
    border-radius: var(--radius);
    font-size: var(--font-size-1);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    transition: all var(--transition-speed);
  }

  .profile-actions button:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .profile-actions button.danger:hover {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .add-profile-form {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-6);
    max-width: 400px;
  }

  h3 {
    margin: 0 0 var(--size-4);
    font-size: var(--font-size-4);
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

  input {
    padding: var(--size-2) var(--size-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-2);
  }

  input:focus {
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

  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
