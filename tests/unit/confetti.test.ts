import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockConfetti = vi.fn()
vi.mock('canvas-confetti', () => ({ default: mockConfetti }))

const { fireConfetti } = await import('../../src/lib/confetti.ts')

describe('fireConfetti', () => {
  beforeEach(() => {
    mockConfetti.mockClear()
  })

  it('fireConfetti_called_invokesCanvasConfettiOnce', () => {
    fireConfetti()
    expect(mockConfetti).toHaveBeenCalledTimes(1)
  })

  it('fireConfetti_called_setsDisableForReducedMotion', () => {
    fireConfetti()
    expect(mockConfetti).toHaveBeenCalledWith(
      expect.objectContaining({ disableForReducedMotion: true })
    )
  })

  it('fireConfetti_called_includesNonEmptyColorPalette', () => {
    fireConfetti()
    const { colors } = mockConfetti.mock.calls[0][0] as { colors: string[] }
    expect(Array.isArray(colors)).toBe(true)
    expect(colors.length).toBeGreaterThan(0)
  })

  it('fireConfetti_calledTwice_firesTwice', () => {
    fireConfetti()
    fireConfetti()
    expect(mockConfetti).toHaveBeenCalledTimes(2)
  })
})
