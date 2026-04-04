<script lang="ts">
  import { page } from '$app/state'
</script>

<div class="error-page">
  <h1>{page.status}</h1>
  <p>{page.error?.message ?? 'Something went wrong.'}</p>
  <a href="/">Go home</a>
</div>

<style>
  .error-page {
    max-width: 480px;
    margin: var(--size-10) auto;
    padding: var(--size-8) var(--size-4);
    text-align: center;
  }

  h1 {
    font-size: var(--font-size-10);
    margin: 0 0 var(--size-3);
    line-height: 1;
  }

  p {
    font-size: var(--font-size-3);
    color: var(--color-text-muted);
    margin: 0 0 var(--size-6);
  }

  a {
    display: inline-block;
    padding: var(--size-2) var(--size-5);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: var(--border);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
  }

  a:hover {
    transform: translate(-2px, -2px);
    box-shadow: var(--shadow);
    text-decoration: none;
  }
</style>
