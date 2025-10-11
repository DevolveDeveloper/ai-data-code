 -- Enable required extension for UUIDs
create extension if not exists "pgcrypto";

-- 1) Role enum for org memberships
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin','pm','annotator','reviewer','client_viewer');
  end if;
end $$;

-- 2) Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_self_select" on public.profiles
for select using (id = auth.uid());

create policy "profiles_self_upsert" on public.profiles
for insert with check (id = auth.uid());

create policy "profiles_self_update" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- 3) Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- Memberships
create table if not exists public.org_memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null default 'admin',
  added_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
alter table public.org_memberships enable row level security;

-- Auto-add creator as org admin on insert
create or replace function public.fn_add_creator_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_memberships (org_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_org_creator_is_admin on public.organizations;
create trigger trg_org_creator_is_admin
after insert on public.organizations
for each row execute function public.fn_add_creator_membership();

-- Quick helper view (optional)
create or replace view public.v_my_orgs as
select m.org_id
from public.org_memberships m
where m.user_id = auth.uid();

-- Policies: organizations
create policy "orgs_select_member_only" on public.organizations
for select using (exists (
  select 1 from public.org_memberships m
  where m.org_id = organizations.id and m.user_id = auth.uid()
));

create policy "orgs_insert_authenticated" on public.organizations
for insert with check (auth.role() = 'authenticated' and created_by = auth.uid());

create policy "orgs_update_admin_only" on public.organizations
for update using (exists (
  select 1 from public.org_memberships m
  where m.org_id = organizations.id and m.user_id = auth.uid() and m.role = 'admin'
))
with check (exists (
  select 1 from public.org_memberships m
  where m.org_id = organizations.id and m.user_id = auth.uid() and m.role = 'admin'
));

create policy "orgs_delete_admin_only" on public.organizations
for delete using (exists (
  select 1 from public.org_memberships m
  where m.org_id = organizations.id and m.user_id = auth.uid() and m.role = 'admin'
));

-- Policies: org_memberships
create policy "mships_select_members_only" on public.org_memberships
for select using (exists (
  select 1 from public.org_memberships m2
  where m2.org_id = org_memberships.org_id and m2.user_id = auth.uid()
));

create policy "mships_insert_admin_only" on public.org_memberships
for insert with check (exists (
  select 1 from public.org_memberships m2
  where m2.org_id = org_memberships.org_id and m2.user_id = auth.uid() and m2.role = 'admin'
));

create policy "mships_update_admin_only" on public.org_memberships
for update using (exists (
  select 1 from public.org_memberships m2
  where m2.org_id = org_memberships.org_id and m2.user_id = auth.uid() and m2.role = 'admin'
))
with check (exists (
  select 1 from public.org_memberships m2
  where m2.org_id = org_memberships.org_id and m2.user_id = auth.uid() and m2.role = 'admin'
));

create policy "mships_delete_admin_only" on public.org_memberships
for delete using (exists (
  select 1 from public.org_memberships m2
  where m2.org_id = org_memberships.org_id and m2.user_id = auth.uid() and m2.role = 'admin'
));

-- 4) Projects (scoped to org)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  pii_level text not null default 'low' check (pii_level in ('none','low','medium','high')),
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_projects_org on public.projects(org_id);
alter table public.projects enable row level security;

create policy "projects_select_member_only" on public.projects
for select using (exists (
  select 1 from public.org_memberships m
  where m.org_id = projects.org_id and m.user_id = auth.uid()
));

create policy "projects_insert_pm_admin" on public.projects
for insert with check (exists (
  select 1 from public.org_memberships m
  where m.org_id = projects.org_id and m.user_id = auth.uid() and m.role in ('admin','pm')
));

create policy "projects_update_pm_admin" on public.projects
for update using (exists (
  select 1 from public.org_memberships m
  where m.org_id = projects.org_id and m.user_id = auth.uid() and m.role in ('admin','pm')
))
with check (exists (
  select 1 from public.org_memberships m
  where m.org_id = projects.org_id and m.user_id = auth.uid() and m.role in ('admin','pm')
));

create policy "projects_delete_admin_only" on public.projects
for delete using (exists (
  select 1 from public.org_memberships m
  where m.org_id = projects.org_id and m.user_id = auth.uid() and m.role = 'admin'
));

-- 5) Grants (use RLS for access control)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.org_memberships to authenticated;
grant select, insert, update, delete on public.projects to authenticated;

-- 6) Safety: prevent anon writes
revoke insert, update, delete on all tables in schema public from anon;
