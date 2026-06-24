create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('company', 'contractor', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('inactive', 'active', 'past_due', 'cancelled');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  role public.user_role not null default 'company',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

do $$
declare
  profile_role_type text;
  check_constraint record;
begin
  select udt_name
    into profile_role_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'role';

  for check_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', check_constraint.conname);
  end loop;

  if profile_role_type is distinct from 'user_role' then
    alter table public.profiles
      alter column role drop default,
      alter column role type public.user_role
      using (
        case
          when role::text = 'contractor' or role::text = '시공업체' then 'contractor'
          when role::text = 'admin' then 'admin'
          else 'company'
        end
      )::public.user_role;
  end if;

  alter table public.profiles alter column role set default 'company'::public.user_role;
  alter table public.profiles alter column role set not null;
end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  business_number text,
  industry text,
  website text,
  verification_status public.verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  business_number text,
  description text,
  service_regions text[] not null default '{}',
  booth_types text[] not null default '{}',
  minimum_budget bigint,
  verification_status public.verification_status not null default 'pending',
  subscription_status public.subscription_status not null default 'inactive',
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists contractors_set_updated_at on public.contractors;
create trigger contractors_set_updated_at
  before update on public.contractors
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role public.user_role;
  profile_name text;
  profile_phone text;
  org_name text;
  org_business_number text;
  org_industry text;
  org_website text;
  org_description text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'company');

  if requested_role = 'contractor' then
    safe_role := 'contractor';
  else
    safe_role := 'company';
  end if;

  profile_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
  profile_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  org_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '');
  org_business_number := nullif(trim(coalesce(new.raw_user_meta_data ->> 'business_number', '')), '');
  org_industry := nullif(trim(coalesce(new.raw_user_meta_data ->> 'industry', '')), '');
  org_website := nullif(trim(coalesce(new.raw_user_meta_data ->> 'website', '')), '');
  org_description := nullif(trim(coalesce(new.raw_user_meta_data ->> 'description', '')), '');

  insert into public.profiles (id, email, name, phone, role)
  values (new.id, new.email, profile_name, profile_phone, safe_role)
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    phone = excluded.phone;

  if safe_role = 'company' then
    insert into public.companies (
      owner_id,
      company_name,
      business_number,
      industry,
      website
    )
    values (
      new.id,
      coalesce(org_name, profile_name, new.email),
      org_business_number,
      org_industry,
      org_website
    )
    on conflict (owner_id) do nothing;
  elsif safe_role = 'contractor' then
    insert into public.contractors (
      owner_id,
      company_name,
      business_number,
      description
    )
    values (
      new.id,
      coalesce(org_name, profile_name, new.email),
      org_business_number,
      org_description
    )
    on conflict (owner_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.contractors enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "profiles_update_own_without_role_change" on public.profiles;
create policy "profiles_update_own_without_role_change"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "companies_select_owner" on public.companies;
create policy "companies_select_owner"
  on public.companies for select
  using (auth.uid() = owner_id);

drop policy if exists "companies_select_admin" on public.companies;
create policy "companies_select_admin"
  on public.companies for select
  using (public.is_admin());

drop policy if exists "companies_insert_owner" on public.companies;
create policy "companies_insert_owner"
  on public.companies for insert
  with check (auth.uid() = owner_id);

drop policy if exists "companies_update_owner" on public.companies;
create policy "companies_update_owner"
  on public.companies for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "companies_admin_all" on public.companies;
create policy "companies_admin_all"
  on public.companies for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "contractors_select_owner" on public.contractors;
create policy "contractors_select_owner"
  on public.contractors for select
  using (auth.uid() = owner_id);

drop policy if exists "contractors_select_admin" on public.contractors;
create policy "contractors_select_admin"
  on public.contractors for select
  using (public.is_admin());

drop policy if exists "contractors_insert_owner" on public.contractors;
create policy "contractors_insert_owner"
  on public.contractors for insert
  with check (auth.uid() = owner_id);

drop policy if exists "contractors_update_owner" on public.contractors;
create policy "contractors_update_owner"
  on public.contractors for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "contractors_admin_all" on public.contractors;
create policy "contractors_admin_all"
  on public.contractors for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace view public.contractor_public_profiles
with (security_invoker = false)
as
select
  id,
  company_name,
  description,
  service_regions,
  booth_types,
  minimum_budget,
  verification_status,
  subscription_status,
  created_at
from public.contractors
where verification_status = 'approved';

grant select on public.contractor_public_profiles to anon, authenticated;
