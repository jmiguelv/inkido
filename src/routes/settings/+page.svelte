<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import { goto } from '$app/navigation'
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

  $effect(() => {
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
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-6);
    max-width: 500px;
    margin-bottom: var(--size-5);
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
    font-weight: var(--font-weight-6);
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
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-2);
  }

  input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
    border-color: var(--color-accent);
  }

  output {
    display: block;
    font-size: var(--font-size-1);
    margin-bottom: var(--size-3);
  }

  .error { color: var(--color-danger); }
  .success { color: var(--color-accent); }

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

  button.danger {
    background: var(--color-danger);
  }

  .danger-zone {
    border-color: var(--color-danger);
  }
</style>
