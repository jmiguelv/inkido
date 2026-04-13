# Inkido TODO.md

## Todo

### High priority

- [ ] fix: no confirmation on destructive actions — delete list (`spellings/+page.svelte:138`), delete profile (`profiles/+page.svelte:63`), delete word all fire immediately with no dialog; add a modal "Delete [Name]? This cannot be undone."
- [ ] fix: quiz mode soft-lock if CharacterWriter fails to load — `onComplete` never fires so user cannot progress; add a "Skip" button in quiz mode and a 30s timeout fallback
- [ ] fix: empty state in tone practice gives no guidance — `spellings/[id]/tones/+page.svelte`: "no characters with pinyin" message should explain what to do and link back to the list to enrich words
- [ ] fix: mobile hamburger menu may still be visible during page transition — `+layout.svelte`; add explicit `onclick={() => menuOpen = false}` on all nav links in `.nav-right` as belt-and-braces alongside the existing `$effect`
- [ ] fix: error messages inconsistent and easy to miss — some are inline `<output>` tags below forms, some are banners, lifetime varies; standardise to a top-of-form banner that persists until dismissed or next action
- [ ] fix: scan error feedback unclear — after a failed worksheet scan `spellings/[id]/+page.svelte` shows the error but does not make it obvious a retry is safe; add an explicit "Try again" prompt
- [ ] feat: add spelling progress to profile cards — `profiles/+page.svelte` shows only tone stats; add word count and list count so parents can see spelling engagement

### Medium priority

- [ ] refactor: rename "Re-lookup all words" button — `spellings/[id]/+page.svelte`; change label to "Refresh translations" or "Update pinyin & meanings" with a tooltip explaining what it does
- [ ] fix: "Peek Hint" hold mechanic has no affordance — `spellings/[id]/practice/+page.svelte`; add a visible label "Hold to peek" or convert to a toggle to make the interaction discoverable
- [ ] refactor: homework context textarea placeholder too vague — `homework/+page.svelte`; improve to "e.g. Grade 4 fill-in-the-blank exercise, translate to Chinese"
- [ ] fix: multi-image homework upload not communicated — input label says "Scan worksheet" (singular); change to "Scan page(s)", show selected file count, and show per-image analysing progress
- [ ] feat: skeleton loaders on card grids — most pages show plain "Loading…" text; replace with placeholder shimmer cards matching the final layout
- [ ] fix: AI usage counter in settings lacks context — shows "5 / 10" with no explanation; add "enrichments used today — resets at midnight" and a percentage bar
- [ ] fix: neutral tone button unclear in tone practice — `spellings/[id]/tones/+page.svelte`; plain "a" with no mark or label; add "neutral" label or distinguish visually
- [ ] fix: dictionary no-results message unhelpful — `dictionary/+page.svelte`; add "Try searching by pinyin (e.g. 'ni hao') or English meaning"
- [ ] fix: word card grid overflows on very small phones — `spellings/[id]/+page.svelte`; `minmax(280px, 1fr)` breaks at < 320px; add `@media (max-width: 480px) { grid-template-columns: 1fr }`
- [ ] fix: edit mode on list rename card has no visual indication — `spellings/+page.svelte`; add a highlighted border or background change to show the card is in edit state
- [ ] feat: tone practice progress bar — currently only a score counter; add `<progress value={answeredCount} max={items.length}>` below the score
- [ ] fix: tone practice buttons too tall on mobile — 5 × 160px buttons + controls require scrolling on small phones; reduce height or switch to a 2-col grid at narrow viewports

### Low priority

- [ ] feat: breadcrumbs on deep pages — `/spellings/[id]/practice` and other 2+ level routes show only a back link; add a breadcrumb trail e.g. "Spellings / Week 1 / Practice"
- [ ] refactor: remove redundant "Reveal" button from practice flashcard — `spellings/[id]/practice/+page.svelte`; the card itself is already clickable; remove the button and add a "(tap to reveal)" hint on the card front
- [ ] feat: keyboard shortcuts tip in tone practice — arrow keys and 1–5 number keys are bound but never documented; show a dismissible tip on first load
- [ ] fix: auth confirm page has no resend link — `auth/confirm/+page.svelte`; user has no recovery path if the magic link email didn't arrive; add a "Resend link" button
- [ ] feat: word detail edit: highlight AI-filled fields — `words/[id]/+page.svelte`; after AI enrichment, mark which fields were changed so the user can verify before saving
- [ ] fix: homework edit modal: no undo after saving a translation — `homework/[id]/+page.svelte`; once saved the change is permanent; add a confirm step inside the modal or an undo toast
- [ ] refactor: `MY WORDS` table has no sort or filter controls — `words/+page.svelte`; add sortable column headers and a filter by list name
- [ ] refactor: landing page copy doesn't explain why stroke order matters — `+page.svelte`; change "Stroke-by-stroke animation" to explain the classroom relevance
- [ ] fix: character modal tab/keyboard navigation incomplete — `CharacterModal.svelte`; arrow keys don't cycle through components in the "Made of" section; fix tab order and add left/right arrow support
- [ ] refactor: standardise button visual hierarchy across the app — primary (dark bg + yellow text), secondary (surface bg), tertiary (icon-only); currently mixed inconsistently
- [ ] refactor: standardise terminology — "spelling", "spelling list", "word list", "set" used interchangeably across UI copy; pick one term and apply everywhere
- [ ] feat: about/help page FAQ — `about/+page.md`; add answers to "what is pinyin?", "why is there an AI limit?", "can I export my words?" etc.

