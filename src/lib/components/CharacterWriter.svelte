<script lang="ts">
  let {
    char,
    language = 'zh',
    size = 200
  }: {
    char: string
    language?: string
    size?: number
  } = $props()

  let writerError = $state(false)

  function initWriter(node: HTMLDivElement) {
    let destroyed = false

    import('hanzi-writer').then(({ default: HanziWriter }) => {
      if (destroyed) return
      const writer = HanziWriter.create(node, char, {
        width: size,
        height: size,
        padding: Math.round(size * 0.05),
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        onLoadCharDataError: () => { if (!destroyed) writerError = true }
      })
      function loop() {
        if (!destroyed) writer.animateCharacter({ onComplete: loop })
      }
      loop()
    }).catch(() => { if (!destroyed) writerError = true })

    return {
      destroy() { destroyed = true }
    }
  }
</script>

{#if language !== 'zh' || writerError}
  <div
    class="fallback"
    style="width: {size}px; height: {size}px; font-size: calc({size}px * 0.6);"
    lang={language}
    aria-hidden="true"
  >{char}</div>
{:else}
  {#key char}
    <div
      use:initWriter
      class="writer-box"
      style="width: {size}px; height: {size}px;"
      aria-hidden="true"
    ></div>
  {/key}
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
