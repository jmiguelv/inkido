# Inkido Architecture

## Overview

Inkido is a Mandarin Chinese spelling practice app built on SvelteKit with Supabase backend. This document covers the core architecture and key implementation details.

## System Architecture

### Frontend (SvelteKit + Svelte 5)
- **Framework**: SvelteKit 2 with Svelte 5 (runes for reactivity)
- **Styling**: OpenProps design tokens + custom CSS
- **Type Safety**: TypeScript throughout
- **Deployment**: Vercel (`@sveltejs/adapter-vercel`)

### Backend
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth (passwordless magic link)
- **Edge Functions**: Deno-based serverless functions
- **AI Integration**: OpenRouter API for vision & language models

### Dictionary Data
- **Words**: ~145k entries (CC-CEDICT)
- **Characters**: ~94k entries (Unicode Unihan + CJK Wiki)
- **Handwriting**: Hanzi Writer stroke order animations

## Key Features & Implementation

### 1. Homework Worksheet Scanning

The homework feature allows parents to photograph worksheets for analysis.

#### Flow
```
User Upload (Mobile Camera)
    ↓
Client-Side Compression (1024px, JPEG 0.7)
    ↓
Base64 Encoding
    ↓
analyse-worksheet Edge Function
    ↓
OpenRouter Vision API
    ↓
OCR + Translation + Sample Answers
    ↓
Store in homework_scans table
```

#### Image Compression Strategy

**Problem**: Uncompressed images cause `WORKER_RESOURCE_LIMIT` errors on Supabase Edge Functions.

**Solution**: Compress ALL images before sending to the edge function.

**Implementation** (`src/routes/homework/+page.svelte`, lines 54-73):

```typescript
function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

**Compression Parameters**:
- **Max width**: 1024px (maintains aspect ratio)
- **JPEG quality**: 0.7 (70% compression)
- **Applied to**: ALL images before base64 encoding

**Payload Impact**:
- **Before**: 3 smartphone photos (~35 MB uncompressed)
- **After**: ~8-10 MB (75% reduction)
- **Result**: Well under Supabase limits (6 MB raw, 150 MB memory)

#### Edge Function: `analyse-worksheet`

**File**: `supabase/functions/analyse-worksheet/index.ts`

**Responsibilities**:
1. Accept array of base64 images + language + optional context
2. Check AI usage quota (10 calls/day per user)
3. Forward to OpenRouter vision API
4. Parse and validate JSON response
5. Return structured analysis (summary, title, type, questions)

**Key Code Path** (lines 75-120):
```typescript
// Accepts compressed images
const imageContents = base64Images.map((img: string) => ({ 
  type: 'image_url', 
  image_url: { url: img }
}))

// Sends to OpenRouter with vision model
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  body: JSON.stringify({
    model: process.env.OPENROUTER_VISION_MODEL ?? 'openrouter/free',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...imageContents
      ]
    }]
  })
})
```

**Response Format**:
```json
{
  "summary": "Read the passage and fill in the blanks.",
  "analysis": {
    "title": "Fill in the Blanks",
    "worksheetType": "fill-in-blank",
    "questions": [
      {
        "original": "Original Chinese text",
        "translation": "English translation",
        "sampleAnswer": {
          "chinese": "答案",
          "english": "Answer"
        }
      }
    ]
  }
}
```

### 2. Word Enrichment

**Edge Function**: `enrich-words` (`supabase/functions/enrich-words/index.ts`)

Enriches manually-entered words with pinyin, pronunciation, tone marks, and example sentences.

**Flow**:
```
User enters words (Chinese/English/pinyin)
    ↓
Local dictionary lookup (cached)
    ↓
LLM enrichment for examples & missing fields
    ↓