## In progress

## Done

- [x] fix: `{@attach openDialog}` in `CharacterModal.svelte:78` — replaced with `use:openDialog` action as per AGENTS.md mandate
- [x] fix: `{@html}` on LLM/user-generated fields — replaced with `{sanitize(...)}` using a new `$lib/sanitize.ts` utility to prevent XSS
- [x] fix: unhandled promise rejections in `$effect` hooks — wrapped async calls in `loadLists()`, `loadWords()`, and `loadScans()` with `.catch()` and surfaced errors to `errorMsg`
- [x] fix: `supabase.auth.getSession().then(...)` in `+layout.svelte:55` — added `.catch()` to the auth promise chain
- [x] fix: `loadProfiles()` in `+layout.svelte:43` — added `console.error` for Supabase errors
- [x] fix: LLM enrichment errors invisible to user — updated `enrichWords` in `spellings/[id]/+page.svelte` to set `errorMsg` on failure
- [x] fix: debounce timer leak in `dictionary/+page.svelte` — added `clearTimeout` in `onMount` cleanup
- [x] fix: missing loading indicator during word reorder — added `reordering` state and integrated it into the `enriching-banner`
- [x] refactor: `LlmResult` type defined locally in `spellings/[id]/+page.svelte` — moved to `src/lib/types.ts`
- [x] refactor: `_viewChar` in `CharacterModal.svelte` — renamed to `overrideChar` for clarity
- [x] refactor: `&#10;` entity in textarea placeholder `spellings/[id]/+page.svelte:365` — replaced with `\n` in a template literal
- [x] refactor: update stale route references in `AGENTS.md` — updated project structure to use `/spellings/` and `/dictionary/`
- [x] feat: add `maxlength="500"` to homework context textarea in `homework/+page.svelte`
- [x] test: added unit tests for `getStrokeClass`, `getCharsData`, `getWordsData` and new `calculateEnrichmentUpdates` logic
- [x] refactor: add `aria-live="polite"` regions to async status messages across the app
- [x] fix: ensure homework edit modal closes after successful translation
- [x] refactor: use modal for homework inline translation to prevent overflow
- [x] fix: restore missing SETTINGS link in profiles dropdown
- [x] docs: remove incorrect dictionary data attribution from ABOUT page
- [x] refactor: reduce footer padding for better balance (from 12 to 10)
- [x] feat: record and display optional context prompt (stored in DB and shown on detail page)
- [x] feat: Store a thumbnail of each homework scan — add a `thumbnail text` column to `homework_scans`; on the client, resize the first image to ~400px wide using a canvas element before insert (images are already base64 from `readAsDataURL`); display the thumbnail on the list card; no Storage bucket needed (lower priority)
- [x] feat: Add a `/privacy` page — what data is stored (email, profiles, word lists, homework scans), no third-party analytics, how to request deletion; link from footer
- [x] feat: Show pinyin as a tooltip when hovering over interactive characters throughout the app — consistent with existing hover behaviour but surface the phonetic annotation visually
- [x] refactor: Update `/about` page to cover the Homework section and mark it as a work in progress
- [x] refactor: Standardise heading casing across the app — use ALL CAPS for section headings and nav items, Sentence case for subtitles and descriptions; eliminate Title Case
- [x] feat: Add a disclaimer to the site (footer or `/about`) — personal project, free to use, no guarantees; contact email is inkido.foyer772@passinbox.com
- [x] refactor: Remove character data stats from footer and add them to the `/about` page instead
- [x] feat: Add `capture="environment"` to the spellings scan input in `spellings/[id]/+page.svelte` so tapping it on mobile opens the camera directly, matching the homework scan behaviour
- [x] refactor: Footer needs more breathing space — increase padding/margin in footer styles
- [x] refactor: Remove profile name from Spellings page heading (`src/routes/spellings/+page.svelte`) — only section in the app that includes the profile name in the h1; inconsistent with all other section headings
- [x] perf: Reduce AI daily limit from 20 to 10 — update `AI_LIMIT` in `src/lib/constants.ts`, `AI_DAILY_LIMIT` in `supabase/functions/enrich-words/index.ts`, and `supabase/functions/analyse-worksheet/index.ts`
- [x] feat: Redesign the home page (`src/routes/+page.svelte`) as a scrolly narrative — walk the user through the full journey: photograph worksheet → words detected → list created → pinyin + translation enriched → audio playback → spelling practice → character meanings → component breakdown; emphasise that the app combines multiple services (OCR, dictionary lookup, TTS, AI enrichment) into one seamless experience; each step revealed as they scroll, replacing the current static feature list
- [x] feat: Inline translation on homework answer blocks — each answer block in `homework/[id]/+page.svelte` gets an edit button; user types a replacement in English, clicks translate, app calls MyMemory API (`https://api.mymemory.translated.net/get?q=...&langpair=en|zh&de={userEmail}`) using the authenticated user's email for the 10k words/day free tier, result replaces the stored answer via a PATCH to `homework_scans.analysis`
- [x] feat: Mark AI-generated answers in `homework/[id]/+page.svelte` — add a visible disclaimer on each answer block (e.g. small ✦ badge with tooltip "AI-generated — verify and write your own answers"), matching the `llm-badge` pattern used in spellings practice
- [x] feat: Add optional context field to homework scan form in `homework/+page.svelte` — short textarea ("Describe the homework, e.g. topic or grade level") passed as `context` to `analyse-worksheet` edge function and injected into the prompt before the structured instructions
- [x] fix: `CharacterModal.svelte` is too narrow on desktop — increase `max-width` on wider viewports
- [x] refactor: Gloss and meaning fields in `CharacterModal.svelte` should be visually grouped — move them adjacent in the layout
- [x] feat: Chinese characters in `homework/[id]/+page.svelte` `q.original` are plain text — split using `splitCharacters` from `src/lib/characters.ts` and render each as a clickable element opening `CharacterModal` (same pattern as `spellings/[id]/practice/+page.svelte`)
- [x] refactor: Homework should follow Spellings in the nav — swap order in `src/routes/+layout.svelte` so nav reads Spellings → Homework
- [x] fix: Multiple image upload is half-wired — `handleScan` in `homework/+page.svelte` reads only `input.files?.[0]` and sends `base64Image` (singular), but the input has `multiple` and the edge function accepts `base64Images[]`. Iterate `input.files` and send the full array so multi-page worksheets are processed correctly.
- [x] fix: `errorMsg` renders twice in `homework/+page.svelte` — one `<output role="alert">` sits above the grid (line ~87) and a second one inside the scan form. An error during scanning shows in both places simultaneously. Remove the one above the grid and keep only the one near the trigger.
- [x] fix: `isLoading` never resets to `false` if `activeProfile` is absent in `homework/+page.svelte` — `loadScans` guards with `if (!activeProfile) return` without setting `isLoading = false`, so the page is permanently stuck on "Loading…" if the redirect in `onMount` is slow or blocked.
- [x] fix: Audio button on homework detail uses `scale(1.1)` on hover — all other interactive elements in the app use `translate(-2px, -2px)`. Update `.icon-btn:hover` in `homework/[id]/+page.svelte` to match.
- [x] fix: `.scan-detail` in `homework/[id]/+page.svelte` has no `max-width` — question cards stretch to the full ~1200px container on wide screens. Add `max-width: 800px; margin: 0 auto` to match other constrained pages.
- [x] fix: Inconsistent title fallback text — list card uses `|| 'Worksheet'`, detail page uses `|| 'Worksheet Details'`. Align to the same string.
- [x] refactor: `list-meta` in homework cards uses `<strong>` and `<br />` — all other list cards (spellings) use plain inline text with `·` separators. Change to `{new Date(scan.created_at).toLocaleDateString()} · {scan.summary}` matching the spellings card pattern.
- [x] refactor: `worksheet-type` badge is placed inside `.header-actions` in `homework/[id]/+page.svelte` — that slot is reserved for action buttons or counters. Move it into `.title-group` alongside the description `<p>`, or inline it as a tag next to the h1.
- [x] refactor: `.header-actions` in `homework/[id]/+page.svelte` is locally overridden to `flex-direction: column` — the only instance in the app; the global rule is a row. Remove the local override and let the global style apply.
- [x] refactor: `meta-date` is a second `<p>` inside `.title-group` in `homework/[id]/+page.svelte` — the global `.title-group p` adds top margin to every `<p>`, creating double spacing. Merge the date into the existing description paragraph (e.g. `<small>{scan.summary} · {date}</small>`).
- [x] refactor: Scan form in `homework/+page.svelte` uses `<div class="scan-form">` — the spellings create panel uses `<form>`. Wrap in `<form>` for semantic correctness and keyboard accessibility.
- [x] refactor: Both `answer-block` elements in `homework/[id]/+page.svelte` use `background: var(--color-mint)` — they are visually identical. Use a different pastel (e.g. `--color-sky`) for the English block to visually distinguish the two columns.
- [x] Homework card titles — the date alone isn't descriptive. Auto-generate a 3–4 word title
      from the summary (e.g. "Fill in the Blanks") so cards are scannable at a glance.
