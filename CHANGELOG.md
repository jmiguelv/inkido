# Changelog

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
