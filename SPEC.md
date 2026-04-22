# Inkido — Product Specification

> **NOTE:** This is the *initial* product specification used to bootstrap the project. It is preserved for historical context but may no longer reflect the current state of the codebase. For up-to-date documentation on the project's architecture, patterns, and current status, refer to `AGENTS.md` and `README.md`.

## Overview

**Inkido** (ink + dojo) is a web app that helps children practice spelling tests for character-based scripts — initially Mandarin Chinese, designed to expand to Japanese, Arabic, and others without schema changes.

Parents create an account, add child profiles, build word lists, and let children practise via AI-enriched flashcards. The AI automatically generates phonetic annotations, translations, and example sentences when words are saved. Worksheet photos can be scanned to extract words automatically.

**Audience**: Parents of primary-school-age children learning a character-based script.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Package manager | pnpm |
| Frontend framework | SvelteKit 2 + TypeScript (strict) |
| UI framework | Svelte 5 (runes API only — see Coding Standards) |
| CSS | OpenProps (design tokens) + hand-written component CSS |
| Backend / Auth | Supabase (Postgres + Auth + Edge Functions) |
| AI | Gemini 2.5 Flash, called from Supabase Edge Functions |
| Deployment | Vercel via `@sveltejs/adapter-static` |
| Unit tests | Vitest |
| E2E tests | Playwright |

### Key packages

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "open-props": "^2"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3",
    "@sveltejs/kit": "^2",
    "@playwright/test": "^1",
    "svelte": "^5",
    "typescript": "^5",
    "vite": "^7",
    "vitest": "^3"
  }
}
```

---

## Architecture

### Static SPA

The app is a fully static single-page application:

- `adapter-static` with `fallback: 'index.html'`
- Root `+layout.ts` exports `export const prerender = true` and `export const ssr = false`
- No `+page.server.ts` or `+layout.server.ts` files anywhere
- All data fetching is client-side using the authenticated user's JWT
- Supabase RLS enforces data access at the database level
- Deployed to Vercel as static files

### AI proxy via Supabase Edge Functions

The Gemini API key is an app-wide secret. It is never exposed to the client. AI calls follow this flow:

```
Client → supabase.functions.invoke('enrich-words', { body }) → Edge Function (validates JWT, calls Gemini) → response
```

The edge function rejects requests without a valid JWT.

### Auth flow

1. Parent signs up with email + password → Supabase sends confirmation email
2. Parent lands on `/auth/confirm` (holding page: "check your email")
3. Parent clicks email link → redirected to `/auth/callback` → session established → redirect to `/`
4. Password reset: `/auth/reset` form → Supabase sends reset email → same callback flow

---

## Environment Variables

```bash
# .env (client-visible, safe to expose)
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Supabase Edge Function secrets (set via Supabase CLI — never in .env)
# supabase secrets set GEMINI_API_KEY=...
GEMINI_API_KEY=
```

Vercel: add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables in the Vercel project dashboard.

---

## Database Schema

File: `supabase/migrations/001_initial_schema.sql`

```sql
-- Child profiles owned by a parent account
create table child_profiles (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  created_at  timestamptz default now()
);

-- Word lists belong to a child, scoped to a language
create table word_lists (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid references child_profiles(id) on delete cascade not null,
  name            text not null,
  language        text not null default 'zh',  -- BCP 47: 'zh', 'ja', 'ar', etc.
  last_practiced  timestamptz,
  created_at      timestamptz default now()
);

-- Individual words within a list
create table words (
  id                   uuid primary key default gen_random_uuid(),
  list_id              uuid references word_lists(id) on delete cascade not null,
  character            text not null,       -- the word/characters to practise
  phonetic_annotation  text,               -- pinyin for zh, furigana for ja, etc.
  translation          text,
  example              text,               -- example sentence (may contain <strong> tags)
  example_phonetic     text,               -- phonetic annotation for the example
  example_translation  text,
  character_note       text,               -- radical for zh, stroke info, etc.
  sort_order           integer default 0,
  created_at           timestamptz default now()
);

-- RLS: enable on all tables
alter table child_profiles enable row level security;
alter table word_lists     enable row level security;
alter table words          enable row level security;

-- child_profiles: parent owns their own children
create policy "parent_owns_child_profiles"
  on child_profiles for all
  using (parent_id = auth.uid());

