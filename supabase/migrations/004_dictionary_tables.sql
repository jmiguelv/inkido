create table zh_words (
  word        text primary key,
  pinyin      text,
  translation text,
  hsk_level   smallint
);

create table zh_chars (
  char         text primary key,
  gloss        text,
  stroke_count smallint
);

alter table zh_words enable row level security;
alter table zh_chars enable row level security;

create policy "authenticated_read_zh_words"
  on zh_words for select
  to authenticated
  using (true);

create policy "authenticated_read_zh_chars"
  on zh_chars for select
  to authenticated
  using (true);
