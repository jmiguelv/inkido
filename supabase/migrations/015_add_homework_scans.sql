create table homework_scans (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  summary     text not null,
  analysis    jsonb not null,
  created_at  timestamptz not null default now()
);

alter table homework_scans enable row level security;

create policy "users manage own homework scans"
  on homework_scans for all
  using (
    profile_id in (
      select id from profiles where parent_id = auth.uid()
    )
  );

create index on homework_scans (profile_id);
