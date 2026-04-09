create index on profiles (parent_id);
create index on word_lists (profile_id);
create index on words (list_id);
create index on tone_stats (profile_id);
