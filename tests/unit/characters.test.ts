import { describe, it, expect } from 'vitest'
import { splitCharacters, stripDiacritics, getTone } from '../../src/lib/characters'

describe('splitCharacters', () => {
  it('splitCharacters_singleChar_returnsOneElement', () => {
    expect(splitCharacters('学')).toEqual(['学'])
  })

  it('splitCharacters_multiChar_returnsEachCharacter', () => {
    expect(splitCharacters('学习')).toEqual(['学', '习'])
  })

  it('splitCharacters_emptyString_returnsEmptyArray', () => {
    expect(splitCharacters('')).toEqual([])
  })

  it('splitCharacters_repeatedChar_returnsDuplicates', () => {
    expect(splitCharacters('奶奶')).toEqual(['奶', '奶'])
  })

  it('splitCharacters_surrogatePair_treatsAsOneCharacter', () => {
    // '𠀋' is a supplementary CJK character (U+2000B, two UTF-16 code units)
    expect(splitCharacters('𠀋')).toEqual(['𠀋'])
  })
})

describe('stripDiacritics', () => {
  it('strips all four Mandarin tones', () => {
    expect(stripDiacritics('mā má mǎ mà')).toBe('ma ma ma ma')
  })

  it('handles lowercase conversion', () => {
    expect(stripDiacritics('Kāi')).toBe('kai')
  })

  it('handles ü (umlaut)', () => {
    // nǚ should become nu
    expect(stripDiacritics('nǚ')).toBe('nu')
  })

  it('handles regular text without diacritics', () => {
    expect(stripDiacritics('hello')).toBe('hello')
  })

  it('strips other common diacritics', () => {
    expect(stripDiacritics('é à î ö')).toBe('e a i o')
  })
})

describe('getTone', () => {
  it('identifies tone 1', () => {
    expect(getTone('mā')).toBe(1)
    expect(getTone('kāi')).toBe(1)
    expect(getTone('lǖ')).toBe(1)
  })

  it('identifies tone 2', () => {
    expect(getTone('má')).toBe(2)
    expect(getTone('lái')).toBe(2)
    expect(getTone('lǘ')).toBe(2)
  })

  it('identifies tone 3', () => {
    expect(getTone('mǎ')).toBe(3)
    expect(getTone('hǎo')).toBe(3)
    expect(getTone('lǚ')).toBe(3)
  })

  it('identifies tone 4', () => {
    expect(getTone('mà')).toBe(4)
    expect(getTone('qù')).toBe(4)
    expect(getTone('lǜ')).toBe(4)
  })

  it('identifies neutral tone', () => {
    expect(getTone('ma')).toBe(5)
    expect(getTone('de')).toBe(5)
    expect(getTone(null)).toBe(5)
    expect(getTone(undefined)).toBe(5)
  })

  it('is case-insensitive', () => {
    expect(getTone('MĀ')).toBe(1)
    expect(getTone('HǍO')).toBe(3)
  })
})
