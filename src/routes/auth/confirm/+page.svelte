<div class="auth-page">
  <div class="auth-brand">InkiDo</div>
  <article class="auth-card">
    <h1>Check your email</h1>
    <p>We've sent a confirmation link to your email address. Click the link to activate your account.</p>
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
</style>
