# Inkido

A web app that helps children practise spelling tests for character-based scripts (Mandarin Chinese, Japanese, Arabic, and more).

## Tech Stack

- **Frontend**: SvelteKit 2 + Svelte 5 (runes) + TypeScript
- **Backend / Auth**: Supabase (Postgres + Auth + Edge Functions)
- **AI**: OpenRouter (photo scanning only, via Supabase Edge Functions — defaults to `google/gemma-3-27b-it:free`)
- **Dictionary**: CC-CEDICT / Unicode open-source data (~145k words, ~94k characters)
- **CSS**: OpenProps design tokens
- **Deployment**: Vercel (`@sveltejs/adapter-vercel`)

## Prerequisites

- [pnpm](https://pnpm.io) v10+
- [Docker](https://www.docker.com) (for local Supabase)
- A [Supabase](https://supabase.com) project
- An [OpenRouter API key](https://openrouter.ai/keys)

## Getting started

### 1. Install dependencies

```sh
pnpm install
```

### 2. Set environment variables

Copy `.env.example` to `.env` and fill in your values:

```sh
cp .env.example .env
```

```sh
# .env
PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

### 3. Apply the database migration

Link to your Supabase project and push the migration:

```sh
pnpm supabase login
pnpm supabase link --project-ref <your-project-ref>
pnpm supabase db push
```

### 4. Import dictionary data

Get your **service role key** from Supabase dashboard → Project Settings → API, then run:

```sh
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> npx tsx scripts/import-data.ts
```

The script reads `PUBLIC_SUPABASE_URL` from `.env.local` automatically. This populates the `zh_words` (~145k rows) and `zh_chars` (~94k rows) tables including stroke count, mnemonic hints, component decomposition, and traditional variants. Safe to re-run when the source data files change.

### 5. Set the OpenRouter API key as a Supabase secret

Required for photo scanning (worksheet OCR):

```sh
pnpm supabase secrets set OPENROUTER_API_KEY=<your-key>
```

Optionally override the default model (`google/gemma-3-27b-it:free`):

```sh
pnpm supabase secrets set OPENROUTER_MODEL=anthropic/claude-3.5-haiku
```

Any OpenRouter model that supports vision can be used. Free-tier models are available at [openrouter.ai/models](https://openrouter.ai/models?order=pricing-asc).

### 6. Deploy Edge Functions

```sh
pnpm supabase functions deploy extract-from-image
```

### 7. Start the dev server

```sh
pnpm dev
```

## Local Supabase (optional)

To run Supabase locally instead of against the remote project:

```sh
# Start local Supabase stack (requires Docker)
pnpm supabase start

# Apply migrations locally
pnpm supabase db reset

# Import dictionary data into local DB (override URL since .env.local points to remote)
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key> npx tsx scripts/import-data.ts

# Set secrets locally
pnpm supabase secrets set OPENROUTER_API_KEY=<your-key>

# Serve Edge Functions locally
pnpm supabase functions serve
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm test:unit` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `pnpm test` | Run all tests |
| `pnpm check` | Type-check with svelte-check |
| `pnpm supabase` | Run Supabase CLI commands |
| `npx tsx scripts/import-data.ts` | Import/refresh dictionary data into Supabase |

## Deployment (Vercel)

1. Connect the GitHub repo to a Vercel project.
2. Add the following environment variables in the Vercel dashboard:

| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/publishable key |

3. In Supabase dashboard → Authentication → URL Configuration:
   - **Site URL**: `https://<your-vercel-domain>`
   - **Additional Redirect URLs**: `https://<your-vercel-domain>/**`

## Auth configuration

This app uses **passwordless magic link** authentication via Supabase. In your Supabase dashboard:

1. **Authentication → Providers → Email**: enable "Email OTP / Magic Link"
2. **Authentication → URL Configuration**: set your site URL and add `/auth/callback` to the redirect allow list
