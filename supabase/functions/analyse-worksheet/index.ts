import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Keep this in sync with AI_LIMIT in src/lib/constants.ts
const AI_DAILY_LIMIT = 20

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

  const { base64Image, language }: { base64Image: string; language: string } = await req.json()

  if (!base64Image) {
    return new Response(JSON.stringify({ error: 'Missing base64Image' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })

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

  const model = Deno.env.get('OPENROUTER_MODEL') ?? 'google/gemma-3-27b-it:free'

  const prompt = `You are helping a parent understand their child's homework worksheet written in "${language}".

1. Identify the worksheet type: "translation", "circle-words", "fill-in-blank", or "mixed".
2. Write a single plain-English sentence summarising what the child is being asked to do.
3. For each question or task, extract the original text, translate the instruction into English, and provide a sample answer in both the original language and English.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "summary": "One sentence describing what the worksheet asks the child to do.",
  "worksheetType": "translation|circle-words|fill-in-blank|mixed",
  "questions": [
    {
      "original": "Original text of the question/task as it appears on the worksheet",
      "translation": "English translation of the question or instruction",
      "sampleAnswer": {
        "chinese": "Sample answer in the original language",
        "english": "Sample answer in English"
      }
    }
  ]
}`

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
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64Image } }
        ]
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
    const { summary, worksheetType, questions } = JSON.parse(cleaned)
    return new Response(JSON.stringify({ summary, analysis: { worksheetType, questions } }), {
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
