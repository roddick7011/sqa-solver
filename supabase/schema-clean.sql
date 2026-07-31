create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🌱',
  created_at timestamptz not null default now(),
  archived boolean not null default false
);
create index if not exists profiles_user_id_idx on public.profiles(user_id);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  stage text not null,
  grade int not null,
  subject_id text not null,
  question_text text not null default '',
  question_image text,
  ai_solution text not null default '',
  cues text not null default '',
  notes text not null default '',
  summary text not null default '',
  tags jsonb not null default '[]'::jsonb,
  starred boolean not null default false,
  review_count int not null default 0,
  interval_days int not null default 0,
  ease_factor double precision not null default 2.5,
  next_review_at timestamptz not null default now(),
  last_result text,
  last_review_at timestamptz,
  local_id int
);
create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_profile_id_idx on public.notes(profile_id);
create index if not exists notes_next_review_at_idx on public.notes(next_review_at);
create index if not exists notes_created_at_idx on public.notes(created_at desc);

alter table public.profiles enable row level security;
alter table public.notes enable row level security;

drop policy if exists "Users can read own profiles" on public.profiles;
create policy "Users can read own profiles" on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own profiles" on public.profiles;
create policy "Users can insert own profiles" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own profiles" on public.profiles;
create policy "Users can update own profiles" on public.profiles for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own profiles" on public.profiles;
create policy "Users can delete own profiles" on public.profiles for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes" on public.notes for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes" on public.notes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes" on public.notes for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes" on public.notes for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, emoji) values (new.id, '我', '🌱');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.notes;