Update word_lists table with pinyin + translation
```

**AI Usage**: 1 call per unique word added (rate-limited to 10/day)

### 3. Spelling List OCR

**Edge Function**: `extract-from-image` (`supabase/functions/extract-from-image/index.ts`)

Extracts spelling practice words from a single worksheet image.

**Input**: One base64 image

**Output**: Array of extracted words/characters

**Note**: Only processes ONE image (safe from resource limits)

### 4. Dictionary Search

**Files**: 
- `src/lib/dictionary.ts` - Data fetching with caching
- `src/routes/dictionary/+page.svelte` - UI & search

**Features**:
- Search ~145k words + ~94k characters
- Unaccented pinyin matching (e.g., "kai" matches tones)
- Component decomposition display
- Tap characters to open detail modal

## Database Schema

### Core Tables

**profiles**
- `id`, `parent_id`, `name`, `language`, `created_at`
- Links children to parent accounts

**word_lists**
- `id`, `profile_id`, `name`, `language`, `sort_order`, `created_at`
- Belongs to a profile

**words**
- `id`, `list_id`, `character`, `phonetic_annotation`, `translation`, `example`, etc.
- Ordered by `sort_order` + `created_at`

**homework_scans**
- `id`, `profile_id`, `summary`, `context`, `thumbnail`, `analysis` (JSONB), `created_at`
- Stores OCR results with optional user context

**Dictionary Tables** (imported):
- `zh_words` (~145k rows) - Words with pinyin, translations
- `zh_chars` (~94k rows) - Characters with gloss, components, stroke count

### Indexes

**Foreign Keys** (for joins):
- `profiles.parent_id` (FK to profiles)
- `word_lists.profile_id` (FK to profiles)
- `words.list_id` (FK to word_lists)
- `homework_scans.profile_id` (FK to profiles)

**Performance**:
- GIN trigram indexes on `zh_words.translation` & `zh_chars.gloss` (for `ilike` search)
- FK indexes for fast joins

## Edge Function Model Selection

All vision edge functions use environment variables to select models:

| Function | Env Variable | Default | Purpose |
|---|---|---|---|
| `analyse-worksheet` | `OPENROUTER_VISION_MODEL` | `openrouter/free` | Worksheet OCR |
| `extract-from-image` | `OPENROUTER_MODEL` | `openrouter/free` | Word extraction |
| `enrich-words` | `OPENROUTER_MODEL` | `openrouter/free` | Word enrichment |

**Setting a custom model**:
```sh
pnpm supabase secrets set OPENROUTER_VISION_MODEL=anthropic/claude-3.5-haiku
```

Any OpenRouter model supporting vision can be used (free models available at [openrouter.ai/models](https://openrouter.ai/models)).

## API Rate Limiting

**AI Usage Quota**: 10 requests/day per user (configurable in `src/lib/constants.ts`)

**Tracked by**:
- Supabase RPC: `increment_ai_usage()`
- Each word enrichment = 1 call
- Each worksheet scan = 1 call

**Enforcement**: Edge functions check `ai_usage` count before processing.

## Security

### Authentication
- Passwordless magic link (Supabase Auth)
- Row-level security (RLS) policies on all tables
- Service role key required for admin operations

### Data Privacy
- No third-party analytics
- Homework scans stored securely in user's Supabase project
- User can request data deletion anytime

### AI Safety
- Prompts explicitly instruct models NOT to include personal/identifying data
- Only extracted content (words, translations) stored; raw images discarded after analysis
- Daily quota prevents abuse

## Deployment

### Environment Variables (Vercel)
```
PUBLIC_SUPABASE_URL=https://<project>.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
```

### Supabase Secrets
```
OPENROUTER_API_KEY=<your-key>
OPENROUTER_VISION_MODEL=openrouter/free (optional)
OPENROUTER_MODEL=openrouter/free (optional)
```

### CI/CD
- GitHub Actions on push (TypeScript check, unit tests)
- Vercel auto-deploys on main branch
- Manual Supabase function deploy: `pnpm supabase functions deploy --no-verify-jwt`

## Performance Considerations

### Image Compression
- **1024px max width** balances quality & file size
- **0.7 JPEG quality** maintains text legibility (OCR-safe)
- Reduces 3-image uploads from 35MB → 8-10MB

### Caching
- Dictionary data cached locally in `src/lib/dictionary.ts`
- Avoids repeated API calls for same words/characters

### Database
- FK indexes for fast joins
- GIN trigram indexes for full-text search
- Query limits on large result sets (e.g., 100 words max)

## Troubleshooting

### WORKER_RESOURCE_LIMIT Error
- **Cause**: Uncompressed image payload exceeds 6 MB
- **Solution**: Client-side compression already enabled (1024px, JPEG 0.7)
- **Check**: Verify `compressImage()` is applied in `handleScan()`

### LLM Returns Empty Response
- **Cause**: Model quota exceeded or API error
- **Check**: Verify `OPENROUTER_API_KEY` is set in Supabase secrets
- **Fallback**: Edge function defaults to `openrouter/free` (free tier)

### Dictionary Search is Slow
- **Cause**: First query runs before GIN indexes are warm
- **Solution**: Queries are cached locally; subsequent searches use cached data

---

**Last Updated**: July 2026  
**Version**: 0.6.7+
