<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  let loggedIn = $state(false)

  onMount(async () => {
    const { data } = await supabase.auth.getSession()
    loggedIn = !!data.session
  })
</script>

<svelte:head>
  <title>Inkido — Mandarin Chinese spelling practice</title>
</svelte:head>

<div class="landing">
  <section class="hero">
    <h1 class="logo">Inkido</h1>
    <p class="tagline">Mandarin Chinese spelling practice</p>
    <p class="sub">Build vocabulary in Mandarin Chinese. Create word lists, practise spelling with stroke-by-stroke animation, and track progress across profiles.</p>
    {#if loggedIn}
      <a href="/lists" class="cta cta-primary">Go to app →</a>
    {:else}
      <div class="cta-group">
        <a href="/auth/signup" class="cta cta-primary">Sign up free</a>
        <a href="/auth/login" class="cta cta-secondary">Log in</a>
      </div>
    {/if}
  </section>

  <section class="features">
    <div class="feature-card">
      <span class="feature-icon">列</span>
      <h2>Word lists</h2>
      <p>Organise vocabulary into lists per topic or week. Colour-coded by stroke complexity so you can see difficulty at a glance.</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon">練</span>
      <h2>Practice mode</h2>
      <p>Flashcard-style practice with stroke-by-stroke animation. Keyboard and touch friendly.</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon">掃</span>
      <h2>Photo scan</h2>
      <p>Photograph a worksheet and the app extracts the characters automatically — no typing required.</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon">探</span>
      <h2>Character explorer</h2>
      <p>Search 94,000 Chinese characters by meaning, pinyin or stroke count. Tap any character for full detail.</p>
    </div>
  </section>
</div>

<style>
  .landing {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--size-8) var(--size-4);
  }

  .hero {
    text-align: center;
    padding: var(--size-10) 0 var(--size-10);
    border-bottom: var(--border);
    margin-bottom: var(--size-10);
  }

  .logo {
    font-family: var(--font-display);
    font-size: clamp(3.5rem, 12vw, 8rem);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1;
    margin: 0 0 var(--size-4);
  }

  .tagline {
    font-size: var(--font-size-5);
    font-weight: 700;
    margin: 0 0 var(--size-4);
  }

  .sub {
    max-width: 560px;
    margin: 0 auto var(--size-8);
    color: var(--color-text-muted);
    font-size: var(--font-size-2);
    line-height: 1.6;
  }

  .cta-group {
    display: flex;
    gap: var(--size-3);
    justify-content: center;
    flex-wrap: wrap;
  }

  .cta {
    display: inline-block;
    padding: var(--size-3) var(--size-6);
    font-size: var(--font-size-2);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    border: var(--border);
    box-shadow: var(--shadow);
    transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
  }

  .cta:hover {
    transform: translate(-3px, -3px);
    box-shadow: var(--shadow-lg);
    text-decoration: none;
  }

  .cta:active {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .cta-primary {
    background: var(--color-accent);
    color: var(--color-accent-fg);
  }

  .cta-secondary {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .features {
    display: grid;
    gap: var(--size-4);
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .feature-card {
    background: var(--color-surface);
    border: var(--border);
    padding: var(--size-6);
    box-shadow: var(--shadow-sm);
  }

  .feature-icon {
    display: block;
    font-size: var(--font-size-8);
    line-height: 1;
    margin-bottom: var(--size-3);
    color: var(--color-text-muted);
  }

  .feature-card h2 {
    font-size: var(--font-size-3);
    margin: 0 0 var(--size-2);
  }

  .feature-card p {
    font-size: var(--font-size-1);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.5;
  }
</style>
