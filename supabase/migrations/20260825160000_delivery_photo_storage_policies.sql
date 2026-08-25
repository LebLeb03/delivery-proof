drop policy if exists "store members can upload delivery photos" on storage.objects;
create policy "store members can upload delivery photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'delivery-photos'
    and public.can_view_store(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "store members can read delivery photos" on storage.objects;
create policy "store members can read delivery photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'delivery-photos'
    and public.can_view_store(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "managers can delete delivery photos" on storage.objects;
create policy "managers can delete delivery photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'delivery-photos'
    and public.can_manage_deliveries(((storage.foldername(name))[1])::uuid)
  );
