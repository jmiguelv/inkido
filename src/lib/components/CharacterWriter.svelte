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

  let el = $state<HTMLDivElement | undefined>()
  let writerError = $state(false)

  $effect(() => {
    if (!el || language !== 'zh') return

    const node = el
    const currentChar = char
    const currentSize = size
    let cancelled = false

    node.innerHTML = ''
    writerError = false

    import('hanzi-writer').then(({ default: HanziWriter }) => {
      if (cancelled || !node.isConnected) return
      HanziWriter.create(node, currentChar, {
        width: currentSize,
        height: currentSize,
        padding: Math.round(currentSize * 0.05),
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        onLoadCharDataError: () => {
          if (!cancelled) writerError = true
        }
      }).loopCharacter()
    }).catch(() => {
      if (!cancelled) writerError = true
    })

    return () => { cancelled = true }
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
