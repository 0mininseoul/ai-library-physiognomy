create or replace function public.delete_expired_face_images()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer := 0;
begin
  update public.library_sessions
  set face_image_path = null
  where face_image_path is not null
    and created_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.delete_expired_sessions()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer := 0;
begin
  delete from public.library_sessions
  where expires_at < now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
