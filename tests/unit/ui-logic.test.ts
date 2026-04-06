import { describe, it, expect } from 'vitest'

/** 
 * Re-implementing the mapping logic from /spellings/[id] to test it.
 * In a real refactor, this logic would move to a shared utility file.
 */
function getStrokeClass(avgStrokes: number): string {
  if (avgStrokes === 0) return 'stroke-lemon'
  if (avgStrokes <= 7)  return 'stroke-mint'
  if (avgStrokes <= 11) return 'stroke-sky'
  if (avgStrokes <= 16) return 'stroke-lavender'
  return 'stroke-rose'
}

describe('UI Logic: Stroke Complexity Mapping', () => {
  it('assigns mint for simple characters (<= 7)', () => {
    expect(getStrokeClass(1)).toBe('stroke-mint')
    expect(getStrokeClass(7)).toBe('stroke-mint')
  })

  it('assigns sky for medium-low complexity (8-11)', () => {
    expect(getStrokeClass(8)).toBe('stroke-sky')
    expect(getStrokeClass(11)).toBe('stroke-sky')
  })

  it('assigns lavender for medium-high complexity (12-16)', () => {
    expect(getStrokeClass(12)).toBe('stroke-lavender')
    expect(getStrokeClass(16)).toBe('stroke-lavender')
  })

  it('assigns rose for high complexity (> 16)', () => {
    expect(getStrokeClass(17)).toBe('stroke-rose')
    expect(getStrokeClass(30)).toBe('stroke-rose')
  })

  it('assigns lemon for unknown complexity (0)', () => {
    expect(getStrokeClass(0)).toBe('stroke-lemon')
  })
})
