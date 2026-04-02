import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { base64Image, language }: { base64Image: string; language: string } = await req.json()

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Strip data URL prefix to get raw base64
  const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
  const mimeMatch = base64Image.match(/^data:(image\/[a-z]+);base64,/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'

  const prompt = `This is a children's spelling practice worksheet written in language "${language}".

Extract only the spelling practice items (individual words or characters the child is meant to practise writing).

Do NOT include:
- School names or student names
- Page numbers or dates
- Instructions or headings
- Arabic numerals unless they are part of a vocabulary sentence

Return a JSON array of strings, one item per word/character. Example: ["你好", "学习", "朋友"]

Return only the JSON array, no markdown, no explanation.`

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  )

  if (!geminiRes.ok) {
    const errText = await geminiRes.text()
    return new Response(JSON.stringify({ error: `Gemini error: ${errText}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const geminiData = await geminiRes.json()
  const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) {
    return new Response(JSON.stringify({ error: 'Gemini returned no content' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const characters = JSON.parse(raw)

  return new Response(JSON.stringify({ characters }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
