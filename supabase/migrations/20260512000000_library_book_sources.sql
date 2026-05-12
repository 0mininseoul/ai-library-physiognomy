-- Add Gachon library source labels and on-shelf metadata
alter table public.books
  add column if not exists source_label text,
  add column if not exists location_room text,
  add column if not exists availability text;

create index if not exists books_source_label_idx on public.books (source_label) where active;
create index if not exists books_active_idx on public.books (active) where active;

-- Track student "what I need right now" 4-choice for analytics and recommendation
alter table public.library_sessions
  add column if not exists need_focus text;
