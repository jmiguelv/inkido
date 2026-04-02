const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { words, language }: { words: string[]; language: string } = await req.json()

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const prompt = buildPrompt(words, language)

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

  const enriched = JSON.parse(raw)

  return new Response(JSON.stringify({ enriched }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

function buildPrompt(words: string[], language: string): string {
  const langInstructions = language === 'zh'
    ? `For each word:
- phonetic_annotation: pinyin with tone marks, space between every character (e.g. "nǐ hǎo")
- character_note: for single characters only, the primary radical with its English meaning (e.g. "氵water radical"); for multi-character words, set to empty string`
    : `For each word, provide appropriate phonetic annotation for the language "${language}". Set character_note to empty string.`

  return `You are a language education assistant. Enrich the following ${language} words for a children's spelling practice app.

Return a JSON array with exactly ${words.length} objects in the same order as the input, each with these fields:
- character: the original word (copy exactly from input)
- phonetic_annotation: string
- translation: English translation (concise, child-friendly)
- example: a simple example sentence using the word; wrap the target word with <strong> tags; keep it short and child-appropriate
- example_phonetic: phonetic annotation for the full example sentence
- example_translation: English translation of the example sentence
- character_note: string (see instructions below)

${langInstructions}

Input words: ${JSON.stringify(words)}

Return only the JSON array, no markdown, no wrapper object.`
}
