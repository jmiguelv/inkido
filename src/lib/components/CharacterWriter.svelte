<script lang="ts">
  import { getCharData } from '$lib/dictionary'

  let {
    char,
    language = 'zh',
    size = 100,
    mode = 'animate',
    colorize = false,
    onComplete
  }: {
    char: string
    language?: string
    size?: number
    mode?: 'animate' | 'quiz'
    colorize?: boolean
    onComplete?: () => void
  } = $props()

  let writerError = $state(false)

  function initWriter(node: HTMLDivElement) {
    let destroyed = false
    let animating = false

    async function setup() {
      const { default: HanziWriter } = await import('hanzi-writer')
      if (destroyed) return

      const dataPromise = colorize ? getCharData(char) : Promise.resolve(null)

      const writer = HanziWriter.create(node, char, {
        width: size,
        height: size,
        padding: Math.round(size * 0.05),
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        onLoadCharDataError: () => { if (!destroyed) writerError = true },
        onLoadCharDataSuccess: async () => {
          if (destroyed || !colorize) return
          try {
            const data = await dataPromise
            if (data?.stroke_fragments && data.components && !destroyed) {
              for (let i = 0; i < data.components.length; i++) {
                const comp = data.components[i]
                const frags = data.stroke_fragments[i]
                if (!frags) continue

                let color = 'var(--color-text)'
                if (comp.type.includes('semantic') || comp.type.includes('radical')) {
                  color = '#2ecc71' // Mint-ish green
                } else if (comp.type.includes('phonetic')) {
                  color = '#3498db' // Sky blue
                }

                for (const strokeIdx of frags) {
                  // @ts-ignore - strokeNum is supported but missing from types
                  writer.updateColor('strokeColor', color, { strokeNum: strokeIdx })
                }
              }
            }
          } catch (e) {
            console.error("Colorize failed:", e)
          }
        }
      })

      function play() {
        if (destroyed || animating || mode === 'quiz') return
        animating = true
        writer.animateCharacter().then(() => { animating = false })
      }

      if (mode === 'quiz') {
        writer.quiz({
          onComplete: () => {
            if (!destroyed && onComplete) onComplete()
          }
        })
      } else {
        play()
        node.addEventListener('click', play)
      }
    }

    setup().catch(() => { if (!destroyed) writerError = true })

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
      role="button"
      tabindex="0"
      aria-label="Replay stroke order for {char}"
    ></div>
  {/key}
{/if}

<style>
  .writer-box {
    flex-shrink: 0;
    cursor: pointer;
    max-width: 100%;
    height: auto;
  }

  .fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    border: var(--border);
    background: var(--color-bg);
    line-height: 1;
    flex-shrink: 0;
    max-width: 100%;
  }
</style>
