# Changelog

## [0.6.8](https://github.com/jmiguelv/inkido/compare/v0.6.7...v0.6.8) (2026-07-08)

### Bug Fixes

* **homework:** compress worksheet images before sending to edge function ([8cc375f](https://github.com/jmiguelv/inkido/commit/8cc375f3a69f243f058b39a7c4a742c7c2d523d7))
  - Fixes WORKER_RESOURCE_LIMIT error by implementing client-side image compression
  - Reduces typical 3-image payload from ~35MB to ~8-10MB
  - Add compressImage() function with 1024px max width and JPEG 0.7 quality
  - Improve markdown fence regex in all vision edge functions

### Documentation

* **docs:** add comprehensive architecture and image compression documentation ([bac40c9](https://github.com/jmiguelv/inkido/commit/bac40c902c836705d616617c6a85b32fabb0c014))
  - docs/ARCHITECTURE.md: System overview, feature implementations, database schema
  - docs/IMAGE_COMPRESSION.md: Image compression strategy, troubleshooting, performance metrics
  - Update README.md with documentation links

# Changelog

## [0.6.7](https://github.com/jmiguelv/inkido/compare/v0.6.0...v0.6.7) (2026-07-02)

### Features

* **footer:** add author portfolio link in footer and about page ([6868719](https://github.com/jmiguelv/inkido/commit/686871976c8bbd4ccb0085ce5fde00cdf3a6f2d6))
* **homework:** add detail view for individual homework questions ([3bb9b13](https://github.com/jmiguelv/inkido/commit/3bb9b136c3e75bb3e032344cd6e13a4d341e62af))
* **settings:** add writing speed preference for HanziWriter ([eadb3a0](https://github.com/jmiguelv/inkido/commit/eadb3a02d67370bee1070814eba51e0467198d1f))
* **spellings:** sort lists by most recent first ([ccb0eec](https://github.com/jmiguelv/inkido/commit/ccb0eecfaa8c58955ed4786b15a2a353f70303a3))

### Bug Fixes

* **dictionary:** resolve duplicate key error in character display ([7535e97](https://github.com/jmiguelv/inkido/commit/7535e975939b5d5c9b2973b4e3914e981cfbc9e0))
* **practice:** remove 30s quiz timeout causing auto-completion ([8d3328c](https://github.com/jmiguelv/inkido/commit/8d3328c9e065002c673223f4a1323840c9b68b45))
* **practice:** resolve auto-completion and lifecycle issues in writing practice ([2275bb2](https://github.com/jmiguelv/inkido/commit/2275bb2f72e9a1f3ec9f6fdab0ed7a6888510230))

## [0.6.6](https://github.com/jmiguelv/inkido/compare/v0.6.0...v0.6.6) (2026-07-02)

### Features

* **homework:** add detail view for individual homework questions ([3bb9b13](https://github.com/jmiguelv/inkido/commit/3bb9b136c3e75bb3e032344cd6e13a4d341e62af))
* **settings:** add writing speed preference for HanziWriter ([eadb3a0](https://github.com/jmiguelv/inkido/commit/eadb3a02d67370bee1070814eba51e0467198d1f))
* **spellings:** sort lists by most recent first ([ccb0eec](https://github.com/jmiguelv/inkido/commit/ccb0eecfaa8c58955ed4786b15a2a353f70303a3))

### Bug Fixes

* **dictionary:** resolve duplicate key error in character display ([7535e97](https://github.com/jmiguelv/inkido/commit/7535e975939b5d5c9b2973b4e3914e981cfbc9e0))
* **practice:** remove 30s quiz timeout causing auto-completion ([8d3328c](https://github.com/jmiguelv/inkido/commit/8d3328c9e065002c673223f4a1323840c9b68b45))
* **practice:** resolve auto-completion and lifecycle issues in writing practice ([2275bb2](https://github.com/jmiguelv/inkido/commit/2275bb2f72e9a1f3ec9f6fdab0ed7a6888510230))

## [0.6.5](https://github.com/jmiguelv/inkido/compare/v0.6.0...v0.6.5) (2026-04-29)

### Features

* **homework:** add detail view for individual homework questions ([3bb9b13](https://github.com/jmiguelv/inkido/commit/3bb9b136c3e75bb3e032344cd6e13a4d341e62af))
* **settings:** add writing speed preference for HanziWriter ([eadb3a0](https://github.com/jmiguelv/inkido/commit/eadb3a02d67370bee1070814eba51e0467198d1f))
* **spellings:** sort lists by most recent first ([ccb0eec](https://github.com/jmiguelv/inkido/commit/ccb0eecfaa8c58955ed4786b15a2a353f70303a3))

### Bug Fixes

* **dictionary:** resolve duplicate key error in character display ([7535e97](https://github.com/jmiguelv/inkido/commit/7535e975939b5d5c9b2973b4e3914e981cfbc9e0))
* **practice:** remove 30s quiz timeout causing auto-completion ([8d3328c](https://github.com/jmiguelv/inkido/commit/8d3328c9e065002c673223f4a1323840c9b68b45))
* **practice:** resolve auto-completion and lifecycle issues in writing practice ([2275bb2](https://github.com/jmiguelv/inkido/commit/2275bb2f72e9a1f3ec9f6fdab0ed7a6888510230))

## [0.6.4](https://github.com/jmiguelv/inkido/compare/v0.6.0...v0.6.4) (2026-04-22)

### Features

* **homework:** add detail view for individual homework questions ([3bb9b13](https://github.com/jmiguelv/inkido/commit/3bb9b136c3e75bb3e032344cd6e13a4d341e62af))
* **settings:** add writing speed preference for HanziWriter ([eadb3a0](https://github.com/jmiguelv/inkido/commit/eadb3a02d67370bee1070814eba51e0467198d1f))

### Bug Fixes

* **dictionary:** resolve duplicate key error in character display ([7535e97](https://github.com/jmiguelv/inkido/commit/7535e975939b5d5c9b2973b4e3914e981cfbc9e0))

## [0.6.3](https://github.com/jmiguelv/inkido/compare/v0.6.0...v0.6.3) (2026-04-22)

### Features

* **homework:** add detail view for individual homework questions ([3bb9b13](https://github.com/jmiguelv/inkido/commit/3bb9b136c3e75bb3e032344cd6e13a4d341e62af))
* **settings:** add writing speed preference for HanziWriter ([eadb3a0](https://github.com/jmiguelv/inkido/commit/eadb3a02d67370bee1070814eba51e0467198d1f))

### Bug Fixes

* **dictionary:** resolve duplicate key error in character display ([7535e97](https://github.com/jmiguelv/inkido/commit/7535e975939b5d5c9b2973b4e3914e981cfbc9e0))

## [0.6.2](https://github.com/jmiguelv/inkido/compare/v0.6.0...v0.6.2) (2026-04-20)

### Features

* **homework:** add detail view for individual homework questions ([3bb9b13](https://github.com/jmiguelv/inkido/commit/3bb9b136c3e75bb3e032344cd6e13a4d341e62af))

### Bug Fixes

* **dictionary:** resolve duplicate key error in character display ([7535e97](https://github.com/jmiguelv/inkido/commit/7535e975939b5d5c9b2973b4e3914e981cfbc9e0))

## [0.6.1](https://github.com/jmiguelv/inkido/compare/v0.6.0...v0.6.1) (2026-04-20)

### Bug Fixes

* **dictionary:** resolve duplicate key error in character display ([7535e97](https://github.com/jmiguelv/inkido/commit/7535e975939b5d5c9b2973b4e3914e981cfbc9e0))

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
