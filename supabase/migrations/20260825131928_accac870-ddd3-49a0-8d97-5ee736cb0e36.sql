
create type public.app_role as enum ('market_admin', 'store_manager', 'crew');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_number text not null,
  store_name text,
  created_at timestamptz not null default now(),
  unique (organization_id, store_number)
);
grant select, insert, update, delete on public.stores to authenticated;
grant all on public.stores to service_role;
alter table public.stores enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  organization_id uuid references public.organizations(id) on delete set null,
  default_store_id uuid references public.stores(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create table public.user_stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, store_id)
);
grant select, insert, delete on public.user_stores to authenticated;
grant all on public.user_stores to service_role;
alter table public.user_stores enable row level security;

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vendors to authenticated;
grant all on public.vendors to service_role;
alter table public.vendors enable row level security;

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  order_number text not null,
  order_last_four text,
  order_search text,
  delivered_at timestamptz not null default now(),
  status text not null default 'received' check (status in ('received', 'damaged', 'missing_items', 'other_issue')),
  notes text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.deliveries to authenticated;
grant all on public.deliveries to service_role;
alter table public.deliveries enable row level security;

create table public.delivery_photos (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert on public.delivery_photos to authenticated;
grant all on public.delivery_photos to service_role;
alter table public.delivery_photos enable row level security;

create table public.delivery_audit_log (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  action text not null,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
grant select on public.delivery_audit_log to authenticated;
grant all on public.delivery_audit_log to service_role;
alter table public.delivery_audit_log enable row level security;

-- ===================== helper functions (security definer, bypass RLS safely) =====================

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.my_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_store_member(_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_stores where user_id = auth.uid() and store_id = _store_id)
$$;

create or replace function public.can_view_store(_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_store_member(_store_id)
    or (public.has_role(auth.uid(), 'market_admin') and exists (
      select 1 from public.stores s where s.id = _store_id and s.organization_id = public.my_org_id()))
$$;

create or replace function public.can_manage_deliveries(_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (public.has_role(auth.uid(), 'store_manager') and public.is_store_member(_store_id))
    or (public.has_role(auth.uid(), 'market_admin') and exists (
      select 1 from public.stores s where s.id = _store_id and s.organization_id = public.my_org_id()))
$$;

create or replace function public.can_admin_org(_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _org_id is not null and public.has_role(auth.uid(), 'market_admin') and public.my_org_id() = _org_id
$$;

create or replace function public.can_manage_vendors(_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_admin_org(_org_id)
    or (public.has_role(auth.uid(), 'store_manager') and exists (
      select 1 from public.stores s where s.organization_id = _org_id and public.is_store_member(s.id)))
$$;

-- ===================== RLS policies =====================

create policy "org members can view their organization"
  on public.organizations for select to authenticated
  using (id = public.my_org_id());
create policy "signed in users can create an organization"
  on public.organizations for insert to authenticated
  with check (true);
create policy "market admins can update their organization"
  on public.organizations for update to authenticated
  using (public.can_admin_org(id)) with check (public.can_admin_org(id));

create policy "org members can view stores"
  on public.stores for select to authenticated
  using (organization_id = public.my_org_id());
create policy "market admins can create stores"
  on public.stores for insert to authenticated
  with check (public.can_admin_org(organization_id));
create policy "market admins can update stores"
  on public.stores for update to authenticated
  using (public.can_admin_org(organization_id)) with check (public.can_admin_org(organization_id));
create policy "market admins can delete stores"
  on public.stores for delete to authenticated
  using (public.can_admin_org(organization_id));

create policy "users can view own profile and org members"
  on public.profiles for select to authenticated
  using (id = auth.uid() or (organization_id is not null and organization_id = public.my_org_id()));
create policy "users can create their own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "users and org admins can update profiles"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.can_admin_org(organization_id))
  with check (id = auth.uid() or public.can_admin_org(organization_id));

create policy "users can view roles in their org"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = user_id and p.organization_id = public.my_org_id()));
create policy "market admins can grant roles in their org"
  on public.user_roles for insert to authenticated
  with check (exists (
    select 1 from public.profiles p where p.id = user_id and public.can_admin_org(p.organization_id)));
create policy "market admins can revoke roles in their org"
  on public.user_roles for delete to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = user_id and public.can_admin_org(p.organization_id)));

create policy "users can view store assignments in their org"
  on public.user_stores for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = user_id and p.organization_id = public.my_org_id()));
create policy "market admins can assign users to stores"
  on public.user_stores for insert to authenticated
  with check (exists (
    select 1 from public.stores s where s.id = store_id and public.can_admin_org(s.organization_id)));
create policy "market admins can remove store assignments"
  on public.user_stores for delete to authenticated
  using (exists (
    select 1 from public.stores s where s.id = store_id and public.can_admin_org(s.organization_id)));

create policy "org members can view vendors"
  on public.vendors for select to authenticated
  using (organization_id = public.my_org_id());
create policy "managers and admins can add vendors"
  on public.vendors for insert to authenticated
  with check (public.can_manage_vendors(organization_id));
create policy "managers and admins can update vendors"
  on public.vendors for update to authenticated
  using (public.can_manage_vendors(organization_id)) with check (public.can_manage_vendors(organization_id));
