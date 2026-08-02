-- 解題小幫手 (SQA) — Supabase Schema
-- 在 Supabase Dashboard → SQL Editor 貼上整段執行一次即可

-- ============================================
-- 1. profiles table（小孩帳號）
-- ============================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🌱',
  created_at timestamptz not null default now(),
  archived boolean not null default false
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);

-- ============================================
-- 2. notes table（錯題）
-- ============================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- 原始欄位
  created_at timestamptz not null default now(),
  stage text not null,
  grade int not null,
  subject_id text not null,
  chapter_id text,  -- 🆕 章節（可選）

  -- 題目
  question_text text not null default '',
  question_image text,  -- base64 dataURL

  -- AI 解答
  ai_solution text not null default '',

  -- 康乃爾
  cues text not null default '',
  notes text not null default '',
  summary text not null default '',
  tags jsonb not null default '[]'::jsonb,
  starred boolean not null default false,

  -- SRS
  review_count int not null default 0,
  interval_days int not null default 0,
  ease_factor double precision not null default 2.5,
  next_review_at timestamptz not null default now(),
  last_result text,
  last_review_at timestamptz,

  -- 客戶端 local id（保留以便對應 IndexedDB 既有資料）
  local_id int
);

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_profile_id_idx on public.notes(profile_id);
create index if not exists notes_next_review_at_idx on public.notes(next_review_at);
create index if not exists notes_created_at_idx on public.notes(created_at desc);

-- ============================================
-- 3. RLS（Row Level Security）— 強制用戶只能看自己的資料
-- ============================================
alter table public.profiles enable row level security;
alter table public.notes enable row level security;

-- profiles：使用者只能 CRUD 自己的
drop policy if exists "Users can read own profiles" on public.profiles;
create policy "Users can read own profiles" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own profiles" on public.profiles;
create policy "Users can insert own profiles" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own profiles" on public.profiles;
create policy "Users can update own profiles" on public.profiles
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own profiles" on public.profiles;
create policy "Users can delete own profiles" on public.profiles
  for delete using (auth.uid() = user_id);

-- notes：使用者只能 CRUD 自己的
drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes" on public.notes
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes" on public.notes
  for delete using (auth.uid() = user_id);

-- ============================================
-- 4. 自動建立「預設 profile」trigger（新用戶註冊時）
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, emoji)
  values (new.id, '我', '🌱');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 5. Realtime（讓前端可以訂閱變更，自動同步）
-- ============================================
-- 確保 supabase_realtime 已加入 realtime publication
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.notes;
