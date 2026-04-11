import confetti from 'canvas-confetti'

// App palette colours
const COLORS = ['#ffd43b', '#a9e34b', '#74c0fc', '#f783ac', '#da77f2', '#ff8787', '#ffa94d']

export function fireConfetti(): void {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors: COLORS,
    disableForReducedMotion: true,
  })
}