-- word_lists: accessible only if the parent owns the child
create policy "parent_owns_word_lists"
  on word_lists for all
  using (
    exists (
      select 1 from child_profiles
      where child_profiles.id = word_lists.child_id
        and child_profiles.parent_id = auth.uid()
    )
  );

-- words: accessible only if the parent owns the list's child
create policy "parent_owns_words"
  on words for all
  using (
    exists (
      select 1 from word_lists
      join child_profiles on child_profiles.id = word_lists.child_id
      where word_lists.id = words.list_id
        and child_profiles.parent_id = auth.uid()
    )
  );
```

### User preferences

Stored in Supabase `auth.users.raw_user_meta_data` via `supabase.auth.updateUser({ data: { speechRate: 0.75 } })`. No separate table.

---

## Supabase Edge Functions

### `enrich-words`

**File**: `supabase/functions/enrich-words/index.ts`

**Request body**:
```ts
{
  words: string[],   // raw characters/text to enrich
  language: string   // BCP 47 language tag, e.g. 'zh'
}
```

**Response body**:
```ts
{
  enriched: Array<{
    character: string
    phonetic_annotation: string
    translation: string
    example: string              // may contain <strong> tags
    example_phonetic: string
    example_translation: string
    character_note: string
  }>
}
```

- Validates the caller's JWT via `Authorization: Bearer <token>` header. Return `401` if missing or invalid.
- Calls Gemini 2.5 Flash with `responseMimeType: "application/json"`.
- Returns `500` with `{ error: string }` on Gemini failure — do not swallow errors.
- Prompt must instruct Gemini to return a JSON array in the same order as the input `words` array.
- For `language: 'zh'`: phonetic_annotation = pinyin with tone marks, space between every character. character_note = primary radical with English meaning (single characters only).

### `extract-from-image`

**File**: `supabase/functions/extract-from-image/index.ts`

**Request body**:
```ts
{
  base64Image: string   // data URL: "data:image/jpeg;base64,..."
  language: string      // BCP 47 language tag
}
```

**Response body**:
```ts
{
  characters: string[]   // extracted words/characters, one per item
}
```

- Validates JWT. Returns `401` if invalid.
- Strips the data URL prefix before sending to Gemini.
- Instructs Gemini to extract only spelling practice items — ignore school names, student names, page numbers, instructions, Arabic numerals unless part of a sentence.
- Returns `500` with `{ error: string }` on failure.

---

## Account & Profile Model

- **Parent**: registers with email + password. Owns all data. The only entity with credentials.
- **Child profile**: a named profile under a parent account. No login, no password. Selected from the dashboard.
- **Active child**: stored in `sessionStorage` as a Svelte `$state` store. Cleared on logout, survives page refresh.
- A parent can have multiple children. A child can have multiple word lists in different languages.

---

## MVP Feature Scope

### Auth
- [ ] Sign up (email + password)
- [ ] Email confirmation with holding page
- [ ] Log in
- [ ] Log out
- [ ] Password reset via email

### Child profiles
- [ ] Create a child profile (name only)
- [ ] Delete a child profile
- [ ] Switch active child from dashboard

### Word lists
- [ ] Create a list (name + language selection)
- [ ] Rename a list
- [ ] Delete a list
- [ ] View words in a list

### Words
- [ ] Add words manually (free-text input, comma or newline separated)
- [ ] Add words via worksheet photo scan (Gemini image extraction)
- [ ] Automatic AI enrichment on save (phonetic annotation, translation, example sentence)
- [ ] Delete a word from a list
- [ ] Re-enrich a single word (retry if enrichment was wrong)

### Practice
- [ ] Flashcard mode: show character → tap to flip → see phonetic annotation, translation, example sentence
- [ ] Audio playback of character using Web Speech API (language-aware)
- [ ] Navigate between cards (previous / next)

### Settings
- [ ] Adjust speech rate (0.25× to 1×, stored in user_metadata)
- [ ] Account management: change email, change password, delete account

---

## Non-MVP Features (document, do not implement)

These are explicitly out of scope for the initial build. Document them in a `## Future` section of this spec so a future agent can pick them up.

