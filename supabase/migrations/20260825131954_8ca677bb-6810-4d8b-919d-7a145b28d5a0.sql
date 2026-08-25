
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.my_org_id() from public, anon;
revoke execute on function public.is_store_member(uuid) from public, anon;
revoke execute on function public.can_view_store(uuid) from public, anon;
revoke execute on function public.can_manage_deliveries(uuid) from public, anon;
revoke execute on function public.can_admin_org(uuid) from public, anon;
revoke execute on function public.can_manage_vendors(uuid) from public, anon;
revoke execute on function public.log_delivery_change() from public, anon, authenticated;
revoke execute on function public.guard_profile_org_change() from public, anon, authenticated;
revoke execute on function public.set_delivery_search_fields() from public, anon;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.my_org_id() to authenticated;
grant execute on function public.is_store_member(uuid) to authenticated;
grant execute on function public.can_view_store(uuid) to authenticated;
grant execute on function public.can_manage_deliveries(uuid) to authenticated;
grant execute on function public.can_admin_org(uuid) to authenticated;
grant execute on function public.can_manage_vendors(uuid) to authenticated;
