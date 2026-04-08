create table tone_stats (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references profiles(id) on delete cascade not null,
    character text not null,
    expected_tone integer not null,
    selected_tone integer not null,
    correct boolean not null,
    created_at timestamp with time zone default now() not null
);

alter table tone_stats enable row level security;

create policy "parent_owns_tone_stats"
    on tone_stats for all
    using (
        exists (
            select 1 from profiles
            where profiles.id = tone_stats.profile_id
            and profiles.parent_id = auth.uid()
        )
    );