- [x] Audio on homework detail — those who can't pronounce the Chinese sample answers. Adding a ♪
      button (reusing the existing speak() utility from $lib/audio.ts) would be immediately
      useful.
- [x] enrich-words has no tests — the other two functions do. Low-risk to add, and it's the
      most-called function in the app.
- [x] Loading states — most pages show nothing until the Supabase query resolves. A skeleton or
      "Loading…" state on the card grids would improve perceived performance, especially on
      mobile.
- [x] fix: `nextAudioTimeout` variable declared in tones practice but never assigned — `setTimeout(handleAudio, 300)` on line 113 of `tones/+page.svelte` is still a raw leak; assign to the variable and cancel it in the `onMount` cleanup alongside the `keydown` listener
- [x] fix: `setTimeout(handleAudio, 300)` in `handleNext` in tones practice has no cleanup — inconsistent with the `$effect` fix; store the return value and cancel it if the component is destroyed
- [x] refactor: `AI_DAILY_LIMIT = 20` in `supabase/functions/enrich-words/index.ts` cannot import from `src/lib/characters.ts` (different runtime) — add a comment cross-referencing the frontend constant so the two values don't silently drift
- [x] test: New `alignPinyin` and `isChineseCharacter` tests use plain prose names instead of the project convention `<unit>_<scenario>_<expected>` — align with existing test naming style
- [x] fix: `showHint` is not reset in `handlePrev`, `handleNext`, or `toggleQuiz` in spelling practice — peek state can linger across word navigation
- [x] fix: `setActiveProfile` called with `null as unknown as Profile` when deleting the active profile in profiles page — update the function signature to accept `null`
- [x] perf: Missing FK indexes — Postgres does not auto-index FK columns; add indexes on `profiles.parent_id` (every RLS check in the app), `word_lists.profile_id` (spellings page + RLS), `words.list_id` (every practice/spelling page + RLS), and `tone_stats.profile_id` (stats query + RLS)
- [x] fix: `setTimeout` inside `$effect` in tones practice has no cleanup — if the component is destroyed before the timeout fires, `handleAudio` runs against a stale closure; return `() => clearTimeout(t)`
- [x] fix: `ai_usage` query error is silently discarded in settings — add at minimum a `console.error` so broken RLS or missing table is visible
- [x] test: `alignPinyin` and `isChineseCharacter` have no unit tests — `alignPinyin` is the function at the centre of the tone/pinyin mapping bug fix
- [x] perf: `zh_words.translation` and `zh_chars.gloss` have no indexes but are searched with `ilike.%q%` in the dictionary — add GIN trigram indexes (pg_trgm already enabled)
- [x] refactor: `AI_LIMIT = 20` is hardcoded in `settings/+page.svelte` — extract to `$lib/constants.ts` and import wherever the limit is referenced
- [x] refactor: Keyboard navigation (arrow keys) missing from tones practice — inconsistent with spelling practice which binds `ArrowLeft`/`ArrowRight`
- [x] refactor: `writerInstance` typed as `any` in `CharacterWriter.svelte` — use the HanziWriter TypeScript type
- [x] refactor: Email error detection in settings uses `emailMsg.startsWith('F')` — replace with a dedicated `emailError` boolean state
- [x] feat: Display the AI usage in the settings
- [x] feat: Record and display tone listening stats per profile
- [x] fix: Characters/tones, there is an issue with the character mapping to pinyin/tones, for example the word 奶奶 (nǎi
      nai) is showing as nǎi nǎi twice in the characters table. And I think a similar issue is happening in the tones view, where the correct tone does not match what is being played
