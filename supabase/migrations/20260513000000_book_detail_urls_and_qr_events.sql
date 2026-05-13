alter table public.books
  add column if not exists detail_url text;

create index if not exists service_events_event_name_created_at_idx
  on public.service_events (event_name, created_at);
