# Changelog

## [0.5.5](https://github.com/jmiguelv/inkido/compare/v0.5.4...v0.5.5) (2026-04-12)

## [0.2.0] — 2026-04-08

### Added
- Tone Listening practice mode for Mandarin sets
- Tone practice statistics recorded and displayed per profile (Accuracy % and count)
- AI Usage tracking displayed in Settings with progress indicator and daily limit warning
- Unique character extraction for focused tone practice
- Keyboard navigation for Tone practice (Arrow keys + 1-5 for tones)

### Performance
- Added database indexes for all Foreign Key columns to optimize RLS checks
- Added GIN Trigram indexes for dictionary translation/gloss searches

### Fixed
- Mapping: Repeated characters in words (e.g. 奶奶) now correctly show contextual pinyin in tables
- Mapping: Tone practice now uses isolated dictionary pinyin to match TTS engine pronunciation
- Bug: `showHint` now correctly resets during spelling practice navigation
- Bug: Fixed potential memory leaks by cleaning up `setTimeout` in practice components
- Typing: Standardized `setActiveProfile` and `CharacterWriter` TypeScript definitions

## [0.1.1] — 2026-04-04

### Changed
- Character stroke animations play once on load; click to replay
- Footer attribution corrected to Chinese Character Wiki (dong-chinese.com)

### Fixed
- CI: missing `.env` file caused `pnpm check` to fail
- CI: `.ts` extension on `$lib` alias imports rejected by type checker
- `__APP_VERSION__` declaration moved inside `declare global` so it resolves correctly

## [0.1.0] — 2026-04-04

### Added
- Word lists with stroke-complexity colour coding (mint → sky → lavender → rose by avg stroke count)
- Practice mode with stroke-by-stroke handwriting animation and keyboard navigation
- Photo worksheet scanning — photograph a worksheet to extract characters via AI
- Chinese character explorer: search 94,000 characters by meaning, pinyin, or stroke count
- My Words view: all vocabulary across every list in one searchable table
- Profile management: create, rename, delete, and switch learner profiles
- Mobile-responsive nav with hamburger menu
- Public landing page at `/`
- Footer with version and data attribution (Unicode Han Database + CC-CEDICT)
- Custom 404 / error page
