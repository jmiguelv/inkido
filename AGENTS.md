# Inkido — Agent Context

## What this is

Inkido is a children's **Mandarin Chinese spelling practice** web app. Parents create word
lists; children practise spelling them. Only `zh` (Mandarin Chinese) is supported — do not
add references to Japanese, Arabic, or other languages.

**Live at:** inkido.vercel.app  
**Version:** 0.6.4  
**Stack:** SvelteKit 2 + Svelte 5 runes + Supabase + TypeScript + pnpm

---

## Key commands

```sh
pnpm dev              # dev server (localhost:5173)
pnpm check            # svelte-check type checking — must pass before committing
pnpm test:unit        # Vitest unit tests — must pass before committing
pnpm test:e2e         # Playwright E2E tests
pnpm build            # production build
pnpm supabase db push # deploy pending migrations to remote DB
pnpm release          # bump version, update CHANGELOG, tag, push, GitHub release

# One-time / re-run when dictionary files change
SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/import-data.ts
```

---

## Project structure

```
src/
  app.html              # HTML shell — do NOT add <script> tags here
  app.css               # global styles (Open Props + custom palette)
  app.d.ts              # global type declarations incl. __APP_VERSION__
  lib/
    supabase.ts         # Supabase client
    types.ts            # shared TypeScript types (Word, WordList, Profile…)
    stores.svelte.ts    # Svelte 5 module-level $state stores (profiles, activeProfile)
    audio.ts            # speak() via Web Speech API
    characters.ts       # splitCharacters() utility
    components/
      CharacterWriter.svelte   # HanziWriter stroke animation (use: action API)
      CharacterModal.svelte    # character detail pop-up (uses CharacterWriter)
      CharacterDisplay.svelte  # ruby annotation display
  routes/
    +layout.svelte      # app shell: nav, auth guard, footer, Ko-fi button
    +layout.ts          # (minimal — no prerender/ssr flags)
    +page.svelte        # public landing page
    +error.svelte       # custom error page
    profiles/           # profile picker (auth-protected)
    auth/login|signup|callback/
    spellings/          # word lists index
    spellings/[id]/     # list detail + word management + photo scan
    spellings/[id]/practice/ # practice mode
    homework/           # OCR homework scans list
    homework/[id]/      # homework scan detail (question list)
    homework/[id]/question/[q_index]/ # individual question detail view
    words/              # all words across all lists (searchable)
    words/[id]/         # word detail with character breakdown
    dictionary/         # character/word search (145k words + 94k chars)
    settings/           # account settings
supabase/
  migrations/           # SQL migrations — always run `pnpm supabase db push` after changes
  functions/
    enrich-words/       # edge function: enrich word with pinyin/translation
    extract-from-image/ # edge function: OCR photo �� character list
data/
  0_external/           # dictionary source files (in source control)
    dictionary_char_2025-12-27.jsonl   # 94k characters
    dictionary_word_2025-12-27.jsonl   # 145k words
```

---

## Database (Supabase)

| Table | Purpose |
|---|---|
| `profiles` | Child learner profiles, owned by a parent (`auth.users`) |
| `word_lists` | Word lists, scoped to profile + language (`zh`) |
| `words` | Words in a list; denormalised enrichment (phonetic, translation) |
| `homework_scans` | OCR results and analysis for homework worksheets |
| `zh_words` | Dictionary: 145k Chinese words — `word`, `pinyin`, `translation`, `hsk_level` |
| `zh_chars` | Dictionary: 94k Chinese characters — `char`, `gloss`, `stroke_count`, `hint`, `components` (JSONB), `trad_variant` |

All user tables have Row Level Security. Dictionary tables are authenticated read-only.
Enrichment data in `words` is a point-in-time snapshot — deliberately denormalized.
Data sourced from [Chinese Character Wiki](https://www.dong-chinese.com/wiki/home).

Migrations live in `supabase/migrations/` — named `00N_description.sql`.
**Always run `pnpm supabase db push` after creating a migration.**

---

## Svelte 5 patterns used

- `$state`, `$derived`, `$effect`, `$props` — runes throughout (no legacy stores)
- `SvelteMap` from `svelte/reactivity` for reactive Maps
- `{#key expr}` blocks to force component remount
- Svelte **action API** (`use:fn`) for imperative DOM library integration (HanziWriter)
  — do NOT use `{@attach}` inside child components, it is unreliable

---

## Critical gotchas

### Imports
Never include `.ts` extension on `$lib` alias imports:
```ts
// ✅ correct
import { supabase } from '$lib/supabase'
import { getActiveProfile } from '$lib/stores.svelte'
// ❌ wrong — svelte-check will error
import { supabase } from '$lib/supabase.ts'
```

### adapter-vercel
`@sveltejs/adapter-vercel` must be in `dependencies`, not `devDependencies`.
Vercel skips devDependencies during build and the deploy will fail.

### __APP_VERSION__
Injected by Vite `define` in `vite.config.ts`. Declared as `const __APP_VERSION__: string`
inside `declare global` in `src/app.d.ts` — the declaration must be inside `declare global`,
not at module scope.

### Sticky footer
`display: flex; flex-direction: column; min-height: 100dvh` lives on `.page-shell` wrapper
div in `+layout.svelte` scoped CSS — NOT on `body` in `app.css`. Putting it on `body`
causes a layout jump when async content loads (Open Props normalize interaction).

### Third-party scripts
Never add `<script>` tags to `src/app.html`. Load dynamically in `onMount` inside
`+layout.svelte` instead.

### Supabase auth
Magic link redirect URL allowlist in Supabase dashboard must include a `/**` wildcard,
e.g. `https://inkido.vercel.app/**`.

### Public routes
`PUBLIC_ROUTES` array in `+layout.svelte` controls which paths skip auth redirect.
Currently: `["/", "/auth/login", "/auth/signup", "/auth/callback"]`.

---

## Branching & commit conventions

Branch format: `<type>/<short-description>` (kebab-case, ≤40 chars)  
Types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`

Commits: Conventional Commits — `<type>(<scope>): <description>`

Release process:
Run `pnpm release` — release-it prompts for a semver bump, updates `CHANGELOG.md`,
commits, tags, pushes, and creates a GitHub release automatically.
Requires a `GITHUB_TOKEN` env var with repo write access.

---

## Workflow rules

1. **After every Svelte component edit** — run the Svelte MCP autofixer until no issues remain, then `pnpm check`
2. **After every schema change** — create a migration and run `pnpm supabase db push`
3. **Before committing** — `pnpm test:unit` must pass
4. **After major changes** — update `README.md` in the same commit

---

## MCP tools

### Svelte MCP

Use for all Svelte/SvelteKit work:

- **`list-sections`** — discover available documentation sections; use first when starting any Svelte/SvelteKit topic
- **`get-documentation`** — fetch full docs for sections found via `list-sections`; fetch ALL relevant sections
- **`svelte-autofixer`** — analyze a component and return issues; **call after every component edit, keep calling until no issues**
- **`playground-link`** — generate a Svelte Playground link; only after explicit user confirmation, never when code is in project files

### Supabase MCP

Use `mcp__plugin_postgres-best-practices_supabase__search_docs` when:
- Designing or reviewing schema, RLS policies, or migrations
- Writing Supabase queries or edge functions
- Debugging Supabase-specific behaviour
