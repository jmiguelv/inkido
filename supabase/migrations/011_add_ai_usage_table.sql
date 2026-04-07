-- Track daily AI usage per user
create table ai_usage (
  user_id      uuid references auth.users(id) on delete cascade not null,
  day          date not null default current_date,
  usage_count  integer not null default 0,
  primary key (user_id, day)
);

alter table ai_usage enable row level security;

-- Users can only see their own usage
create policy "users_read_own_ai_usage"
  on ai_usage for select
  to authenticated
  using (auth.uid() = user_id);

-- RPC to securely increment usage from an Edge Function
create function increment_ai_usage()
returns integer
language plpgsql
security definer
as $$
declare
  current_count integer;
begin
  insert into ai_usage (user_id, day, usage_count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day)
  do update set usage_count = ai_usage.usage_count + 1
  returning usage_count into current_count;
  
  return current_count;
end;
$$;
