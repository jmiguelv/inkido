# Inkido TODO.md

## Todo

- [ ] debug: Stroke colorization sometimes applies incorrectly or requires a delay; look into a more robust way to ensure SVG is ready in CharacterWriter.svelte
- [ ] fix: OpenProps seems to have an auto dark-mode for tables, making them unreadable at night time
- [ ] feat: Persist the search query in the /dictionary url
- [ ] test: Ensure tests are relevant and there is enough coverage

## In progress

## Done

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
