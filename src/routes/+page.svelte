<script lang="ts">
  import { supabase } from '$lib/supabase'
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
    <div class="hero-inner">
      <div class="hero-text">
        <h1 class="wordmark">Inkido</h1>
        <p class="tagline">Learn Mandarin characters, stroke by stroke</p>
        {#if loggedIn}
          <a href="/profiles" class="cta cta-primary">Go to app →</a>
        {:else}
          <div class="cta-group">
            <a href="/auth/signup" class="cta cta-primary">Get started — Free</a>
            <a href="/auth/login" class="cta cta-secondary">Log in</a>
          </div>
        {/if}
      </div>
      <div class="hero-char-box" aria-hidden="true">
        <span class="hero-char">墨</span>
      </div>
    </div>
  </section>

  <section class="features">
    <div class="feature-row feature-mint">
      <div class="feature-inner">
        <div class="feature-char" aria-hidden="true">写</div>
        <div class="feature-body">
          <h2>Write to learn</h2>
          <p>Flashcard-style practice with stroke-by-stroke animation. Practise each character until the strokes are second nature.</p>
        </div>
      </div>
    </div>

    <div class="feature-row feature-sky">
      <div class="feature-inner feature-inner-reverse">
        <div class="feature-body">
          <h2>Train your ear</h2>
          <p>Listen to a character and identify its tone. Instant right/wrong feedback with a running score. Four tones, no guessing.</p>
        </div>
        <div class="feature-char" aria-hidden="true">音</div>
      </div>
    </div>

    <div class="feature-row feature-lavender">
      <div class="feature-inner">
        <div class="feature-char" aria-hidden="true">字</div>
        <div class="feature-body">
          <h2>94,000 characters</h2>
          <p>Search the full dictionary by meaning, pinyin, or stroke count. Photograph a worksheet and the characters are imported automatically.</p>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  /* Full-bleed: escape the constrained main container */
  .landing {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
    margin-top: calc(var(--size-6) * -1);
    margin-bottom: calc(var(--size-8) * -1);
  }

  /* ── Hero ───────────────────────────────────────────── */
  .hero {
    background: var(--color-lemon);
    border-bottom: var(--border);
    padding: var(--size-10) var(--size-6);
  }

  .hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-8);
  }

  .hero-text {
    flex: 1;
    min-width: 0;
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: clamp(3rem, 10vw, 7rem);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
    margin: 0 0 var(--size-3);
  }

  .tagline {
    font-size: clamp(var(--font-size-2), 2.5vw, var(--font-size-4));
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--size-7);
    max-width: 26ch;
    line-height: 1.3;
  }

  .hero-char-box {
    flex-shrink: 0;
    border: var(--border);
    box-shadow: var(--shadow-lg);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--size-6);
    gap: var(--size-2);
    width: clamp(130px, 18vw, 210px);
    aspect-ratio: 1;
  }

  .hero-char {
    font-family: var(--font-display);
    font-size: clamp(3.5rem, 10vw, 6.5rem);
    font-weight: 800;
    line-height: 1;
    color: var(--color-text);
    display: block;
  }

  /* ── CTAs ───────────────────────────────────────────── */
  .cta-group {
    display: flex;
    gap: var(--size-3);
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

  /* ── Feature rows ───────────────────────────────────── */
  .features {
    display: flex;
    flex-direction: column;
  }

  .feature-row {
    border-bottom: var(--border);
    padding: 0 var(--size-6);
  }

  .feature-row:last-child {
    border-bottom: none;
  }

  .feature-mint     { background: var(--color-mint); }
  .feature-sky      { background: var(--color-sky); }
  .feature-lavender { background: var(--color-lavender); }

  .feature-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: stretch;
  }

  .feature-inner-reverse {
    flex-direction: row-reverse;
  }

  .feature-char {
    flex-shrink: 0;
    width: clamp(100px, 16vw, 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: clamp(3.5rem, 9vw, 6rem);
    font-weight: 800;
    line-height: 1;
    color: var(--color-text);
    border-right: var(--border);
    padding: var(--size-8) 0;
  }

  .feature-inner-reverse .feature-char {
    border-right: none;
    border-left: var(--border);
  }

  .feature-body {
    flex: 1;
    padding: var(--size-8) var(--size-8);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .feature-body h2 {
    font-size: clamp(var(--font-size-5), 3.5vw, var(--font-size-7));
    font-weight: 800;
    margin: 0 0 var(--size-3);
    line-height: 1.05;
  }

  .feature-body p {
    font-size: var(--font-size-2);
    color: var(--color-text);
    max-width: 44ch;
    line-height: 1.6;
    margin: 0;
    opacity: 0.7;
  }

  /* ── Mobile ─────────────────────────────────────────── */
  @media (max-width: 600px) {
    .hero {
      padding: var(--size-7) var(--size-4);
    }

    .hero-inner {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--size-5);
    }

    .hero-char-box {
      width: 110px;
      align-self: flex-end;
    }

    .feature-row {
      padding: 0 var(--size-4);
    }

    .feature-inner,
    .feature-inner-reverse {
      flex-direction: column;
    }

    .feature-char {
      width: 100%;
      border-right: none;
      border-bottom: var(--border);
      padding: var(--size-5) 0;
      justify-content: flex-start;
      font-size: var(--font-size-8);
    }

    .feature-inner-reverse .feature-char {
      border-left: none;
      border-bottom: var(--border);
    }

    .feature-body {
      padding: var(--size-5) 0;
    }
  }
</style>
