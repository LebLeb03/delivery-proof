create or replace function public.onboard_my_organization(
  _organization_name text,
  _store_number text,
  _store_name text default null,
  _full_name text default null,
  _include_sample_data boolean default true
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  org_id uuid;
  store_id uuid;
  vendor_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.profiles where id = uid and organization_id is not null) then
    raise exception 'This account already belongs to an organization';
  end if;

  insert into public.organizations (name) values (trim(_organization_name)) returning id into org_id;
  insert into public.user_roles (user_id, role) values (uid, 'market_admin')
    on conflict (user_id, role) do nothing;
  delete from public.profiles where id = uid;
  insert into public.profiles (id, email, full_name, organization_id)
    values (uid, auth.jwt()->>'email', nullif(trim(_full_name), ''), org_id);
  insert into public.stores (organization_id, store_number, store_name)
    values (org_id, trim(_store_number), nullif(trim(_store_name), '')) returning id into store_id;
  insert into public.user_stores (user_id, store_id) values (uid, store_id);
  update public.profiles set default_store_id = store_id where id = uid;

  insert into public.vendors (organization_id, vendor_name) values
    (org_id, 'Uber'), (org_id, 'SkipTheDishes'), (org_id, 'DoorDash');

  if _include_sample_data then
    select id into vendor_id from public.vendors where organization_id = org_id order by vendor_name limit 1;
    insert into public.deliveries
      (organization_id, store_id, vendor_id, order_number, delivered_at, status, notes, uploaded_by)
    values
      (org_id, store_id, vendor_id, 'DEMO-1234', now() - interval '1 hour', 'received',
       'Sample record — add a real delivery whenever you are ready.', uid);
  end if;
  return org_id;
end;
$$;

revoke execute on function public.onboard_my_organization(text, text, text, text, boolean) from public, anon;
grant execute on function public.onboard_my_organization(text, text, text, text, boolean) to authenticated;