- **Drawing practice**: audio-guided character writing on a Tian Zi Ge (田字格) grid using canvas touch/mouse input
- **Stroke order animations**: interactive stroke-by-stroke animations via HanziWriter (or equivalent per language)
- **Global dictionary**: aggregate all unique characters across all lists for a child, with search
- **Global words view**: aggregate all words across all lists, with search
- **Social OAuth**: Google sign-in via Supabase Auth
- **Offline / PWA**: read-only access to cached lists without internet

---

## File Structure

```
src/
  lib/
    supabase.ts              # Supabase browser client singleton
    audio.ts                 # speak(text, language) — Web Speech API TTS
    types.ts                 # Shared TypeScript interfaces
    stores.svelte.ts         # activeChild $state store, persisted to sessionStorage
    components/
      CharacterDisplay.svelte  # Renders a word with phonetic annotation above (language-aware)
  routes/
    +layout.ts               # prerender = true, ssr = false
    +layout.svelte            # Auth guard, header nav, active child display
    +page.svelte             # Dashboard: child profile list, add child form
    auth/
      login/
        +page.svelte         # Email + password login form
      signup/
        +page.svelte         # Email + password signup form
      confirm/
        +page.svelte         # "Check your email" holding page (no dynamic data)
      callback/
        +page.svelte         # Handles Supabase redirect, establishes session, navigates to /
      reset/
        +page.svelte         # Password reset form
    lists/
      +page.svelte           # Word lists for active child
      [id]/
        +page.svelte         # Words in a list, add/delete words, trigger photo scan
    practice/
      +page.svelte           # Flashcard mode (?listId=<id> query param)
    settings/
      +page.svelte           # Speech rate slider, account actions
  app.css                    # OpenProps import + CSS custom properties + global element styles
  app.d.ts                   # Supabase session type augmentation
supabase/
  functions/
    enrich-words/
      index.ts
    extract-from-image/
      index.ts
  migrations/
    001_initial_schema.sql
tests/
  unit/
    audio.test.ts            # speak_noVoiceFound_usesLangFallback, etc.
    stores.test.ts           # activeChild_setAndGet_persistsToSessionStorage, etc.
  e2e/
    auth.spec.ts             # signup, login, logout, password reset
    lists.spec.ts            # create list, add words, enrichment, delete
    practice.spec.ts         # flashcard flip, audio, navigation
```

---

## CSS & Design System

### Approach

All styles are written in component `<style>` blocks using CSS custom properties. No utility classes. No Tailwind. No class-based frameworks.

OpenProps provides the design token scale. Import in `app.css`:

```css
@import 'open-props/style';
@import 'open-props/normalize';
```

### Custom properties in `app.css`

Define all visual tokens as CSS custom properties. This is mandatory — Phase 2 (brutalist redesign) will override only these tokens, not component styles.

```css
:root {
  /* Colors */
  --color-bg:        #F5F5F0;
  --color-surface:   #FFFFFF;
  --color-text:      #2B2B2B;
  --color-text-muted:#6B6B6B;
  --color-accent:    #4A7FBD;
  --color-accent-fg: #FFFFFF;
  --color-danger:    #C0392B;
  --color-border:    #D8D8D4;

  /* Shape */
  --radius:          var(--radius-2);   /* 4px via OpenProps */
  --shadow:          var(--shadow-2);

  /* Typography */
  --font-body:       'Inter', system-ui, sans-serif;
  --font-mono:       var(--font-mono);  /* OpenProps */

  /* Transitions */
  --transition-speed: 200ms;
}
```

### Semantic HTML requirements

Use the correct element for the job — no `<div>` when a semantic element exists:

- `<header>` for the app header
- `<nav>` for navigation links
- `<main>` for page content
- `<article>` for self-contained content (a flashcard, a word list item)
- `<section>` for grouped content with a heading
- `<dialog>` for modals and overlays
- `<form>` for all user input
- `<button>` for actions (never `<div onclick>`)
- `<output role="alert">` for error and success messages

### Accessibility (WCAG 2.1 AA)

- All `<input>` elements must have an associated `<label>` (not placeholder-only)
- Icon-only buttons must have `aria-label`
- Focus rings must be visible — do not set `outline: none` without an alternative
- Colour contrast: minimum 4.5:1 for normal text, 3:1 for large text
- Interactive elements must be reachable and operable by keyboard
- Use `aria-live="polite"` for dynamic content updates (loading states, enrichment progress)

