<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'

  let email = $state('')
  let errorMsg = $state('')
  let loading = $state(false)

  async function handleSubmit() {
    errorMsg = ''
    loading = true
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
      goto('/auth/confirm')
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Sign up failed'
    } finally {
      loading = false
    }
  }
</script>

<div class="auth-page">
  <div class="auth-brand">InkiDo</div>
  <article class="auth-card">
    <hgroup>
      <h1>Sign up</h1>
      <p class="subtitle"><small>We'll send a magic link to your inbox to get you started.</small></p>
    </hgroup>
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit() }}>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required autocomplete="email" />
      </div>
      {#if errorMsg}
        <output role="alert" class="error">{errorMsg}</output>
      {/if}
      <button type="submit" disabled={loading}>
        {loading ? 'Sending link…' : 'Sign up'}
      </button>
    </form>
    <p class="links">
      Already have an account? <a href="/auth/login">Log in</a>
    </p>
  </article>
</div>

<style>
  .auth-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: var(--color-bg);
    padding: var(--size-4);
    gap: var(--size-4);
  }

  .auth-brand {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--font-size-8);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text);
    background: var(--color-lemon);
    border: var(--border);
    box-shadow: var(--shadow);
    padding: var(--size-2) var(--size-5);
  }

  .auth-card {
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
    box-shadow: var(--shadow-lg);
    padding: var(--size-8);
    width: 100%;
    max-width: 400px;
  }

  h1 {
    margin: 0 0 var(--size-2);
    font-size: var(--font-size-6);
    text-transform: uppercase;
  }

  .subtitle {
    margin: 0 0 var(--size-6);
    color: var(--color-text-muted);
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
    color: var(--color-text);
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
    width: 100%;
    padding: var(--size-3);
    font-size: var(--font-size-2);
  }

  .links {
    margin-top: var(--size-5);
    text-align: center;
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
  }
</style>
