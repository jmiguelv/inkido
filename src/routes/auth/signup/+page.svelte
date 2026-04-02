<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
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
  <article class="auth-card">
    <h1>Sign up</h1>
    <p class="subtitle">We'll send a magic link to your inbox to get you started.</p>
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
    align-items: center;
    justify-content: center;
    background-color: var(--color-bg);
    padding: var(--size-4);
  }

  .auth-card {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: var(--size-8);
    width: 100%;
    max-width: 400px;
  }

  h1 {
    margin: 0 0 var(--size-2);
    font-size: var(--font-size-6);
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
    font-weight: var(--font-weight-6);
    color: var(--color-text);
  }

  input {
    padding: var(--size-2) var(--size-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-2);
    color: var(--color-text);
    background: var(--color-surface);
    transition: border-color var(--transition-speed);
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
    width: 100%;
    padding: var(--size-3);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: none;
    border-radius: var(--radius);
    font-size: var(--font-size-2);
    font-weight: var(--font-weight-6);
    transition: opacity var(--transition-speed);
  }

  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .links {
    margin-top: var(--size-5);
    text-align: center;
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
  }
</style>
