-- Add traditional characters to dictionary for better lookup support
alter table zh_words add column traditional text;

-- Index for traditional character lookups
create index idx_zh_words_traditional on zh_words (traditional);
