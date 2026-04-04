<script lang="ts">
  import { onMount } from 'svelte'

  let {
    char,
    language = 'zh',
    size = 200
  }: {
    char: string
    language?: string
    size?: number
  } = $props()

  let el: HTMLDivElement
  let writerError = $state(false)

  onMount(() => {
    if (language !== 'zh') return
    import('hanzi-writer').then(({ default: HanziWriter }) => {
      HanziWriter.create(el, char, {
        width: size,
        height: size,
        padding: Math.round(size * 0.05),
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        onLoadCharDataError: () => { writerError = true }
      }).loopCharacter()
    }).catch(() => { writerError = true })
  })
</script>

{#if language !== 'zh' || writerError}
  <div
    class="fallback"
    style="width: {size}px; height: {size}px; font-size: calc({size}px * 0.6);"
    lang={language}
    aria-hidden="true"
  >{char}</div>
{:else}
  <div
    bind:this={el}
    class="writer-box"
    style="width: {size}px; height: {size}px;"
    aria-hidden="true"
  ></div>
{/if}

<style>
  .writer-box {
    flex-shrink: 0;
  }

  .fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    border: var(--border);
    background: var(--color-bg);
    line-height: 1;
    flex-shrink: 0;
  }
</style>
