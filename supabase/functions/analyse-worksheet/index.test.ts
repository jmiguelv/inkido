import { assertEquals } from 'jsr:@std/assert'
import { stub } from 'jsr:@std/testing/mock'
import { handler } from './index.ts'

const BASE_URL = 'http://localhost/analyse-worksheet'
const VALID_BODY = { base64Images: ['data:image/jpeg;base64,abc123'], language: 'zh' }
const AUTH_HEADER: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-jwt' }

const VALID_ANALYSIS = {
  summary: 'Translate each word into English.',
  worksheetType: 'translation',
  questions: [
    {
      original: '你好',
      translation: 'Say hello',
      sampleAnswer: { chinese: '你好', english: 'Hello' }
    }
  ]
}

function makeRequest(body = VALID_BODY, headers: Record<string, string> = AUTH_HEADER): Request {
  return new Request(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
}

/** Stubs fetch so Supabase RPC returns `usageCount` and OpenRouter returns `orBody`. */
function mockFetch(orBody: unknown, usageCount = 1): typeof globalThis.fetch {
  return (_input: unknown, _init?: RequestInit) => {
    const url = typeof _input === 'string' ? _input : (_input as Request).url
    if (url.includes('rpc/increment_ai_usage')) {
      // PostgREST returns the raw integer value
      return Promise.resolve(new Response(String(usageCount), { status: 200 }))
    }
    return Promise.resolve(new Response(JSON.stringify(orBody), { status: 200 }))
  }
}

const TEST_OPTS = { sanitizeOps: false, sanitizeResources: false }

// ---------------------------------------------------------------------------

Deno.test('OPTIONS preflight returns 200 ok with CORS headers', async () => {
  const res = await handler(new Request(BASE_URL, { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'ok')
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
})

Deno.test('missing Authorization header returns 401', async () => {
  const res = await handler(makeRequest(VALID_BODY, { 'Content-Type': 'application/json' }))
  assertEquals(res.status, 401)
  assertEquals((await res.json()).error, 'Missing Authorization header')
})

Deno.test('missing base64Image returns 400', TEST_OPTS, async () => {
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', mockFetch({ choices: [{ message: { content: JSON.stringify(VALID_ANALYSIS) } }] }))

  const res = await handler(makeRequest({ base64Images: [], language: 'zh' }))
  assertEquals(res.status, 400)
  assertEquals((await res.json()).error, 'Missing base64Images')
})

Deno.test('rate limit exceeded returns 429', TEST_OPTS, async () => {
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', mockFetch({}, 21))

  const res = await handler(makeRequest())
  assertEquals(res.status, 429)
  assertEquals((await res.json()).error.includes('Daily AI limit reached'), true)
})

Deno.test('missing OPENROUTER_API_KEY returns 500', TEST_OPTS, async () => {
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', mockFetch({}, 1))

  const res = await handler(makeRequest())
  assertEquals(res.status, 500)
  assertEquals((await res.json()).error, 'OPENROUTER_API_KEY not configured')
})

Deno.test('successful analysis returns summary and analysis object', TEST_OPTS, async () => {
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'OPENROUTER_API_KEY') return 'test-key'
    if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', mockFetch({
    choices: [{ message: { content: JSON.stringify(VALID_ANALYSIS) } }]
  }))

  const res = await handler(makeRequest())
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.summary, VALID_ANALYSIS.summary)
  assertEquals(body.analysis.worksheetType, 'translation')
  assertEquals(body.analysis.questions.length, 1)
  assertEquals(body.analysis.questions[0].original, '你好')
})

Deno.test('markdown fences are stripped before JSON parsing', TEST_OPTS, async () => {
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'OPENROUTER_API_KEY') return 'test-key'
    if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', mockFetch({
    choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(VALID_ANALYSIS)}\n\`\`\`` } }]
  }))

  const res = await handler(makeRequest())
  assertEquals(res.status, 200)
  assertEquals((await res.json()).summary, VALID_ANALYSIS.summary)
})

Deno.test('OpenRouter non-ok response propagates error', TEST_OPTS, async () => {
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'OPENROUTER_API_KEY') return 'test-key'
    if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', (_input: unknown, _init?: RequestInit) => {
    const url = typeof _input === 'string' ? _input : (_input as Request).url
    if (url.includes('rpc/increment_ai_usage')) {
      return Promise.resolve(new Response('1', { status: 200 }))
    }
    return Promise.resolve(new Response('rate limited', { status: 429 }))
  })

  const res = await handler(makeRequest())
  assertEquals(res.status, 500)
  assertEquals((await res.json()).error.startsWith('OpenRouter error:'), true)
})

Deno.test('defaults to llama vision model when OPENROUTER_VISION_MODEL unset', TEST_OPTS, async () => {
  let sentModel = ''
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'OPENROUTER_API_KEY') return 'test-key'
    if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', async (_input: unknown, init?: RequestInit) => {
    const url = typeof _input === 'string' ? _input : (_input as Request).url
    if (url.includes('rpc/increment_ai_usage')) return new Response('1', { status: 200 })
    sentModel = JSON.parse(init?.body as string).model
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(VALID_ANALYSIS) } }] }), { status: 200 })
  })

  await handler(makeRequest())
  assertEquals(sentModel, 'google/gemma-4-26b-a4b-it:free')
})

Deno.test('OPENROUTER_VISION_MODEL env var is forwarded to API', TEST_OPTS, async () => {
  let sentModel = ''
  using _env = stub(Deno.env, 'get', (key: string) => {
    if (key === 'OPENROUTER_API_KEY') return 'test-key'
    if (key === 'OPENROUTER_VISION_MODEL') return 'anthropic/claude-3.5-haiku'
    if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
    return undefined
  })
  using _fetch = stub(globalThis, 'fetch', async (_input: unknown, init?: RequestInit) => {
    const url = typeof _input === 'string' ? _input : (_input as Request).url
    if (url.includes('rpc/increment_ai_usage')) {
      return new Response('1', { status: 200 })
    }
    sentModel = JSON.parse(init?.body as string).model
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(VALID_ANALYSIS) } }] }), { status: 200 })
  })

  await handler(makeRequest())
  assertEquals(sentModel, 'anthropic/claude-3.5-haiku')
})
