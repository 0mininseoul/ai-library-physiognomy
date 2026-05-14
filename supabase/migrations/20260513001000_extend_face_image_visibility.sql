alter table public.library_sessions
  alter column image_visible_until set default now() + interval '30 days';

update public.library_sessions
set image_visible_until = created_at + interval '30 days'
where image_visible_until < created_at + interval '30 days';

drop policy if exists "anon can insert sessions" on public.library_sessions;
create policy "anon can insert sessions" on public.library_sessions
  for insert to anon
  with check (
    status = 'queued'
    and created_at >= now() - interval '5 minutes'
    and created_at <= now() + interval '1 minute'
    and image_visible_until <= created_at + interval '30 days' + interval '1 minute'
    and expires_at <= created_at + interval '30 days' + interval '1 minute'
    and face_image_path is null
    and landmarks_json is null
    and metrics_json is null
    and reading_type_code is null
    and result_json is null
    and recommended_book_ids = '{}'::uuid[]
    and last_error is null
  );

create or replace function public.delete_expired_face_images()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cleared_count integer := 0;
begin
  update public.library_sessions
  set face_image_path = null
  where face_image_path is not null
    and created_at < now() - interval '30 days';

  get diagnostics cleared_count = row_count;
  return cleared_count;
end;
$$;

create or replace function public.delete_expired_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  delete from public.library_sessions
  where expires_at < now()
    or created_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
