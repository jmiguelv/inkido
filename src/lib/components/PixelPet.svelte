<script lang="ts">
  import { onMount } from 'svelte'
  import { getPetMood } from '$lib/stores.svelte'

  // Pixel art decoded from https://sqkhor.com/pixel-icons/panda (9×9 SVG)
  // W = #EBEAF7 (lavender-white)  B = #343341 (dark)  P = #ffb7c5 (blush, happy only)
  const SCALE = 6

  const COLORS: Record<string, string> = {
    W: '#EBEAF7',
    B: '#343341',
    P: '#ffb7c5',
  }

  // Idle — faithful to the original icon
  const IDLE_GRID = [
    '..B..B...',  // ears
    '..WWWWW..',  // head top
    '.WBWBWW..',  // eyes (col 2, 4 dark; col 1, 3, 5, 6 white)
    '.WWWWWW..',  // face / cheeks
    '...BBBB..',  // waist band
    '..BWWBW..',  // arms (col 2, 5 dark; cols 3, 4, 6 white)
    '...WWWW..',  // lower body
    '..BBWBB..',  // feet (dark at 2–3 and 5–6, white gap at 4)
    '.........',  // padding row
  ]

  // Happy — blush cheeks (P), smile corners (B at row 3)
  const HAPPY_GRID = [
    '..B..B...',
    '..WWWWW..',
    '.PBWBWP..',  // P blush at cols 1, 6
    '.WWBWBW..',  // smile corners at cols 3, 5
    '...BBBB..',
    '..BWWBW..',
    '...WWWW..',
    '..BBWBB..',
    '.........',
  ]

  const COLS = 9
  const ROWS = 9
  const W = COLS * SCALE  // 54px
  const H = ROWS * SCALE  // 54px

  function buildShadow(grid: string[]): string {
    const parts: string[] = []
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const color = COLORS[grid[r][c]]
        if (!color) continue
        parts.push(`${c * SCALE}px ${r * SCALE}px 0 0 ${color}`)
      }
    }
    return parts.join(',')
  }

  const mood = $derived(getPetMood())
  const shadow = $derived(buildShadow(mood === 'happy' ? HAPPY_GRID : IDLE_GRID))

  let posX = $state(0)
  let posY = $state(0)
  let targetX = 0
  let targetY = 0
  let visible = $state(false)
  let isMobile = $state(false)

  onMount(() => {
    isMobile = window.matchMedia('(pointer: coarse)').matches

    if (isMobile) {
      visible = true
      return
    }

    let rafId: number

    function lerp(a: number, b: number, t: number): number {
      return a + (b - a) * t
    }

    function tick() {
      posX = lerp(posX, targetX, 0.1)
      posY = lerp(posY, targetY, 0.1)
      rafId = requestAnimationFrame(tick)
    }

    function onMove(e: MouseEvent) {
      if (!visible) visible = true
      targetX = e.clientX + 14
      targetY = e.clientY - H + 10
    }

    window.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  })
</script>

{#if visible || isMobile}
  <div
    class="pet"
    class:mobile={isMobile}
    class:happy={mood === 'happy'}
    class:sad={mood === 'sad'}
    style={isMobile ? '' : `transform: translate(${Math.round(posX)}px,${Math.round(posY)}px)`}
    aria-hidden="true"
  >
    <div class="pixel-canvas" style="box-shadow: {shadow}"></div>
  </div>
{/if}

<style>
  .pet {
    position: fixed;
    top: 0;
    left: 0;
    width: 54px;
    height: 54px;
    pointer-events: none;
    z-index: 9998;
    will-change: transform;
    filter: drop-shadow(3px 3px 0 var(--color-border));
  }

  .pet.mobile {
    top: auto;
    bottom: 60px;
    left: auto;
    right: 16px;
  }

  /* Hide panda when any modal dialog is open — native <dialog> renders in the
     top layer above all z-index values, so we hide rather than compete. */
  :global(body:has(dialog[open])) .pet {
    visibility: hidden;
  }

  .pixel-canvas {
    width: 6px;
    height: 6px;
    background: transparent;
    animation: bob 2.4s ease-in-out infinite;
  }

  @keyframes bob {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-4px); }
  }

  .pet.happy .pixel-canvas {
    animation: bounce 0.65s ease-out;
  }

  @keyframes bounce {
    0%   { transform: translateY(0) rotate(0deg); }
    25%  { transform: translateY(-14px) rotate(-6deg); }
    55%  { transform: translateY(-10px) rotate(6deg); }
    75%  { transform: translateY(-16px) rotate(-4deg); }
    100% { transform: translateY(0) rotate(0deg); }
  }

  .pet.sad .pixel-canvas {
    animation: shake 0.55s ease-in-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-5px); }
    40%       { transform: translateX(5px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }
</style>
