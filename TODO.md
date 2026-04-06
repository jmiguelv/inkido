# Inkido TODO.md

## Todo

- [ ] test: Ensure tests are relevant and there is enough coverage
- [ ] refactor: Practice should not show the word by default, just character placeholder to give a rough idea of the length of the word, the listen button and the tap to reveal hint

## In progress

## Done

- [x] refactor: Lists should be called spellings
- [x] refactor: Move settings into the profiles dropdown, after manage profiles
- [x] feat: Show the character pinyin on character hover
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
