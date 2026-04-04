<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import type { EmailOtpType } from '@supabase/supabase-js'

  let errorMsg = $state('')

  onMount(async () => {
    const tokenHash = page.url.searchParams.get('token_hash')
    const type = page.url.searchParams.get('type') as EmailOtpType | null

    if (tokenHash && type) {
      // PKCE flow — token delivered as query params
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) {
        errorMsg = error.message
        return
      }
      goto('/')
      return
    }

    // Implicit flow — Supabase JS automatically processes hash fragment tokens
    // on client init; give it one tick then check for an established session
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      errorMsg = error.message
      return
    }
    if (session) {
      goto('/')
      return
    }

    errorMsg = 'Invalid or missing confirmation link. Please try signing in again.'
  })
</script>

<div class="auth-page">
  <div class="auth-brand">InkiDo</div>
  <article class="auth-card">
    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
      <p><a href="/auth/login">Back to log in</a></p>
    {:else}
      <p aria-live="polite">Confirming your account…</p>
    {/if}
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
    box-shadow: var(--shadow);
    padding: var(--size-8);
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  .error {
    display: block;
    color: var(--color-danger);
    margin-bottom: var(--size-3);
  }
</style>
