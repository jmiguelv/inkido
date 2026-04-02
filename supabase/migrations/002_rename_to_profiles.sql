-- Rename child_profiles table to profiles
alter table child_profiles rename to profiles;

-- Rename child_id FK column in word_lists to profile_id
alter table word_lists rename column child_id to profile_id;

-- Drop old RLS policies
drop policy "parent_owns_child_profiles" on profiles;
drop policy "parent_owns_word_lists" on word_lists;
drop policy "parent_owns_words" on words;

-- Recreate policies with updated table/column references
create policy "parent_owns_profiles"
  on profiles for all
  using (parent_id = auth.uid());

create policy "parent_owns_word_lists"
  on word_lists for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = word_lists.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "parent_owns_words"
  on words for all
  using (
    exists (
      select 1 from word_lists
      join profiles on profiles.id = word_lists.profile_id
      where word_lists.id = words.list_id
        and profiles.parent_id = auth.uid()
    )
  );