- [x] feat: Add a new route, to practice tone listening, it should be very simple, play different words and give the user the choice of which tone it was
- [x] test: Ensure tests are relevant and there is enough coverage (Added tests for getTone)
- [x] refactor: In practice, draw, should be labelled write
- [x] refactor: In practice, decrease the size of the placeholders for writing
- [x] refactor: In practice, add an option to toggle the writing hint
- [x] debug: Stroke colorization sometimes applies incorrectly or requires a delay; look into a more robust way to ensure SVG is ready in CharacterWriter.svelte
- [x] feat: Add a ribbon or some other obvious marker to show when I am running the dev server
- [x] refactor: Move the theme toggle button more towards the end of the nav, it is too prominent now
- [x] refactor: Character draw feature in practice, it whould show the placeholder to draw all the characters, not just one at a time
- [x] feat: Persist the search query in the /dictionary url
- [x] fix: OpenProps seems to have an auto dark-mode for tables, making them unreadable at night time (Added dedicated Brutalist Dark Mode)
- [x] fix: Colorize failed: Error: Invalid color: var(--color-text)
- [x] feat: Record AI usage and enforce 20/day limit
- [x] feat: Is there enough information in the data model to draw a character in different colours for the meaning component and the sound component?
- [x] feat: Integrate the HanziWriter quizz functionalisty into the /practice cards
- [x] fix: Now that the dictionary results can also return words, the click action should not open the character modal for words, but it should go to the word view
- [x] fix: Mobile responsiveness is broken across the app, in particular in routes that have action buttons in the headers
- [x] feat: Expand /dictionary search to search in the words data as well
- [x] feat: Rename explore to Dictionary and the route to /dictionary
- [x] refactor: The /about page feels out of place compared to the rest of the site, it is also missing the navbar
- [x] fix: /word/[id], When there is punctuation in a word/sentence, the pinyin gets out of alignment with the characters
- [x] feat: Scale down component characters and add plus separator
- [x] refactor: Center align all cells in characters table on word detail page
- [x] feat: Unify listen button styling and text across practice and word details
- [x] refactor: Extract card coloring logic and apply to practice flashcards
- [x] feat: Align listen and edit buttons to bottom of word detail header
- [x] feat: Unify header styling for spelling detail and move back-link to global styles
- [x] feat: Add word title and explanation to word detail header
- [x] feat: Add a header to the /spellings/[id]/practice
- [x] fix: Check how the word cards are being coloured as I am only getting green and blue, and some of the words are long sentences
- [x] refactor: Practice should not show the word by default, just character placeholder to give a rough idea of the length of the word, the listen button and the tap to reveal hint
- [x] refactor: Lists should be called spellings
- [x] refactor: Move settings into the profiles dropdown, after manage profiles
- [x] feat: Show the character pinyin on character hover
- [x] feat: Individual character background on hover based on stroke count
- [x] feat: For every route, change the heading to an hgroup as needed, and add a <small> explanation about the route
- [x] fix: Tables remove radius
- [x] feat: /characters, style the table in the same way as the other character table at /words/[id]
- [x] feat: /words, sort them alphabetically
- [x] fix: /words, we need a better strategy to display them, the table is overflowing, and content is overriding when the words/sentences are too long
- [x] feat: /words, style the table using the same styles from the characters table at /words/[id]
- [x] feat: /lists/[id] Ensure all cards in a row have equal height
- [x] feat: Add an hr after content and actions card, this affects, /lists, /lists/[id], /profiles
- [x] feat: /settings, cards are all in one column, good for mobile, but not for desktop
- [x] feat: Add an about or how to page (use mdsvex for markdown support) on how to use the app
- [x] fix: After the first login, clicking on `Go To App` does nothing
- [x] perf: cache Supabase queries
- [x] feat: /words/[id]: Characters table, add a button to play the character
- [x] feat: /words/[id]: Characters table, add `made of` column, the characters should be clickable
- [x] feat: /words/[id]: When editing it is possible to AI the pinyin, the same should be available for the meaning
- [x] feat: Tables, remove radius
- [x] fix: /characters: Searches for unaccented pinyin queries like "kai" are returning no results, despite "kāi" (and other tone variants) existing in the database
- [x] fix: /characters: Searches for unaccented pinyin queries like "kai" are returning no results, despite "kāi" (and other tone variants) existing in the database
- [x] fix: The GitHub Actions CI pipeline is currently failing during the `pnpm check` step due to three primary issues: missing environment variables, invalid import extensions for path aliases, and a type mismatch with the `hanzi-writer` library
