create table public.markets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.patches (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  store_capacity integer not null check (store_capacity between 1 and 100),
  created_at timestamptz not null default now(),
  unique (market_id, name)
);

alter table public.stores add column patch_id uuid references public.patches(id) on delete set null;

create table public.user_markets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, market_id)
);

create table public.organization_join_codes (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  code text not null unique check (char_length(code) between 8 and 40),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.organization_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.markets, public.patches, public.user_markets to authenticated;
grant select, insert, update, delete on public.organization_join_codes to authenticated;
grant select on public.organization_audit_log to authenticated;
grant all on public.markets, public.patches, public.user_markets, public.organization_join_codes, public.organization_audit_log to service_role;

alter table public.markets enable row level security;
alter table public.patches enable row level security;
alter table public.user_markets enable row level security;
alter table public.organization_join_codes enable row level security;
alter table public.organization_audit_log enable row level security;

create or replace function public.is_company_admin(_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'company_admin') or public.has_role(_user_id, 'market_admin')
$$;

create or replace function public.can_access_market(_market_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.markets m
    where m.id = _market_id and m.organization_id = public.my_org_id()
      and (
        public.is_company_admin()
        or exists (
          select 1 from public.user_markets um
          where um.user_id = auth.uid() and um.market_id = m.id
        )
        or exists (
          select 1 from public.stores s
          join public.user_stores us on us.store_id = s.id
          join public.patches p on p.id = s.patch_id
          where us.user_id = auth.uid() and p.market_id = m.id
        )
      )
  )
$$;

create or replace function public.can_manage_market_structure(_market_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (
    public.has_role(auth.uid(), 'consultant')
    or public.has_role(auth.uid(), 'operations_manager')
  ) and exists (
    select 1 from public.user_markets um
    join public.markets m on m.id = um.market_id
    where um.user_id = auth.uid() and um.market_id = _market_id
      and m.organization_id = public.my_org_id()
  )
$$;

create or replace function public.can_view_store(_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.stores s
    where s.id = _store_id and s.organization_id = public.my_org_id()
      and (
        public.is_company_admin()
        or exists (
          select 1 from public.user_stores us
          where us.user_id = auth.uid() and us.store_id = s.id
        )
        or (
          (public.has_role(auth.uid(), 'consultant') or public.has_role(auth.uid(), 'operations_manager'))
          and exists (
            select 1 from public.patches p
            join public.user_markets um on um.market_id = p.market_id
            where p.id = s.patch_id and um.user_id = auth.uid()
          )
        )
      )
  )
$$;

create or replace function public.can_manage_deliveries(_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_view_store(_store_id) and (
    public.has_role(auth.uid(), 'consultant')
    or public.has_role(auth.uid(), 'operations_manager')
    or public.has_role(auth.uid(), 'delivery_manager')
    or public.has_role(auth.uid(), 'general_manager')
    or public.has_role(auth.uid(), 'store_manager')
    or public.has_role(auth.uid(), 'market_admin')
  )
$$;

create or replace function public.can_admin_org(_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _org_id is not null and public.my_org_id() = _org_id and (
    public.is_company_admin() or public.has_role(auth.uid(), 'consultant')
  )
$$;

create or replace function public.can_manage_vendors(_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_admin_org(_org_id) or exists (
    select 1 from public.markets m
    where m.organization_id = _org_id and public.can_manage_market_structure(m.id)
  )
$$;

create or replace function public.can_view_profile(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _user_id = auth.uid() or exists (
    select 1 from public.profiles target
    where target.id = _user_id and target.organization_id = public.my_org_id()
      and (
        public.is_company_admin()
        or exists (
          select 1 from public.user_stores mine
          join public.user_stores theirs on theirs.store_id = mine.store_id
          where mine.user_id = auth.uid() and theirs.user_id = _user_id
        )
        or exists (
          select 1 from public.user_stores theirs
          join public.stores s on s.id = theirs.store_id
          join public.patches p on p.id = s.patch_id
          join public.user_markets mine on mine.market_id = p.market_id
          where mine.user_id = auth.uid() and theirs.user_id = _user_id
        )
      )
  )
$$;

drop policy if exists "org members can view stores" on public.stores;
create policy "scoped users can view stores" on public.stores for select to authenticated
  using (public.can_view_store(id));

drop policy if exists "market admins can create stores" on public.stores;
drop policy if exists "market admins can update stores" on public.stores;
drop policy if exists "market admins can delete stores" on public.stores;
create policy "structure managers can create stores" on public.stores for insert to authenticated
  with check (patch_id is not null and exists (
    select 1 from public.patches p where p.id = patch_id and public.can_manage_market_structure(p.market_id)
  ));
create policy "structure managers can update stores" on public.stores for update to authenticated
  using (patch_id is not null and exists (
    select 1 from public.patches p where p.id = patch_id and public.can_manage_market_structure(p.market_id)
  ))
  with check (patch_id is not null and exists (
    select 1 from public.patches p where p.id = patch_id and public.can_manage_market_structure(p.market_id)
  ));
create policy "structure managers can delete stores" on public.stores for delete to authenticated
  using (patch_id is not null and exists (
    select 1 from public.patches p where p.id = patch_id and public.can_manage_market_structure(p.market_id)
  ));

drop policy if exists "users can view own profile and org members" on public.profiles;
create policy "users can view permitted profiles" on public.profiles for select to authenticated
  using (public.can_view_profile(id));

drop policy if exists "users can view roles in their org" on public.user_roles;
create policy "users and company admins can view roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = user_id and public.can_admin_org(p.organization_id)
  ));

drop policy if exists "users can view store assignments in their org" on public.user_stores;
create policy "users and company admins can view store assignments" on public.user_stores for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = user_id and public.can_admin_org(p.organization_id)
  ));

create policy "users can view permitted markets" on public.markets for select to authenticated
  using (public.can_access_market(id));
create policy "consultants and operations managers can create markets" on public.markets for insert to authenticated
  with check (organization_id = public.my_org_id() and (
    public.has_role(auth.uid(), 'consultant') or public.has_role(auth.uid(), 'operations_manager')
  ));
create policy "consultants and operations managers can update markets" on public.markets for update to authenticated
  using (public.can_manage_market_structure(id)) with check (public.can_manage_market_structure(id));

create policy "users can view permitted patches" on public.patches for select to authenticated
  using (public.can_access_market(market_id));
create policy "consultants and operations managers can create patches" on public.patches for insert to authenticated
  with check (public.can_manage_market_structure(market_id));
create policy "consultants and operations managers can update patches" on public.patches for update to authenticated
  using (public.can_manage_market_structure(market_id)) with check (public.can_manage_market_structure(market_id));
create policy "consultants and operations managers can delete patches" on public.patches for delete to authenticated
  using (public.can_manage_market_structure(market_id));

create policy "users and company admins can view market assignments" on public.user_markets for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = user_id and public.can_admin_org(p.organization_id)
  ));
