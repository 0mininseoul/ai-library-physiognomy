create or replace function public.delete_expired_sessions()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  deleted_count integer := 0;
begin
  with expired_sessions as materialized (
    select id, face_image_path
    from public.library_sessions
    where expires_at < now()
      or created_at < now() - interval '30 days'
  ),
  deleted_objects as (
    delete from storage.objects
    using expired_sessions
    where storage.objects.bucket_id = 'face-images'
      and storage.objects.name = expired_sessions.face_image_path
    returning storage.objects.id
  ),
  deleted_sessions as (
    delete from public.library_sessions
    using expired_sessions
    where public.library_sessions.id = expired_sessions.id
    returning public.library_sessions.id
  )
  select count(*) into deleted_count
  from deleted_sessions;

  return deleted_count;
end;
$$;