create policy "market admins can delete vendors"
  on public.vendors for delete to authenticated
  using (public.can_admin_org(organization_id));

create policy "store members can view deliveries"
  on public.deliveries for select to authenticated
  using (public.can_view_store(store_id));
create policy "store members can add deliveries"
  on public.deliveries for insert to authenticated
  with check (
    public.can_view_store(store_id)
    and organization_id = (select s.organization_id from public.stores s where s.id = store_id)
    and uploaded_by = auth.uid()
  );
create policy "managers and admins can edit deliveries"
  on public.deliveries for update to authenticated
  using (public.can_manage_deliveries(store_id))
  with check (public.can_manage_deliveries(store_id));

create policy "store members can view photos"
  on public.delivery_photos for select to authenticated
  using (exists (
    select 1 from public.deliveries d where d.id = delivery_id and public.can_view_store(d.store_id)));
create policy "store members can add photos"
  on public.delivery_photos for insert to authenticated
  with check (exists (
    select 1 from public.deliveries d where d.id = delivery_id and public.can_view_store(d.store_id)));

create policy "store members can view audit history"
  on public.delivery_audit_log for select to authenticated
  using (exists (
    select 1 from public.deliveries d where d.id = delivery_id and public.can_view_store(d.store_id)));

-- ===================== triggers =====================

create or replace function public.set_delivery_search_fields()
returns trigger language plpgsql set search_path = public as $$
declare
  digits text;
begin
  new.order_search := lower(regexp_replace(coalesce(new.order_number, ''), '[\s-]+', '', 'g'));
  digits := regexp_replace(coalesce(new.order_number, ''), '\D', '', 'g');
  new.order_last_four := case
    when length(digits) >= 4 then right(digits, 4)
    when length(digits) > 0 then digits
    else null end;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end $$;

create trigger deliveries_search_fields
  before insert or update on public.deliveries
  for each row execute function public.set_delivery_search_fields();

create or replace function public.log_delivery_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.delivery_audit_log (delivery_id, changed_by, action, previous_values, new_values)
  values (
    new.id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end $$;

create trigger deliveries_audit
  after insert or update on public.deliveries
  for each row execute function public.log_delivery_change();

create or replace function public.guard_profile_org_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is distinct from old.organization_id then
    if auth.role() = 'authenticated' and not public.can_admin_org(new.organization_id) then
      raise exception 'You are not allowed to change organization membership';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard_org
  before update on public.profiles
  for each row execute function public.guard_profile_org_change();

-- ===================== indexes =====================

create index deliveries_store_date_idx on public.deliveries (store_id, delivered_at desc);
create index deliveries_order_search_idx on public.deliveries (order_search);
create index deliveries_order_last_four_idx on public.deliveries (order_last_four);
create index delivery_photos_delivery_idx on public.delivery_photos (delivery_id);
create index delivery_audit_delivery_idx on public.delivery_audit_log (delivery_id);
create index user_stores_user_idx on public.user_stores (user_id);
create index vendors_org_idx on public.vendors (organization_id);

-- ===================== private photo storage policies =====================

create policy "store members can view delivery photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'delivery-photos' and exists (
      select 1 from public.delivery_photos dp
      join public.deliveries d on d.id = dp.delivery_id
      where dp.storage_path = name and public.can_view_store(d.store_id))
  );

create policy "store members can upload delivery photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'delivery-photos'
    and public.can_view_store(split_part(name, '/', 1)::uuid)
  );

-- ===================== sample data =====================

insert into public.organizations (id, name) values
  ('d0000000-0000-4000-8000-000000000001', 'Demo Restaurant Group');

insert into public.stores (id, organization_id, store_number, store_name) values
  ('d0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000001', '5178', 'Downtown'),
  ('d0000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000001', '5221', 'Westside');

insert into public.vendors (id, organization_id, vendor_name) values
  ('d0000000-0000-4000-8000-000000000201', 'd0000000-0000-4000-8000-000000000001', 'Martin Brower'),
  ('d0000000-0000-4000-8000-000000000202', 'd0000000-0000-4000-8000-000000000001', 'Coca-Cola'),
  ('d0000000-0000-4000-8000-000000000203', 'd0000000-0000-4000-8000-000000000001', 'Sysco'),
  ('d0000000-0000-4000-8000-000000000204', 'd0000000-0000-4000-8000-000000000001', 'US Foods'),
  ('d0000000-0000-4000-8000-000000000205', 'd0000000-0000-4000-8000-000000000001', 'Gordon Food Service');

insert into public.deliveries (organization_id, store_id, vendor_id, order_number, delivered_at, status, notes) values
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000201', '1234', '2026-08-25 09:42:18-04', 'received', null),
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000202', '1234', '2026-08-22 14:15:07-04', 'received', 'Two separate deliveries share this order number'),
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000203', 'MB-00981', '2026-08-24 07:05:44-04', 'missing_items', 'Missing 2 cases of fries'),
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000204', '778812', '2026-08-21 11:58:32-04', 'damaged', 'One box crushed on arrival'),
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000205', '00123', '2026-08-20 08:30:11-04', 'received', null);
