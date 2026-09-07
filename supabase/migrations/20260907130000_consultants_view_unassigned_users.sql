create or replace function public.can_view_profile(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user_id = auth.uid() or exists (
    select 1
    from public.profiles target
    where target.id = _user_id
      and target.organization_id = public.my_org_id()
      and (
        public.can_admin_org(target.organization_id)
        or exists (
          select 1
          from public.user_stores mine
          join public.user_stores theirs on theirs.store_id = mine.store_id
          where mine.user_id = auth.uid()
            and theirs.user_id = _user_id
        )
        or exists (
          select 1
          from public.user_stores theirs
          join public.stores store on store.id = theirs.store_id
          join public.patches patch on patch.id = store.patch_id
          join public.user_markets mine on mine.market_id = patch.market_id
          where mine.user_id = auth.uid()
            and theirs.user_id = _user_id
        )
      )
  )
$$;

revoke execute on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;
