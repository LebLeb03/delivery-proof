-- Security boundary for the delivery-only production launch.
-- Company administrators control access. Operations managers are market scoped.
-- Consultants only see stores explicitly assigned through user_stores.

create or replace function public.can_admin_org(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _org_id is not null
    and public.my_org_id() = _org_id
    and public.is_company_admin()
$$;

create or replace function public.can_manage_market_structure(_market_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_company_admin()
    or (
      public.has_role(auth.uid(), 'operations_manager')
      and exists (
        select 1
        from public.user_markets um
        join public.markets m on m.id = um.market_id
        where um.user_id = auth.uid()
          and um.market_id = _market_id
          and m.organization_id = public.my_org_id()
      )
    )
$$;

create or replace function public.can_view_store(_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = _store_id
      and s.organization_id = public.my_org_id()
      and (
        public.is_company_admin()
        or exists (
          select 1
          from public.user_stores us
          where us.user_id = auth.uid() and us.store_id = s.id
        )
        or (
          public.has_role(auth.uid(), 'operations_manager')
          and exists (
            select 1
            from public.patches p
            join public.user_markets um on um.market_id = p.market_id
            where p.id = s.patch_id and um.user_id = auth.uid()
          )
        )
      )
  )
$$;

drop policy if exists "users can create their own profile" on public.profiles;
create policy "users can create an unassigned profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid() and organization_id is null and default_store_id is null);

drop policy if exists "users and org admins can update profiles" on public.profiles;
create policy "users and org admins can update profiles"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.can_admin_org(organization_id))
  with check (
    public.can_admin_org(organization_id)
    or (
      id = auth.uid()
      and organization_id = public.my_org_id()
      and (default_store_id is null or public.can_view_store(default_store_id))
    )
  );

drop policy if exists "store members can add photos" on public.delivery_photos;
create policy "store members can add their own photos"
  on public.delivery_photos for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.deliveries d
      where d.id = delivery_id and public.can_view_store(d.store_id)
    )
  );

create or replace function public.protect_delivery_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.store_id is distinct from old.store_id
    or new.uploaded_by is distinct from old.uploaded_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Delivery ownership and store fields cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_delivery_identity on public.deliveries;
create trigger protect_delivery_identity
before update on public.deliveries
for each row execute function public.protect_delivery_identity();

revoke execute on function public.protect_delivery_identity() from public, anon, authenticated;

create or replace function public.create_market_for_my_organization(_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  market_uuid uuid;
  org_id uuid := public.my_org_id();
begin
  if org_id is null or not (
    public.is_company_admin()
    or public.has_role(auth.uid(), 'operations_manager')
  ) then
    raise exception 'Company administrator or operations manager access required';
  end if;
  insert into public.markets (organization_id, name)
    values (org_id, trim(_name)) returning id into market_uuid;
  if not public.is_company_admin() then
    insert into public.user_markets (user_id, market_id)
      values (auth.uid(), market_uuid);
  end if;
  return market_uuid;
end;
$$;

revoke execute on function public.create_market_for_my_organization(text) from public, anon;
grant execute on function public.create_market_for_my_organization(text) to authenticated;