create policy "company admins can create market assignments" on public.user_markets for insert to authenticated
  with check (exists (
    select 1 from public.markets m where m.id = market_id and public.can_admin_org(m.organization_id)
  ));
create policy "company admins can remove market assignments" on public.user_markets for delete to authenticated
  using (exists (
    select 1 from public.markets m where m.id = market_id and public.can_admin_org(m.organization_id)
  ));

create policy "company admins can view join codes" on public.organization_join_codes for select to authenticated
  using (public.can_admin_org(organization_id));
create policy "company admins can manage join codes" on public.organization_join_codes for all to authenticated
  using (public.can_admin_org(organization_id)) with check (public.can_admin_org(organization_id));

create policy "company admins can view organization audit" on public.organization_audit_log for select to authenticated
  using (public.can_admin_org(organization_id));

create or replace function public.join_organization_by_code(_code text, _full_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  org_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select organization_id into org_id from public.organization_join_codes
    where code = upper(trim(_code)) and active;
  if org_id is null then raise exception 'That organization code is not valid'; end if;
  if exists (select 1 from public.profiles where id = uid and organization_id is not null) then
    raise exception 'This account already belongs to an organization';
  end if;
  delete from public.profiles where id = uid and organization_id is null;
  insert into public.profiles (id, email, full_name, organization_id)
    values (uid, auth.jwt()->>'email', nullif(trim(_full_name), ''), org_id);
  insert into public.user_roles (user_id, role) values (uid, 'crew')
    on conflict (user_id, role) do nothing;
  insert into public.organization_audit_log (organization_id, changed_by, action, entity_type, entity_id, new_values)
    values (org_id, uid, 'joined_with_code', 'profile', uid, jsonb_build_object('email', auth.jwt()->>'email'));
  return org_id;
end $$;

revoke execute on function public.join_organization_by_code(text, text) from public, anon;
grant execute on function public.join_organization_by_code(text, text) to authenticated;

create or replace function public.set_user_access(
  _user_id uuid,
  _role public.app_role,
  _store_ids uuid[] default array[]::uuid[],
  _market_ids uuid[] default array[]::uuid[]
) returns void language plpgsql security definer set search_path = public as $$
declare
  target_org uuid;
begin
  select organization_id into target_org from public.profiles where id = _user_id;
  if target_org is null or not public.can_admin_org(target_org) then
    raise exception 'Company administrator access required';
  end if;
  if _role in ('consultant', 'operations_manager') and cardinality(_market_ids) = 0 then
    raise exception 'Select at least one market';
  end if;
  if _role in ('delivery_manager', 'general_manager', 'crew') and cardinality(_store_ids) = 0 then
    raise exception 'Select at least one store';
  end if;
  if exists (
    select 1 from public.stores s where s.id = any(_store_ids) and s.organization_id <> target_org
  ) or exists (
    select 1 from public.markets m where m.id = any(_market_ids) and m.organization_id <> target_org
  ) then
    raise exception 'Assignments must belong to the user organization';
  end if;
  delete from public.user_roles where user_id = _user_id;
  delete from public.user_stores where user_id = _user_id;
  delete from public.user_markets where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, _role);
  if cardinality(_store_ids) > 0 then
    insert into public.user_stores (user_id, store_id)
      select _user_id, unnest(_store_ids);
    update public.profiles set default_store_id = _store_ids[1] where id = _user_id;
  else
    update public.profiles set default_store_id = null where id = _user_id;
  end if;
  if cardinality(_market_ids) > 0 then
    insert into public.user_markets (user_id, market_id)
      select _user_id, unnest(_market_ids);
  end if;
  insert into public.organization_audit_log
    (organization_id, changed_by, action, entity_type, entity_id, new_values)
  values (
    target_org,
    auth.uid(),
    'access_updated',
    'profile',
    _user_id,
    jsonb_build_object('role', _role, 'store_ids', _store_ids, 'market_ids', _market_ids)
  );
