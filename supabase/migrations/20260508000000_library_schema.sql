create extension if not exists "pgcrypto";

create table if not exists public.library_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  image_visible_until timestamptz not null default now() + interval '24 hours',
  expires_at timestamptz not null default now() + interval '30 days',
  status text not null default 'queued' check (status in ('queued', 'analyzing', 'complete', 'failed')),
  name text not null,
  display_name text not null,
  student_id text not null,
  student_id_lookup_hash text not null,
  gender text not null check (gender in ('male', 'female')),
  birth_date date not null,
  favorite_category text not null,
  face_image_path text,
  landmarks_json jsonb,
  metrics_json jsonb,
  reading_type_code text,
  result_json jsonb,
  recommended_book_ids uuid[] not null default '{}'::uuid[],
  last_error text,
  user_agent text,
  ip_hash text
);

create index if not exists library_sessions_created_at_idx on public.library_sessions (created_at);
create index if not exists library_sessions_expires_at_idx on public.library_sessions (expires_at);
create index if not exists library_sessions_lookup_idx on public.library_sessions (student_id_lookup_hash, birth_date, expires_at);
create index if not exists library_sessions_status_idx on public.library_sessions (status);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'data4library',
  source_id text not null,
  isbn13 text,
  title text not null,
  author text not null default '',
  publisher text not null default '',
  published_year integer,
  category text not null,
  description text not null default '',
  cover_url text,
  call_number text not null,
  location_label text not null,
  tags text[] not null default '{}'::text[],
  active boolean not null default true,
  unique (source, source_id)
);

create index if not exists books_category_idx on public.books (category);
create index if not exists books_tags_gin_idx on public.books using gin (tags);
create index if not exists books_active_idx on public.books (active);

create table if not exists public.service_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid,
  event_name text not null,
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists service_events_created_at_idx on public.service_events (created_at);
create index if not exists service_events_session_id_idx on public.service_events (session_id);

alter table public.library_sessions enable row level security;
alter table public.books enable row level security;
alter table public.service_events enable row level security;

drop policy if exists "anon can insert sessions" on public.library_sessions;
create policy "anon can insert sessions" on public.library_sessions
  for insert to anon
  with check (true);

drop policy if exists "anon can select active books" on public.books;
create policy "anon can select active books"
  on public.books
  for select to anon
  using (active = true);

insert into storage.buckets (id, name, public)
values ('face-images', 'face-images', false)
on conflict (id) do nothing;