### Responsive layout

Mobile-first. Single-column base layout. Use CSS Grid or Flexbox for larger viewports:

```css
/* base: single column */
.list-grid {
  display: grid;
  gap: var(--size-4);
}

/* ≥600px: two columns */
@media (min-width: 600px) {
  .list-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ≥900px: three columns */
@media (min-width: 900px) {
  .list-grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Phase 2 design (do not implement — for reference only)

When the brutalist redesign is ready, only `app.css` custom property values change, plus targeted component style additions. No component markup changes.

Planned Phase 2 token overrides (inspired by motherduck.com):
- `--color-bg: #F4EFEA`, accent palette adds `#FFDE00`, `#6FC2FF`, `#FF7169`
- `--radius: 2px`
- `--shadow: 4px 4px 0 var(--color-text)` (hard offset, no blur)
- `--border-width: 2px` (add this token from the start)
- Bold uppercase headings, monospace for labels/tags
- Fast transitions: `--transition-speed: 150ms`

---

## Coding Standards

### TDD

Always write a failing test first, then the minimum code to pass, then refactor. Never write implementation code without a corresponding test.

- **Unit test naming**: `<unit>_<scenario>_<expected>` — e.g. `speak_noSpeechSynthesis_returnsEarly`, `activeChild_logout_clearsSessionStorage`
- **E2E test naming**: descriptive prose — e.g. `'user can create a word list and see it on the dashboard'`
- **Mock only at system boundaries**: Supabase client, Edge Function calls, Web Speech API, `sessionStorage`. Use real collaborators everywhere else.

### Svelte 5 — runes only

The codebase must use Svelte 5 runes exclusively. The following are **forbidden**:

```svelte
<!-- FORBIDDEN -->
export let foo;           <!-- use $props() -->
$: bar = foo * 2;         <!-- use $derived -->
import { writable } from 'svelte/store';  <!-- use $state class -->
on:click={handler}        <!-- use onclick={handler} -->
<slot />                  <!-- use snippets -->
```

**Required patterns**:

```svelte
<script lang="ts">
  // Props
  const { title, count = 0 }: { title: string; count?: number } = $props();

  // State
  let items = $state<string[]>([]);

  // Derived
  const total = $derived(items.length + count);

  // Effects (only for side effects, not derived values)
  $effect(() => {
    document.title = title;
  });
</script>

<!-- Event handlers -->
<button onclick={() => items.push('new')}>Add</button>

<!-- Snippets instead of slots -->
{#snippet footer()}
  <p>Footer content</p>
{/snippet}
```

### Error handling

- Throw errors at system boundaries — never return partial/empty fallback objects to hide failures
- Supabase calls: always destructure `{ data, error }` and throw if `error` is non-null
- Edge Function calls: check response status, throw on non-2xx
- Surface errors in the UI via `<output role="alert">` — never `console.error` only
- Do not add defensive fallbacks for states that "shouldn't happen" — let it fail visibly

```ts
// CORRECT
const { data, error } = await supabase.from('words').select('*');
if (error) throw error;

// FORBIDDEN
const { data } = await supabase.from('words').select('*');
return data ?? [];
```

### TypeScript

- Strict mode (`"strict": true` in tsconfig)
- No `any` — use `unknown` and narrow, or define a proper type
- All Supabase table rows typed via generated types (`supabase gen types typescript`)

### General

- Functional style: pure functions, immutable updates, avoid shared mutable state
- No abstractions for hypothetical future needs — three similar lines of code beats a premature helper
- Comments only when the logic is not self-evident

---

## `lib/types.ts`

```ts
export interface ChildProfile {
  id: string
  parent_id: string
  name: string
  created_at: string
}

export interface WordList {
  id: string
  child_id: string
  name: string
  language: string        // BCP 47
  last_practiced: string | null
  created_at: string
}

export interface Word {
  id: string
  list_id: string
  character: string
  phonetic_annotation: string | null
  translation: string | null
  example: string | null
  example_phonetic: string | null
  example_translation: string | null
  character_note: string | null
  sort_order: number
  created_at: string
}

export interface UserPreferences {
  speechRate: number    // 0.25 – 1.0
}
```

---

