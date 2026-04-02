-- Child profiles owned by a parent account
create table child_profiles (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  created_at  timestamptz default now()
);

-- Word lists belong to a child, scoped to a language
create table word_lists (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid references child_profiles(id) on delete cascade not null,
  name            text not null,
  language        text not null default 'zh',  -- BCP 47: 'zh', 'ja', 'ar', etc.
  last_practiced  timestamptz,
  created_at      timestamptz default now()
);

-- Individual words within a list
create table words (
  id                   uuid primary key default gen_random_uuid(),
  list_id              uuid references word_lists(id) on delete cascade not null,
  character            text not null,       -- the word/characters to practise
  phonetic_annotation  text,               -- pinyin for zh, furigana for ja, etc.
  translation          text,
  example              text,               -- example sentence (may contain <strong> tags)
  example_phonetic     text,               -- phonetic annotation for the example
  example_translation  text,
  character_note       text,               -- radical for zh, stroke info, etc.
  sort_order           integer default 0,
  created_at           timestamptz default now()
);

-- RLS: enable on all tables
alter table child_profiles enable row level security;
alter table word_lists     enable row level security;
alter table words          enable row level security;

-- child_profiles: parent owns their own children
create policy "parent_owns_child_profiles"
  on child_profiles for all
  using (parent_id = auth.uid());

-- word_lists: accessible only if the parent owns the child
create policy "parent_owns_word_lists"
  on word_lists for all
  using (
    exists (
      select 1 from child_profiles
      where child_profiles.id = word_lists.child_id
        and child_profiles.parent_id = auth.uid()
    )
  );

-- words: accessible only if the parent owns the list's child
create policy "parent_owns_words"
  on words for all
  using (
    exists (
      select 1 from word_lists
      join child_profiles on child_profiles.id = word_lists.child_id
      where word_lists.id = words.list_id
        and child_profiles.parent_id = auth.uid()
    )
  );
