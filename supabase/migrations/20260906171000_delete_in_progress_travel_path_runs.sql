create or replace function public.can_delete_travel_path_run(_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.travel_path_runs run
    where run.id = _run_id
      and run.status = 'in_progress'
      and public.can_view_store(run.store_id)
      and (
        run.started_by = auth.uid()
        or public.can_manage_deliveries(run.store_id)
      )
  )
$$;

revoke execute on function public.can_delete_travel_path_run(uuid) from public, anon;
grant execute on function public.can_delete_travel_path_run(uuid) to authenticated;

grant delete on public.travel_path_runs to authenticated;

drop policy if exists "users can delete unsubmitted travel path runs" on public.travel_path_runs;
create policy "users can delete unsubmitted travel path runs"
  on public.travel_path_runs
  for delete
  to authenticated
  using (public.can_delete_travel_path_run(id));

drop policy if exists "users can delete photos from unsubmitted travel paths" on storage.objects;
create policy "users can delete photos from unsubmitted travel paths"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'travel-path-photos'
    and exists (
      select 1
      from public.travel_path_photos photo
      join public.travel_path_run_items item on item.id = photo.run_item_id
      where photo.storage_path = name
        and public.can_delete_travel_path_run(item.run_id)
    )
  );
