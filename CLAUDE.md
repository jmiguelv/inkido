# Inkido — CLAUDE.md

## Project

Children's spelling practice app for character-based scripts (Mandarin Chinese, Japanese, etc.).
Parents create word lists, children practise spelling them. Built with SvelteKit 2 + Svelte 5 runes + Supabase.

## Key commands

```sh
pnpm dev              # dev server
pnpm test:unit        # Vitest unit tests (must pass before committing)
pnpm test:e2e         # Playwright E2E tests
pnpm check            # svelte-check type checking
pnpm supabase db push # deploy pending migrations to remote DB
pnpm release          # bump version, update CHANGELOG, tag, push, GitHub release

# One-time / re-run when dictionary files change
SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/import-data.ts
```

## Database

Migrations live in `supabase/migrations/` — named `00N_description.sql`.
**Always run `pnpm supabase db push` after creating a migration.**

### Schema summary

| Table | Purpose |
|---|---|
| `profiles` | Child learner profiles, owned by a parent (`auth.users`) |
| `word_lists` | Lists of words to practise, scoped to a profile + language (BCP 47) |
| `words` | Individual words in a list; stores denormalized enrichment (phonetic, translation) |
| `zh_words` | Dictionary: 145k Chinese words — `word`, `pinyin`, `translation`, `hsk_level` |
| `zh_chars` | Dictionary: 94k Chinese characters — `char`, `gloss`, `stroke_count`, `hint`, `components` (JSONB), `trad_variant` |

All user tables have RLS. Dictionary tables (`zh_words`, `zh_chars`) are authenticated read-only.
Enrichment data in `words` is a point-in-time snapshot — deliberately denormalized.

## Workflow rules

1. **After every Svelte component edit** — run the autofixer (see MCP tools below) until no issues remain.
2. **After every schema change** — create a migration and run `pnpm supabase db push`.
3. **After every major change** — update `README.md` in the same commit.
4. **Before committing** — `pnpm test:unit` must pass.

## Svelte MCP tools

This project uses the Svelte MCP server. Use these tools for all Svelte/SvelteKit work:

### 1. list-sections
Use FIRST to discover available documentation sections.
Always use when starting work on a Svelte or SvelteKit topic.

### 2. get-documentation
Fetch full docs for relevant sections found via `list-sections`.
After `list-sections`, fetch ALL sections relevant to the task.

### 3. svelte-autofixer
Analyzes a Svelte component and returns issues/suggestions.
**Must be called after every component edit. Keep calling until no issues are returned.**

### 4. playground-link
Generates a Svelte Playground link. Only call after explicit user confirmation, and never when code has been written to project files.

## Supabase MCP tools

Use the Supabase plugin (`mcp__plugin_postgres-best-practices_supabase__search_docs`) when:
- Designing or reviewing schema, RLS policies, or migrations
- Writing Supabase queries or edge functions
- Debugging Supabase-specific behaviour
