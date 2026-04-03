import { assertEquals } from 'jsr:@std/assert'
import { stub } from 'jsr:@std/testing/mock'
import { handler } from './index.ts'

const BASE_URL = 'http://localhost/extract-from-image'
const VALID_BODY = { base64Image: 'data:image/jpeg;base64,abc123', language: 'zh' }

function makeRequest(body = VALID_BODY): Request {
  return new Request(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function mockFetch(body: unknown, status = 200): typeof globalThis.fetch {
  return () => Promise.resolve(new Response(JSON.stringify(body), { status }))
}

// ---------------------------------------------------------------------------

Deno.test('OPTIONS preflight returns 200 ok with CORS headers', async () => {
  const res = await handler(new Request(BASE_URL, { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'ok')
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('missing OPENROUTER_API_KEY returns 500', async () => {
  using _env = stub(Deno.env, 'get', () => undefined)

  const res = await handler(makeRequest())
  assertEquals(res.status, 500)
  assertEquals((await res.json()).error, 'OPENROUTER_API_KEY not configured')
})

Deno.test('successful extraction returns characters array', async () => {
  using _env = stub(Deno.env, 'get', (key: string) =>
    key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined
  )
  using _fetch = stub(globalThis, 'fetch', mockFetch({
    choices: [{ message: { content: '["你好","学习","朋友"]' } }]
  }))

  const res = await handler(makeRequest())
  assertEquals(res.status, 200)
  assertEquals((await res.json()).characters, ['你好', '学习', '朋友'])
})

Deno.test('OpenRouter non-ok response propagates error', async () => {
  using _env = stub(Deno.env, 'get', (key: string) =>
    key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined
  )
  using _fetch = stub(globalThis, 'fetch', () =>
    Promise.resolve(new Response('rate limited', { status: 429 }))
  )

  const res = await handler(makeRequest())
  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error.startsWith('OpenRouter error:'), true)
})

Deno.test('empty choices returns 500', async () => {
  using _env = stub(Deno.env, 'get', (key: string) =>
    key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined
  )
  using _fetch = stub(globalThis, 'fetch', mockFetch({ choices: [] }))

  const res = await handler(makeRequest())
  assertEquals(res.status, 500)
  assertEquals((await res.json()).error, 'No content returned')
})

Deno.test('markdown fences are stripped before JSON parsing', async () => {
  using _env = stub(Deno.env, 'get', (key: string) =>
    key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined
  )
  using _fetch = stub(globalThis, 'fetch', mockFetch({
    choices: [{ message: { content: '```json\n["你好","学习"]\n```' } }]
  }))

  const res = await handler(makeRequest())
  assertEquals(res.status, 200)
  assertEquals((await res.json()).characters, ['你好', '学习'])
})

Deno.test('OPENROUTER_MODEL env var is forwarded to API', async () => {
  let sentBody: { model?: string } = {}
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'OPENROUTER_API_KEY') return 'test-key'
    if (key === 'OPENROUTER_MODEL') return 'anthropic/claude-3.5-haiku'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', async (_input: unknown, init?: RequestInit) => {
    sentBody = JSON.parse(init?.body as string)
    return new Response(JSON.stringify({
      choices: [{ message: { content: '["学习"]' } }]
    }), { status: 200 })
  })

  await handler(makeRequest())
  assertEquals(sentBody.model, 'anthropic/claude-3.5-haiku')
})

Deno.test('defaults to gemini free model when OPENROUTER_MODEL unset', async () => {
  let sentBody: { model?: string } = {}
  using _env = stub(Deno.env, 'get', (key: string) =>
    key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined
  )
  using _fetch = stub(globalThis, 'fetch', async (_input: unknown, init?: RequestInit) => {
    sentBody = JSON.parse(init?.body as string)
    return new Response(JSON.stringify({
      choices: [{ message: { content: '["学习"]' } }]
    }), { status: 200 })
  })

  await handler(makeRequest())
  assertEquals(sentBody.model, 'google/gemma-3-27b-it:free')
})
