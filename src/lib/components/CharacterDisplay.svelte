<script lang="ts">
  const { character, phonetic, language = 'zh' }: {
    character: string
    phonetic: string | null
    language?: string
  } = $props()
</script>

<span class="character-display" lang={language}>
  {#if phonetic}
    <ruby>
      {character}
      <rt>{phonetic}</rt>
    </ruby>
  {:else}
    {character}
  {/if}
</span>

<style>
  .character-display {
    display: inline-block;
  }

  ruby {
    ruby-align: center;
  }

  rt {
    font-size: 0.5em;
    color: var(--color-text-muted);
  }
</style>