end $$;

revoke execute on function public.set_user_access(uuid, public.app_role, uuid[], uuid[]) from public, anon;
grant execute on function public.set_user_access(uuid, public.app_role, uuid[], uuid[]) to authenticated;

create or replace function public.create_market_for_my_organization(_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  market_uuid uuid;
  org_id uuid := public.my_org_id();
begin
  if org_id is null or not (
    public.has_role(auth.uid(), 'consultant') or public.has_role(auth.uid(), 'operations_manager')
  ) then
    raise exception 'Consultant or operations manager access required';
  end if;
  insert into public.markets (organization_id, name)
    values (org_id, trim(_name)) returning id into market_uuid;
  insert into public.user_markets (user_id, market_id) values (auth.uid(), market_uuid);
  return market_uuid;
end $$;

revoke execute on function public.create_market_for_my_organization(text) from public, anon;
grant execute on function public.create_market_for_my_organization(text) to authenticated;

create or replace function public.log_organization_structure_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  org_id uuid;
  row_id uuid;
begin
  if tg_op = 'DELETE' then row_id := old.id; else row_id := new.id; end if;
  if tg_table_name = 'markets' then
    org_id := coalesce(new.organization_id, old.organization_id);
  elsif tg_table_name = 'patches' then
    select m.organization_id into org_id from public.markets m
      where m.id = coalesce(new.market_id, old.market_id);
  else
    org_id := coalesce(new.organization_id, old.organization_id);
  end if;
  insert into public.organization_audit_log
    (organization_id, changed_by, action, entity_type, entity_id, previous_values, new_values)
  values (
    org_id,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    row_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger markets_audit after insert or update or delete on public.markets
  for each row execute function public.log_organization_structure_change();
create trigger patches_audit after insert or update or delete on public.patches
  for each row execute function public.log_organization_structure_change();
create trigger stores_structure_audit after insert or update or delete on public.stores
  for each row execute function public.log_organization_structure_change();

create index markets_org_idx on public.markets(organization_id);
create index patches_market_idx on public.patches(market_id);
create index stores_patch_idx on public.stores(patch_id);
create index user_markets_user_idx on public.user_markets(user_id);
create index organization_audit_org_date_idx on public.organization_audit_log(organization_id, created_at desc);

do $$
declare
  target_org uuid;
  market_uuid uuid;
  rozie_uuid uuid;
  rymal_store uuid;
  caleb_user uuid;
  rymal_user uuid;
begin
  select p.organization_id, p.id into target_org, rymal_user
  from public.profiles p
  where lower(p.email) = '5178@post.mcdonalds.ca'
  limit 1;
  select p.id into caleb_user from public.profiles p
  where lower(p.email) = 'calebnolet@outlook.com'
  limit 1;
  if target_org is not null then
    update public.organizations set name = 'McDonalds' where id = target_org;
    insert into public.markets (organization_id, name) values (target_org, 'Ontario West')
      on conflict (organization_id, name) do update set name = excluded.name
      returning id into market_uuid;
    insert into public.patches (market_id, name, store_capacity) values
      (market_uuid, 'Ankit''s Patch', 5),
      (market_uuid, 'Vennessa''s Patch', 6),
      (market_uuid, 'Tharchika''s Patch', 6),
      (market_uuid, 'Rozie''s Patch', 3)
      on conflict (market_id, name) do update set store_capacity = excluded.store_capacity;
    select id into rozie_uuid from public.patches
      where market_id = market_uuid and name = 'Rozie''s Patch';
    select id into rymal_store from public.stores
      where organization_id = target_org and store_number = '5178' limit 1;
    update public.stores set patch_id = rozie_uuid where id = rymal_store;

    if rymal_user is not null then
      delete from public.user_roles where user_id = rymal_user;
      delete from public.user_markets where user_id = rymal_user;
      insert into public.user_roles (user_id, role) values (rymal_user, 'general_manager');
      insert into public.user_stores (user_id, store_id) values (rymal_user, rymal_store)
        on conflict (user_id, store_id) do nothing;
      update public.profiles set default_store_id = rymal_store where id = rymal_user;
    end if;

    if caleb_user is not null then
      delete from public.user_roles where user_id = caleb_user;
      delete from public.user_stores where user_id = caleb_user;
      delete from public.user_markets where user_id = caleb_user;
      update public.profiles
        set organization_id = target_org, default_store_id = rymal_store
        where id = caleb_user;
      insert into public.user_roles (user_id, role) values (caleb_user, 'consultant');
      insert into public.user_markets (user_id, market_id) values (caleb_user, market_uuid);
    end if;
  end if;
end $$;

insert into public.organization_join_codes (organization_id, code)
select id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
from public.organizations
on conflict (organization_id) do nothing;
