create extension if not exists pg_trgm;

create index on zh_words using gin (translation gin_trgm_ops);
create index on zh_chars using gin (gloss gin_trgm_ops);