## `lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY)
```

---

## `lib/audio.ts`

```ts
// speak(text, language) — plays text via Web Speech API
// Throws if speechSynthesis is unavailable (system boundary — caller handles it)
export function speak(text: string, language: string, rate = 0.75): void

// unlockAudio() — must be called on first user gesture to unblock iOS audio context
export function unlockAudio(): void
```

---

## `lib/stores.svelte.ts`

```ts
// activeChild — the currently selected ChildProfile, or null
// Persisted to sessionStorage under key 'inkido:activeChild'
// Cleared on logout
export const activeChild = /* $state class or module-level $state */
```

---

## MCP Servers

Before implementing, configure the following MCP servers. They provide live Svelte documentation and Supabase schema introspection directly to the coding agent.

### Svelte MCP (run once in the project directory)

```bash
npx sv add mcp
```

This registers the official Svelte MCP server for the project. Once active, use it to read `https://svelte.dev/docs/ai/overview` — the Svelte team's guidance specifically written for AI coding agents. **Read this document in full before writing any Svelte code.** It contains canonical patterns, common mistakes to avoid, and up-to-date best practices for Svelte 5 runes.

### Supabase MCP

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=qxwhisbhgluxglopdwat"
```

This gives the agent live access to the Supabase project: schema introspection, table definitions, RLS policies, and Edge Function status. Use it to verify migrations applied correctly and to generate TypeScript types.

---

## Local Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase (requires Docker)
pnpm supabase start

# 3. Apply migrations
pnpm supabase db reset

# 4. Set Edge Function secrets locally
pnpm supabase secrets set GEMINI_API_KEY=your_key_here

# 5. Serve Edge Functions locally
pnpm supabase functions serve

# 6. Start SvelteKit dev server
pnpm dev
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "test": "pnpm test:unit && pnpm test:e2e",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "supabase": "supabase"
  }
}
```

---

## Verification Checklist

After implementation, verify the following end-to-end:

### Auth
- [ ] Sign up with a new email → confirmation email arrives → click link → session established → redirected to dashboard
- [ ] Log in with existing credentials → dashboard loads with correct child profiles
- [ ] Log out → session cleared → redirected to login
- [ ] Password reset → email arrives → new password set → can log in

### Child profiles
- [ ] Create two child profiles → both appear on dashboard
- [ ] Switch active child → lists page shows correct child's lists
- [ ] Delete a child profile → their lists and words are also deleted (cascade)

### Word lists & words
- [ ] Create a list (name + language) → appears on lists page
- [ ] Add words manually → words appear unenriched immediately, then enrich automatically
- [ ] Scan a worksheet photo → extracted words appear, are enriched on save
- [ ] Re-enrich a word → updated enrichment replaces previous
- [ ] Delete a word → removed from list
- [ ] Delete a list → removed, words cascade-deleted

### Practice
- [ ] Open flashcard mode → first word's character shown
- [ ] Tap card → flips to show phonetic annotation, translation, example
- [ ] Audio button → speaks the character in the correct language
- [ ] Navigate next/previous → moves through all words in list
- [ ] Speech rate change in settings → reflected in next audio playback

### RLS
- [ ] Two separate parent accounts cannot see each other's data (verify via Supabase dashboard or direct SQL)

### Tests
- [ ] `pnpm test:unit` passes
- [ ] `pnpm test:e2e` passes against local Supabase

---

## Future

The following features are explicitly out of scope for the MVP. A future agent should reference this section and the existing data model (which is already designed to accommodate them).

### Drawing practice
A canvas-based writing practice mode where the app reads each word aloud and the child writes the character on a Tian Zi Ge (田字格) grid. Requires:
- `<canvas>` with touch and mouse event support
- Show/hide answer toggle
- Clear canvas button

### Stroke order animations
Interactive stroke-by-stroke animation for characters. For Chinese: HanziWriter library. Future languages will need equivalent libraries. Triggered from the word detail view.

### Global dictionary
Aggregate all unique characters across all lists for the active child. Deduplicated by character. Full-text search by character or phonetic annotation.

### Global words view
Aggregate all words across all lists for the active child. Search by character, phonetic annotation, or translation.

### Google OAuth
Add Google as a Supabase Auth provider. Requires OAuth app setup in Google Cloud Console.

### Offline / PWA
Cache word lists in a service worker or IndexedDB so flashcard practice works without internet. Writes sync when connection is restored.
