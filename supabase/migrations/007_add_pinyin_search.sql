-- Add unaccented pinyin column for diacritic-insensitive search
alter table zh_words add column pinyin_search text;

-- Create an index to support ilike searches (trigram is best for %...%)
-- Enabling pg_trgm extension if not already present
create extension if not exists pg_trgm;
create index idx_zh_words_pinyin_search_trgm on zh_words using gin (pinyin_search gin_trgm_ops);
