<script lang="ts">
  import { supabase } from '$lib/supabase'

  let email = $state('')
  let resendMsg = $state('')
  let resendError = $state(false)
  let resending = $state(false)

  async function handleResend() {
    if (!email.trim()) return
    resending = true
    resendMsg = ''
    resendError = false
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
      if (error) throw error
      resendMsg = 'Link resent — check your inbox.'
    } catch (e) {
      resendMsg = e instanceof Error ? e.message : 'Failed to resend link.'
      resendError = true
    } finally {
      resending = false
    }
  }
</script>

<div class="auth-page">
  <div class="auth-brand">InkiDo</div>
  <article class="auth-card">
    <hgroup>
      <h1>Check your email</h1>
      <p><small>We've sent a confirmation link to your email address. Click the link to activate your account.</small></p>
    </hgroup>

    <details class="resend-section">
      <summary>Didn't receive the email?</summary>
      <form onsubmit={(e) => { e.preventDefault(); handleResend() }} class="resend-form">
        <label for="resend-email">Your email address</label>
        <input id="resend-email" type="email" bind:value={email} required autocomplete="email" placeholder="you@example.com" />
        {#if resendMsg}
          <output role="alert" class="error-banner" class:is-success={!resendError}>
            {resendMsg}
            <button type="button" onclick={() => resendMsg = ''} aria-label="Dismiss">×</button>
          </output>
        {/if}
        <button type="submit" disabled={resending}>
          {resending ? 'Sending…' : 'Resend link'}
        </button>
      </form>
    </details>

    <p class="links"><a href="/auth/login">Back to log in</a></p>
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
    background: var(--color-mint);
    border: var(--border);
    border-radius: 0;
    box-shadow: var(--shadow-lg);
    padding: var(--size-8);
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  h1 {
    margin: 0 0 var(--size-4);
    font-size: var(--font-size-6);
    text-transform: uppercase;
  }

  p {
    color: var(--color-text-muted);
    line-height: var(--font-lineheight-3);
  }

  .links {
    margin-top: var(--size-5);
  }

  .resend-section {
    margin-top: var(--size-6);
    border-top: var(--border);
    padding-top: var(--size-4);
    text-align: left;
  }

  summary {
    font-size: var(--font-size-1);
    font-weight: 700;
    cursor: pointer;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    list-style: none;
  }

  summary::-webkit-details-marker { display: none; }
  summary::before { content: '+ '; }
  details[open] summary::before { content: '− '; }

  .resend-form {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
    margin-top: var(--size-4);
  }

  .resend-form label {
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .resend-form input {
    padding: var(--size-2) var(--size-3);
    font-size: var(--font-size-2);
  }

  .error-banner.is-success {
    background: color-mix(in srgb, var(--color-mint) 40%, var(--color-surface));
    border-color: var(--color-border);
  }
</style>
