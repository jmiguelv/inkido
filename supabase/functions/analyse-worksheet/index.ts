import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Keep this in sync with AI_LIMIT in src/lib/constants.ts
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

  const body = await req.json()
  const { language, context } = body
  let base64Images: string[] = body.base64Images || []
  if (body.base64Image) {
    base64Images.push(body.base64Image)
  }

  if (base64Images.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing base64Images' }), {
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

  // Vision tasks need a model that reliably supports image inputs.
  // OPENROUTER_VISION_MODEL overrides; falls back to a free vision-capable model.
  const model = Deno.env.get('OPENROUTER_VISION_MODEL') ?? 'openrouter/free'

  let prompt = `You are helping a parent understand their child's homework worksheet written in "${language}". 
You may be provided with one or more images representing different pages or sections of the same homework assignment.`

  if (context) {
    prompt += `\n\nUSER PROVIDED CONTEXT: "${context}"`
  }

  prompt += `\n\n1. Identify the worksheet type: "translation", "circle-words", "fill-in-blank", or "mixed".
2. Write a single plain-English sentence summarising the task in the imperative — as a direct instruction (e.g. "Read the passage and fill in the blanks." not "The child is asked to read...").
3. Process ALL provided images. For each question or task across all images, extract the original text, translate the instruction into English using the imperative, and provide a sample answer in both the original language and English.

Do NOT wrap output in markdown code blocks. Return raw JSON only — no \`\`\`json, no \`\`\`.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "summary": "One sentence in the imperative describing what to do (e.g. 'Read the passage and answer the questions.').",
  "title": "A short 3-4 word title for this worksheet based on the task (e.g. 'Fill in the Blanks' or 'Translation Exercise').",
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

  const imageContents = base64Images.map((img: string) => ({ type: 'image_url', image_url: { url: img } }))

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
          ...imageContents
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
    const cleaned = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()
    const { summary, title, worksheetType, questions } = JSON.parse(cleaned)
    return new Response(JSON.stringify({ summary, analysis: { title, worksheetType, questions } }), {
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
