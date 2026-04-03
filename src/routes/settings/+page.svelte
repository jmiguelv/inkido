<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import type { UserPreferences } from '$lib/types.ts'

  let speechRate = $state(0.75)
  let newEmail = $state('')
  let emailMsg = $state('')
  let loading = $state(false)
  let deleteConfirm = $state('')

  async function loadPreferences() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const prefs = user.user_metadata as Partial<UserPreferences>
    if (prefs.speechRate !== undefined) speechRate = prefs.speechRate
  }

  async function handleSpeechRate() {
    const { error } = await supabase.auth.updateUser({ data: { speechRate } })
    if (error) throw error
  }

  async function handleChangeEmail() {
    emailMsg = ''
    loading = true
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      emailMsg = 'Confirmation email sent to new address.'
      newEmail = ''
    } catch (e) {
      emailMsg = e instanceof Error ? e.message : 'Failed'
    } finally {
      loading = false
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    await supabase.auth.signOut()
    goto('/auth/login')
  }

  onMount(() => {
    loadPreferences()
  })
</script>

<section>
  <h1>Settings</h1>

  <article class="settings-card">
    <h2>Speech rate</h2>
    <p>Controls how fast the app reads words aloud.</p>
    <div class="field">
      <label for="speech-rate">
        Rate: {speechRate.toFixed(2)}×
      </label>
      <input
        id="speech-rate"
        type="range"
        min="0.25"
        max="1"
        step="0.05"
        bind:value={speechRate}
        oninput={handleSpeechRate}
      />
      <div class="range-labels">
        <span>0.25× (slow)</span>
        <span>1× (normal)</span>
      </div>
    </div>
  </article>

  <article class="settings-card">
    <h2>Change email</h2>
    <form onsubmit={(e) => { e.preventDefault(); handleChangeEmail() }}>
      <div class="field">
        <label for="new-email">New email address</label>
        <input id="new-email" type="email" bind:value={newEmail} required autocomplete="email" />
      </div>
      {#if emailMsg}
        <output role="alert" class:error={emailMsg.startsWith('F')} class:success={!emailMsg.startsWith('F')}>
          {emailMsg}
        </output>
      {/if}
      <button type="submit" disabled={loading}>Update email</button>
    </form>
  </article>

  <article class="settings-card danger-zone">
    <h2>Delete account</h2>
    <p>This will permanently delete your account and all your data. This cannot be undone.</p>
    <form onsubmit={(e) => { e.preventDefault(); handleDeleteAccount() }}>
      <div class="field">
        <label for="delete-confirm">Type DELETE to confirm</label>
        <input id="delete-confirm" type="text" bind:value={deleteConfirm} autocomplete="off" />
      </div>
      <button type="submit" class="danger" disabled={deleteConfirm !== 'DELETE'}>
        Delete my account
      </button>
    </form>
  </article>
</section>

<style>
  h1 {
    font-size: var(--font-size-8);
    margin: 0 0 var(--size-6);
  }

  .settings-card {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    padding: var(--size-6);
    max-width: 500px;
    margin-bottom: var(--size-5);
    box-shadow: var(--shadow-sm);
  }

  h2 {
    font-size: var(--font-size-4);
    margin: 0 0 var(--size-3);
  }

  p {
    color: var(--color-text-muted);
    margin: 0 0 var(--size-4);
    font-size: var(--font-size-1);
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

  input[type="range"] {
    width: 100%;
    accent-color: var(--color-accent);
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-0);
    color: var(--color-text-muted);
  }

  input[type="email"],
  input[type="text"] {
    padding: var(--size-2) var(--size-3);
    font-size: var(--font-size-2);
  }

  output {
    display: block;
    font-size: var(--font-size-1);
    font-weight: 700;
    margin-bottom: var(--size-3);
  }

  .error { color: var(--color-danger); }
  .success { color: var(--color-text); }

  button[type="submit"] {
    padding: var(--size-2) var(--size-5);
    font-size: var(--font-size-2);
  }

  button.danger {
    background: var(--color-danger);
    color: var(--color-danger-fg);
    border: var(--border);
  }

  button.danger:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 5px 5px 0 var(--color-border);
  }

  .danger-zone {
    border-color: var(--color-danger);
    background: var(--color-rose);
  }
</style>
