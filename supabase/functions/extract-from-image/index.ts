const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { base64Image, language }: { base64Image: string; language: string } = await req.json()

  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const model = Deno.env.get('OPENROUTER_MODEL') ?? 'google/gemma-3-27b-it:free'

  const prompt = `This is a children's spelling practice worksheet written in language "${language}".

Extract only the spelling practice items (individual words or characters the child is meant to practise writing).

Do NOT include:
- School names or student names
- Page numbers or dates
- Instructions or headings
- Arabic numerals unless they are part of a vocabulary sentence

Return a JSON array of strings, one item per word/character. Example: ["你好", "学习", "朋友"]

Return only the JSON array, no markdown, no explanation.`

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
    return new Response(JSON.stringify({ error: 'No content returned' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const characters = JSON.parse(cleaned)

  return new Response(JSON.stringify({ characters }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

if (import.meta.main) {
  Deno.serve(handler)
}
