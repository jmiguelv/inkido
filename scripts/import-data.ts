/**
 * Import Chinese dictionary data into Supabase.
 * Safe to run multiple times — uses upsert so changed rows are updated.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-data.ts
 *
 * Or set SUPABASE_URL in the script and pass only SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://qxwhisbhgluxglopdwat.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY env var is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BATCH_SIZE = 1000
const LOG_INTERVAL = 10_000

async function upsertBatch(table: string, rows: object[]): Promise<void> {
  const { error } = await supabase.from(table).upsert(rows)
  if (error) throw new Error(`Upsert error on ${table}: ${error.message}`)
}

function normalizePinyin(pinyin: string): string {
  // Replace zero-width spaces (U+200B) with regular spaces
  return pinyin.replace(/\u200b/g, ' ').trim()
}

async function importWords(): Promise<void> {
  const filePath = resolve(ROOT, 'data/0_external/dictionary_word_2025-12-27.jsonl')
  console.log('Importing zh_words from', filePath)

  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })

  let batch: object[] = []
  let total = 0

  for await (const line of rl) {
    if (!line.trim()) continue
    const entry = JSON.parse(line)

    const cedicItem = entry.items?.find((i: { source: string }) => i.source === 'cedict')
    const firstItem = entry.items?.[0]
    const rawPinyin = cedicItem?.pinyin ?? firstItem?.pinyin ?? null
    const pinyin = rawPinyin ? normalizePinyin(rawPinyin) : null

    batch.push({
      word: entry.simp,
      pinyin,
      translation: entry.gloss ?? null,
      hsk_level: entry.statistics?.hskLevel ?? null
    })

    if (batch.length >= BATCH_SIZE) {
      await upsertBatch('zh_words', batch)
      total += batch.length
      batch = []
      if (total % LOG_INTERVAL === 0) console.log(`  zh_words: ${total} rows`)
    }
  }

  if (batch.length > 0) {
    await upsertBatch('zh_words', batch)
    total += batch.length
  }

  console.log(`  zh_words done: ${total} rows`)
}

async function importChars(): Promise<void> {
  const filePath = resolve(ROOT, 'data/0_external/dictionary_char_2025-12-27.jsonl')
  console.log('Importing zh_chars from', filePath)

  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })

  let batch: object[] = []
  let total = 0

  for await (const line of rl) {
    if (!line.trim()) continue
    const entry = JSON.parse(line)

    batch.push({
      char: entry.char,
      gloss: entry.gloss ?? null,
      stroke_count: entry.strokeCount ?? null
    })

    if (batch.length >= BATCH_SIZE) {
      await upsertBatch('zh_chars', batch)
      total += batch.length
      batch = []
      if (total % LOG_INTERVAL === 0) console.log(`  zh_chars: ${total} rows`)
    }
  }

  if (batch.length > 0) {
    await upsertBatch('zh_chars', batch)
    total += batch.length
  }

  console.log(`  zh_chars done: ${total} rows`)
}

await importWords()
await importChars()
console.log('Import complete.')
