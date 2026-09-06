revoke execute on function public.onboard_my_organization(text, text, text, text, boolean)
  from authenticated;

revoke execute on function public.is_company_admin(uuid) from public, anon;
revoke execute on function public.can_access_market(uuid) from public, anon;
revoke execute on function public.can_manage_market_structure(uuid) from public, anon;
revoke execute on function public.can_view_profile(uuid) from public, anon;
revoke execute on function public.log_organization_structure_change() from public, anon, authenticated;

grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.can_access_market(uuid) to authenticated;
grant execute on function public.can_manage_market_structure(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;

