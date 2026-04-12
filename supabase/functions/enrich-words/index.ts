import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Keep this in sync with AI_LIMIT in src/lib/constants.ts
// Cannot import directly due to different runtimes (Deno vs Node/Browser)
const AI_DAILY_LIMIT = 10

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { phrases, language }: { phrases: string[]; language: string } = await req.json()

  if (!phrases || phrases.length === 0) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Initialize Supabase client with the user's JWT to use RPC
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })

  // 1. Increment and check usage count
  const { data: usageCount, error: usageError } = await supabase.rpc('increment_ai_usage')
  
  if (usageError) {
    return new Response(JSON.stringify({ error: `Usage check failed: ${usageError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (usageCount > AI_DAILY_LIMIT) {
    return new Response(JSON.stringify({ error: `Daily AI limit reached (${AI_DAILY_LIMIT} calls). Try again tomorrow.` }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Use a faster, cheaper model for simple translation tasks
  const model = Deno.env.get('OPENROUTER_MODEL') ?? 'google/gemma-3-27b-it:free'

  const prompt = `You are a dictionary API for a language learning app.
The target language is "${language}" (e.g., if "zh", assume Mandarin Chinese).
I will provide a JSON array of words or phrases. Each item may be:
- Chinese characters (e.g. "你好")
- English words or phrases (e.g. "good morning")
- Numbered pinyin (e.g. "yi2 ge4 ren2")

You must return a JSON array of objects with the exact following structure for each item:
{
  "word": "The original phrase provided",
  "character": "The Chinese characters — identical to word if input is Chinese; the Chinese equivalent if input is English or numbered pinyin",
  "pinyin": "Diacritic pinyin for the character field using correct spacing",
  "translation": "A concise, natural English translation",
  "example": "A short, natural example sentence in the target language using this word",
  "example_phonetic": "Phonetic annotation for the example sentence, matching character-for-character",
  "example_translation": "English translation of the example sentence"
}

IMPORTANT:
- The "pinyin" field MUST provide a phonetic value for EVERY character in the "character" field in the exact same order.
- Do NOT auto-correct the "character" field; if the input is Chinese, keep it exactly as provided.
- Return plain text only — NO HTML tags, NO markdown, NO bold/italic markup in any field value.

Return ONLY the JSON array, no markdown formatting (\`\`\`json etc.), no explanations.

Input phrases:
${JSON.stringify(phrases)}`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://inkido.app',
      'X-Title': 'InkiDo'
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    return new Response(JSON.stringify({ error: `OpenRouter error: ${errText}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content
  if (!raw) {
    return new Response(JSON.stringify({ error: 'No content returned from LLM' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const results = JSON.parse(cleaned)
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: `Failed to parse LLM response: ${msg}`, raw }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

if (import.meta.main) {
  Deno.serve(handler)
}
