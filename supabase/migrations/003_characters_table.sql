create table characters (
  character   text        not null,
  language    text        not null,
  phonetic    text,
  translation text,
  note        text,
  created_at  timestamptz default now(),
  primary key (character, language)
);

alter table characters enable row level security;

-- Character data is not personal — any authenticated user can read
create policy "authenticated_read_characters"
  on characters for select
  to authenticated
  using (true);

create policy "authenticated_upsert_characters"
  on characters for insert
  to authenticated
  with check (true);

create policy "authenticated_update_characters"
  on characters for update
  to authenticated
  using (true);
