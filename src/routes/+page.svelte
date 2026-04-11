<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { onMount } from 'svelte'

  let loggedIn = $state(false)

  function inview(node: HTMLElement) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }

  onMount(async () => {
    const { data } = await supabase.auth.getSession()
    loggedIn = !!data.session
  })
</script>

<svelte:head>
  <title>Inkido — Mandarin Chinese spelling practice</title>
</svelte:head>

<div class="landing">

  <!-- ── 1. Hero ─────────────────────────────────────────── -->
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-text">
        <h1 class="wordmark">Inkido</h1>
        <p class="tagline">Chinese homework, made manageable.</p>
        <p class="sub-line">Point your camera at a worksheet. Get translations, audio, and practice tools — free.</p>
        {#if loggedIn}
          <a href="/profiles" class="cta cta-primary">Go to app →</a>
        {:else}
          <div class="cta-group">
            <a href="/auth/signup" class="cta cta-primary">Get started — free</a>
            <a href="/auth/login" class="cta cta-secondary">Log in</a>
          </div>
        {/if}
      </div>
      <div class="hero-char-box" aria-hidden="true">
        <span class="hero-char">墨</span>
      </div>
    </div>
  </section>

  <!-- ── 2. Services band ───────────────────────────────── -->
  <section class="services">
    <div class="services-inner">
      <h2 class="services-heading">One app.<br/>Everything you need.</h2>
      <div class="services-tags">
        <span class="tag">Photo scanning</span>
        <span class="tag">145k-entry dictionary</span>
        <span class="tag">AI enrichment</span>
        <span class="tag">Text-to-speech audio</span>
        <span class="tag">Stroke practice</span>
        <span class="tag">Tone training</span>
      </div>
    </div>
  </section>

  <!-- ── 3. Journey steps ──────────────────────────────── -->
  <section class="steps">

    <div class="step step-mint">
      <div class="step-inner" {@attach inview}>
        <div class="step-visual">
          <span class="step-number">01</span>
          <span class="step-char" aria-hidden="true">拍</span>
        </div>
        <div class="step-body">
          <h2 class="step-heading">PHOTOGRAPH THE WORKSHEET</h2>
          <p class="step-text">Point your camera at any Chinese homework sheet. Inkido reads the characters and builds a word list — no typing required.</p>
        </div>
      </div>
    </div>

    <div class="step step-sky step-reverse">
      <div class="step-inner" {@attach inview}>
        <div class="step-visual">
          <span class="step-number">02</span>
          <span class="step-char" aria-hidden="true">丰</span>
        </div>
        <div class="step-body">
          <h2 class="step-heading">PINYIN, TRANSLATIONS, AUDIO</h2>
          <p class="step-text">Every word is looked up across a 145,000-entry dictionary. Pinyin, tone marks, English translation, and native-speed audio — all populated automatically.</p>
        </div>
      </div>
    </div>

    <div class="step step-lavender">
      <div class="step-inner" {@attach inview}>
        <div class="step-visual">
          <span class="step-number">03</span>
          <span class="step-char" aria-hidden="true">写</span>
        </div>
        <div class="step-body">
          <h2 class="step-heading">PRACTICE UNTIL IT STICKS</h2>
          <p class="step-text">Flashcard spelling with stroke-by-stroke character animation. Tone listening with instant feedback. Progress tracked separately per learner.</p>
        </div>
      </div>
    </div>

    <div class="step step-rose step-reverse">
      <div class="step-inner" {@attach inview}>
        <div class="step-visual">
          <span class="step-number">04</span>
          <span class="step-char" aria-hidden="true">解</span>
        </div>
        <div class="step-body">
          <h2 class="step-heading">UNDERSTAND EVERY CHARACTER</h2>
          <p class="step-text">Tap any character to see its meaning, stroke count, and the components it is built from — right down to the radicals.</p>
        </div>
      </div>
    </div>

  </section>

  <!-- ── 4. Bottom CTA ─────────────────────────────────── -->
  <section class="bottom-cta">
    <div class="bottom-cta-inner">
      <h2 class="bottom-heading">Ready to try it?</h2>
      <p class="bottom-sub">Free, no account required to explore. Works on any device.</p>
      {#if loggedIn}
        <a href="/profiles" class="cta cta-inverted">Go to app →</a>
      {:else}
        <div class="cta-group">
          <a href="/auth/signup" class="cta cta-inverted">Get started — free</a>
          <a href="/auth/login" class="cta cta-inverted-secondary">Log in</a>
        </div>
      {/if}
    </div>
  </section>

</div>

<style>
  /* ── Full-bleed escape ──────────────────────────────── */
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
    margin: 0 0 var(--size-2);
    max-width: 26ch;
    line-height: 1.3;
  }

  .sub-line {
    font-size: var(--font-size-2);
    color: var(--color-text);
    opacity: 0.75;
    margin: 0 0 var(--size-7);
    max-width: 44ch;
    line-height: 1.6;
  }

  .hero-char-box {
    flex-shrink: 0;
    border: var(--border);
    box-shadow: var(--shadow);
    background: var(--color-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--size-6);
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
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .cta:hover {
    transform: translate(-3px, -3px);
    box-shadow: 8px 8px 0 var(--color-border);
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

  .cta-inverted {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-surface);
  }

  .cta-inverted-secondary {
    background: transparent;
    color: var(--color-accent-fg);
    border-color: var(--color-accent-fg);
  }

  /* ── Services band ──────────────────────────────────── */
  .services {
    background: var(--color-accent);
    border-top: var(--border);
    border-bottom: var(--border);
    padding: var(--size-10) var(--size-6);
  }

  .services-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--size-6);
  }

  .services-heading {
    font-family: var(--font-display);
    font-size: clamp(var(--font-size-6), 5vw, var(--font-size-8));
    font-weight: 800;
    line-height: 1.05;
    margin: 0;
    color: var(--color-accent-fg);
  }

  .services-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
  }

  .tag {
    border: 2px solid var(--color-accent-fg);
    color: var(--color-accent-fg);
    padding: var(--size-2) var(--size-4);
    font-size: var(--font-size-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── Steps ──────────────────────────────────────────── */
  .steps {
    display: flex;
    flex-direction: column;
  }

  .step {
    border-bottom: var(--border);
    padding: 0 var(--size-6);
  }

  .step:last-child {
    border-bottom: none;
  }

  .step-mint     { background: var(--color-mint); }
  .step-sky      { background: var(--color-sky); }
  .step-lavender { background: var(--color-lavender); }
  .step-rose     { background: var(--color-rose); }

  .step-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: stretch;
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.55s ease, transform 0.55s ease;
  }

  :global(.step-inner.is-visible) {
    opacity: 1;
    transform: translateY(0);
  }

  .step-reverse .step-inner {
    flex-direction: row-reverse;
  }

  .step-visual {
    flex-shrink: 0;
    width: clamp(200px, 20vw, 240px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: var(--size-8) var(--size-6) var(--size-8) 0;
    border-right: var(--border);
    gap: var(--size-2);
  }

  .step-reverse .step-inner .step-visual {
    align-items: flex-end;
    padding: var(--size-8) 0 var(--size-8) var(--size-6);
    border-right: none;
    border-left: var(--border);
  }

  .step-number {
    font-family: var(--font-display);
    font-size: var(--font-size-8);
    font-weight: 800;
    line-height: 1;
    color: var(--color-text-muted);
  }

  .step-char {
    font-family: var(--font-display);
    font-size: clamp(5rem, 9vw, 9rem);
    font-weight: 800;
    line-height: 1;
    color: var(--color-text);
  }

  .step-body {
    flex: 1;
    padding: var(--size-8);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .step-heading {
    font-family: var(--font-display);
    font-size: clamp(var(--font-size-5), 3.5vw, var(--font-size-7));
    font-weight: 800;
    text-transform: uppercase;
    line-height: 1.05;
    margin: 0 0 var(--size-3);
  }

  .step-text {
    font-size: var(--font-size-2);
    opacity: 0.75;
    max-width: 44ch;
    line-height: 1.6;
    margin: 0;
  }

  /* ── Bottom CTA ─────────────────────────────────────── */
  .bottom-cta {
    background: var(--color-accent);
    padding: var(--size-12) var(--size-6);
  }

  .bottom-cta-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--size-4);
  }

  .bottom-heading {
    font-family: var(--font-display);
    font-size: clamp(var(--font-size-6), 5vw, var(--font-size-8));
    font-weight: 800;
    line-height: 1;
    margin: 0;
    color: var(--color-accent-fg);
  }

  .bottom-sub {
    font-size: var(--font-size-2);
    color: var(--color-accent-fg);
    opacity: 0.8;
    margin: 0;
    line-height: 1.6;
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

    .step {
      padding: 0 var(--size-4);
    }

    .step-inner,
    .step-reverse .step-inner {
      flex-direction: column;
    }

    .step-visual,
    .step-reverse .step-inner .step-visual {
      width: 100%;
      flex-direction: row;
      align-items: center;
      padding: var(--size-5) 0;
      border-right: none;
      border-left: none;
      border-bottom: var(--border);
      gap: var(--size-4);
    }

    .step-body {
      padding: var(--size-5) 0;
    }

    .services {
      padding: var(--size-5) var(--size-4);
    }

    .bottom-cta {
      padding: var(--size-8) var(--size-4);
    }
  }
</style>
