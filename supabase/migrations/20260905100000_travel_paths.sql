create table public.travel_path_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.travel_path_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.travel_path_templates(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  instructions text,
  photo_required boolean not null default true,
  sort_order integer not null default 0
);

create table public.travel_path_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid references public.travel_path_templates(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  template_name text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'ready_for_review', 'operational', 'needs_attention')),
  started_by uuid references public.profiles(id) on delete set null,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.travel_path_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.travel_path_runs(id) on delete cascade,
  template_item_id uuid references public.travel_path_template_items(id) on delete set null,
  title text not null,
  instructions text,
  photo_required boolean not null default true,
  sort_order integer not null default 0,
  completed boolean not null default false,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  notes text
);

create table public.travel_path_photos (
  id uuid primary key default gen_random_uuid(),
  run_item_id uuid not null references public.travel_path_run_items(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.travel_path_templates, public.travel_path_template_items to authenticated;
grant select, insert, update on public.travel_path_runs, public.travel_path_run_items, public.travel_path_photos to authenticated;
grant all on public.travel_path_templates, public.travel_path_template_items, public.travel_path_runs, public.travel_path_run_items, public.travel_path_photos to service_role;

alter table public.travel_path_templates enable row level security;
alter table public.travel_path_template_items enable row level security;
alter table public.travel_path_runs enable row level security;
alter table public.travel_path_run_items enable row level security;
alter table public.travel_path_photos enable row level security;

create policy "org members can view travel path templates" on public.travel_path_templates for select to authenticated using (organization_id = public.my_org_id());
create policy "admins can manage travel path templates" on public.travel_path_templates for all to authenticated using (public.can_admin_org(organization_id)) with check (public.can_admin_org(organization_id));
create policy "org members can view travel path template items" on public.travel_path_template_items for select to authenticated using (exists (select 1 from public.travel_path_templates t where t.id = template_id and t.organization_id = public.my_org_id()));
create policy "admins can manage travel path template items" on public.travel_path_template_items for all to authenticated using (exists (select 1 from public.travel_path_templates t where t.id = template_id and public.can_admin_org(t.organization_id))) with check (exists (select 1 from public.travel_path_templates t where t.id = template_id and public.can_admin_org(t.organization_id)));
create policy "store members can view travel path runs" on public.travel_path_runs for select to authenticated using (public.can_view_store(store_id));
create policy "store members can start travel path runs" on public.travel_path_runs for insert to authenticated with check (public.can_view_store(store_id) and organization_id = public.my_org_id() and started_by = auth.uid());
create policy "store members can update travel path runs" on public.travel_path_runs for update to authenticated using (public.can_view_store(store_id)) with check (public.can_view_store(store_id));
create policy "store members can view travel path run items" on public.travel_path_run_items for select to authenticated using (exists (select 1 from public.travel_path_runs r where r.id = run_id and public.can_view_store(r.store_id)));
create policy "store members can add travel path run items" on public.travel_path_run_items for insert to authenticated with check (exists (select 1 from public.travel_path_runs r where r.id = run_id and public.can_view_store(r.store_id)));
create policy "store members can update travel path run items" on public.travel_path_run_items for update to authenticated using (exists (select 1 from public.travel_path_runs r where r.id = run_id and public.can_view_store(r.store_id))) with check (exists (select 1 from public.travel_path_runs r where r.id = run_id and public.can_view_store(r.store_id)));
create policy "store members can view travel path photos" on public.travel_path_photos for select to authenticated using (exists (select 1 from public.travel_path_run_items i join public.travel_path_runs r on r.id = i.run_id where i.id = run_item_id and public.can_view_store(r.store_id)));
create policy "store members can add travel path photos" on public.travel_path_photos for insert to authenticated with check (uploaded_by = auth.uid() and exists (select 1 from public.travel_path_run_items i join public.travel_path_runs r on r.id = i.run_id where i.id = run_item_id and public.can_view_store(r.store_id)));

create or replace function public.travel_paths_touch_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at := now(); return new; end $$;
create trigger travel_path_templates_updated before update on public.travel_path_templates for each row execute function public.travel_paths_touch_updated_at();
create trigger travel_path_runs_updated before update on public.travel_path_runs for each row execute function public.travel_paths_touch_updated_at();

create index travel_path_templates_org_idx on public.travel_path_templates(organization_id, active);
create index travel_path_runs_store_date_idx on public.travel_path_runs(store_id, created_at desc);
create index travel_path_run_items_run_idx on public.travel_path_run_items(run_id, sort_order);
create index travel_path_photos_item_idx on public.travel_path_photos(run_item_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('travel-path-photos', 'travel-path-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "store members can upload travel path photos" on storage.objects for insert to authenticated with check (bucket_id = 'travel-path-photos' and public.can_view_store(((storage.foldername(name))[1])::uuid));
create policy "store members can read travel path photos" on storage.objects for select to authenticated using (bucket_id = 'travel-path-photos' and public.can_view_store(((storage.foldername(name))[1])::uuid));
