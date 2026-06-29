-- 부스메이트 전체 초기설정 SQL
-- 실행 순서: 00_전체삭제_초기화.sql(선택) -> 01_전체초기설정_스키마_RLS_트리거.sql -> 02_전시회_초기데이터_seed.sql
-- 목적: 새 Supabase 프로젝트 또는 완전히 비운 DB에 전체 테이블, enum, RLS, 트리거, 함수, 뷰를 생성합니다.
-- 주의: 이 파일은 기존 데이터를 삭제하지 않습니다. 완전 초기화는 00 파일을 먼저 실행하세요.


-- ============================================================
-- 20260624010000_auth_roles_profiles.sql
-- ============================================================

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
end;
$$;

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
end;
$$;

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



-- ============================================================
-- 20260624020000_exhibitions_quote_requests.sql
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_request_status') then
    create type public.quote_request_status as enum (
      'draft',
      'open',
      'reviewing',
      'selected',
      'closed',
      'cancelled'
    );
  end if;
end;
$$;

create table if not exists public.exhibitions (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  title text not null,
  venue text,
  venue_group text,
  region text,
  start_date date,
  end_date date,
  installation_date date,
  dismantling_date date,
  industry text,
  organizer text,
  homepage_url text,
  source text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  exhibition_id uuid references public.exhibitions(id) on delete set null,
  title text not null,
  booth_count integer,
  booth_width numeric,
  booth_depth numeric,
  booth_area numeric,
  open_sides text,
  booth_types text[] not null default '{}',
  budget_min bigint,
  budget_max bigint,
  vat_included boolean not null default true,
  required_items jsonb not null default '{}'::jsonb,
  design_styles text[] not null default '{}',
  requirements text,
  deadline timestamptz,
  status public.quote_request_status not null default 'draft',
  selected_quote_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exhibitions add column if not exists source_id text;
alter table public.exhibitions add column if not exists title text;
alter table public.exhibitions add column if not exists venue text;
alter table public.exhibitions add column if not exists venue_group text;
alter table public.exhibitions add column if not exists region text;
alter table public.exhibitions add column if not exists start_date date;
alter table public.exhibitions add column if not exists end_date date;
alter table public.exhibitions add column if not exists installation_date date;
alter table public.exhibitions add column if not exists dismantling_date date;
alter table public.exhibitions add column if not exists industry text;
alter table public.exhibitions add column if not exists organizer text;
alter table public.exhibitions add column if not exists homepage_url text;
alter table public.exhibitions add column if not exists source text;
alter table public.exhibitions add column if not exists status text not null default 'scheduled';
alter table public.exhibitions add column if not exists created_at timestamptz not null default now();
alter table public.exhibitions add column if not exists updated_at timestamptz not null default now();

alter table public.quote_requests add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.quote_requests add column if not exists exhibition_id uuid references public.exhibitions(id) on delete set null;
alter table public.quote_requests add column if not exists title text;
alter table public.quote_requests add column if not exists booth_count integer;
alter table public.quote_requests add column if not exists booth_width numeric;
alter table public.quote_requests add column if not exists booth_depth numeric;
alter table public.quote_requests add column if not exists booth_area numeric;
alter table public.quote_requests add column if not exists open_sides text;
alter table public.quote_requests add column if not exists booth_types text[] not null default '{}';
alter table public.quote_requests add column if not exists budget_min bigint;
alter table public.quote_requests add column if not exists budget_max bigint;
alter table public.quote_requests add column if not exists vat_included boolean not null default true;
alter table public.quote_requests add column if not exists required_items jsonb not null default '{}'::jsonb;
alter table public.quote_requests add column if not exists design_styles text[] not null default '{}';
alter table public.quote_requests add column if not exists requirements text;
alter table public.quote_requests add column if not exists deadline timestamptz;
alter table public.quote_requests add column if not exists selected_quote_id uuid;
alter table public.quote_requests add column if not exists created_at timestamptz not null default now();
alter table public.quote_requests add column if not exists updated_at timestamptz not null default now();

do $$
declare
  quote_status_type text;
begin
  select udt_name
    into quote_status_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'quote_requests'
    and column_name = 'status';

  if quote_status_type is distinct from 'quote_request_status' then
    alter table public.quote_requests
      alter column status drop default,
      alter column status type public.quote_request_status
      using (
        case
          when status::text in ('draft', 'open', 'reviewing', 'selected', 'closed', 'cancelled')
            then status::text
          else 'draft'
        end
      )::public.quote_request_status;
  end if;

  alter table public.quote_requests alter column status set default 'draft'::public.quote_request_status;
  alter table public.quote_requests alter column status set not null;
end;
$$;

create unique index if not exists exhibitions_source_id_idx
  on public.exhibitions(source_id)
  where source_id is not null;

create index if not exists exhibitions_start_date_idx
  on public.exhibitions(start_date);

create index if not exists exhibitions_venue_group_idx
  on public.exhibitions(venue_group);

create index if not exists quote_requests_company_status_idx
  on public.quote_requests(company_id, status, updated_at desc);

drop trigger if exists exhibitions_set_updated_at on public.exhibitions;
create trigger exhibitions_set_updated_at
  before update on public.exhibitions
  for each row execute function public.set_updated_at();

drop trigger if exists quote_requests_set_updated_at on public.quote_requests;
create trigger quote_requests_set_updated_at
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

alter table public.exhibitions enable row level security;
alter table public.quote_requests enable row level security;

drop policy if exists "exhibitions_public_select" on public.exhibitions;
create policy "exhibitions_public_select"
  on public.exhibitions for select
  using (true);

drop policy if exists "exhibitions_admin_all" on public.exhibitions;
create policy "exhibitions_admin_all"
  on public.exhibitions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "quote_requests_company_select_own" on public.quote_requests;
create policy "quote_requests_company_select_own"
  on public.quote_requests for select
  using (
    exists (
      select 1
      from public.companies
      where companies.id = quote_requests.company_id
        and companies.owner_id = auth.uid()
    )
  );

drop policy if exists "quote_requests_company_insert_own" on public.quote_requests;
create policy "quote_requests_company_insert_own"
  on public.quote_requests for insert
  with check (
    exists (
      select 1
      from public.companies
      where companies.id = quote_requests.company_id
        and companies.owner_id = auth.uid()
    )
  );

drop policy if exists "quote_requests_company_update_own" on public.quote_requests;
create policy "quote_requests_company_update_own"
  on public.quote_requests for update
  using (
    exists (
      select 1
      from public.companies
      where companies.id = quote_requests.company_id
        and companies.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.companies
      where companies.id = quote_requests.company_id
        and companies.owner_id = auth.uid()
    )
  );

drop policy if exists "quote_requests_admin_all" on public.quote_requests;
create policy "quote_requests_admin_all"
  on public.quote_requests for all
  using (public.is_admin())
  with check (public.is_admin());



-- ============================================================
-- 20260624030000_quotes.sql
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type public.quote_status as enum (
      'draft',
      'submitted',
      'viewed',
      'shortlisted',
      'selected',
      'rejected',
      'withdrawn'
    );
  end if;
end;
$$;

alter type public.subscription_status add value if not exists 'trial';
alter type public.subscription_status add value if not exists 'expired';
alter type public.subscription_status add value if not exists 'suspended';

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  booth_type text,
  total_price bigint,
  vat_included boolean not null default true,
  design_cost bigint,
  material_cost bigint,
  construction_cost bigint,
  transport_cost bigint,
  installation_cost bigint,
  dismantling_cost bigint,
  electrical_cost bigint,
  graphic_cost bigint,
  furniture_cost bigint,
  other_cost bigint,
  included_items text,
  excluded_items text,
  proposal text,
  first_design_date date,
  revision_count integer,
  production_days integer,
  valid_until date,
  status public.quote_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_request_id, contractor_id)
);

alter table public.quotes add column if not exists quote_request_id uuid references public.quote_requests(id) on delete cascade;
alter table public.quotes add column if not exists contractor_id uuid references public.contractors(id) on delete cascade;
alter table public.quotes add column if not exists booth_type text;
alter table public.quotes add column if not exists total_price bigint;
alter table public.quotes add column if not exists vat_included boolean not null default true;
alter table public.quotes add column if not exists design_cost bigint;
alter table public.quotes add column if not exists material_cost bigint;
alter table public.quotes add column if not exists construction_cost bigint;
alter table public.quotes add column if not exists transport_cost bigint;
alter table public.quotes add column if not exists installation_cost bigint;
alter table public.quotes add column if not exists dismantling_cost bigint;
alter table public.quotes add column if not exists electrical_cost bigint;
alter table public.quotes add column if not exists graphic_cost bigint;
alter table public.quotes add column if not exists furniture_cost bigint;
alter table public.quotes add column if not exists other_cost bigint;
alter table public.quotes add column if not exists included_items text;
alter table public.quotes add column if not exists excluded_items text;
alter table public.quotes add column if not exists proposal text;
alter table public.quotes add column if not exists first_design_date date;
alter table public.quotes add column if not exists revision_count integer;
alter table public.quotes add column if not exists production_days integer;
alter table public.quotes add column if not exists valid_until date;
alter table public.quotes add column if not exists submitted_at timestamptz;
alter table public.quotes add column if not exists created_at timestamptz not null default now();
alter table public.quotes add column if not exists updated_at timestamptz not null default now();

do $$
declare
  quote_status_type text;
begin
  select udt_name
    into quote_status_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'quotes'
    and column_name = 'status';

  if quote_status_type is distinct from 'quote_status' then
    alter table public.quotes
      alter column status drop default,
      alter column status type public.quote_status
      using (
        case
          when status::text in ('draft', 'submitted', 'viewed', 'shortlisted', 'selected', 'rejected', 'withdrawn')
            then status::text
          else 'draft'
        end
      )::public.quote_status;
  end if;

  alter table public.quotes alter column status set default 'draft'::public.quote_status;
  alter table public.quotes alter column status set not null;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_quote_request_id_contractor_id_key'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes add constraint quotes_quote_request_id_contractor_id_key unique (quote_request_id, contractor_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quote_requests_selected_quote_id_fkey'
      and conrelid = 'public.quote_requests'::regclass
  ) then
    alter table public.quote_requests
      add constraint quote_requests_selected_quote_id_fkey
      foreign key (selected_quote_id) references public.quotes(id) on delete set null;
  end if;
end;
$$;

create index if not exists quotes_contractor_status_updated_idx
  on public.quotes(contractor_id, status, updated_at desc);

create index if not exists quotes_request_status_updated_idx
  on public.quotes(quote_request_id, status, updated_at desc);

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

create or replace function public.is_current_contractor(target_contractor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.contractors
    where contractors.id = target_contractor_id
      and contractors.owner_id = auth.uid()
  );
$$;

create or replace function public.can_current_contractor_submit_quote(target_contractor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.contractors
    where contractors.id = target_contractor_id
      and contractors.owner_id = auth.uid()
      and contractors.subscription_status::text in ('active', 'trial')
  );
$$;

create or replace function public.is_quote_request_open_for_quotes(target_quote_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quote_requests
    where quote_requests.id = target_quote_request_id
      and quote_requests.status = 'open'::public.quote_request_status
      and (quote_requests.deadline is null or quote_requests.deadline > now())
  );
$$;

alter table public.quotes enable row level security;

drop policy if exists "quote_requests_contractors_select_open" on public.quote_requests;
create policy "quote_requests_contractors_select_open"
  on public.quote_requests for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'contractor'
    )
    and status = 'open'::public.quote_request_status
    and (deadline is null or deadline > now())
  );

drop policy if exists "quotes_contractor_select_own" on public.quotes;
create policy "quotes_contractor_select_own"
  on public.quotes for select
  using (public.is_current_contractor(contractor_id));

drop policy if exists "quotes_contractor_insert_own" on public.quotes;
create policy "quotes_contractor_insert_own"
  on public.quotes for insert
  with check (
    public.is_current_contractor(contractor_id)
    and (
      status = 'draft'::public.quote_status
      or public.can_current_contractor_submit_quote(contractor_id)
    )
    and public.is_quote_request_open_for_quotes(quote_request_id)
  );

drop policy if exists "quotes_contractor_update_own" on public.quotes;
create policy "quotes_contractor_update_own"
  on public.quotes for update
  using (
    public.is_current_contractor(contractor_id)
    and status = 'draft'::public.quote_status
  )
  with check (
    public.is_current_contractor(contractor_id)
    and (
      status = 'draft'::public.quote_status
      or public.can_current_contractor_submit_quote(contractor_id)
    )
    and public.is_quote_request_open_for_quotes(quote_request_id)
  );

drop policy if exists "quotes_company_select_submitted_for_own_requests" on public.quotes;
create policy "quotes_company_select_submitted_for_own_requests"
  on public.quotes for select
  using (
    status <> 'draft'::public.quote_status
    and exists (
      select 1
      from public.quote_requests
      join public.companies on companies.id = quote_requests.company_id
      where quote_requests.id = quotes.quote_request_id
        and companies.owner_id = auth.uid()
    )
  );

drop policy if exists "quotes_admin_all" on public.quotes;
create policy "quotes_admin_all"
  on public.quotes for all
  using (public.is_admin())
  with check (public.is_admin());







-- ============================================================
-- 20260624040000_quote_selection.sql
-- ============================================================

alter table public.quote_requests add column if not exists selected_at timestamptz;

alter table public.quotes add column if not exists viewed_at timestamptz;
alter table public.quotes add column if not exists selected_at timestamptz;
alter table public.quotes add column if not exists rejected_at timestamptz;

create index if not exists quotes_quote_request_status_price_idx
  on public.quotes(quote_request_id, status, total_price);

create index if not exists quotes_selected_at_idx
  on public.quotes(selected_at)
  where selected_at is not null;

create or replace function public.is_current_company_request(target_quote_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quote_requests
    join public.companies on companies.id = quote_requests.company_id
    where quote_requests.id = target_quote_request_id
      and companies.owner_id = auth.uid()
  );
$$;

create or replace function public.is_current_contractor_quote_request(target_quote_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quotes
    join public.contractors on contractors.id = quotes.contractor_id
    where quotes.quote_request_id = target_quote_request_id
      and contractors.owner_id = auth.uid()
  );
$$;

drop policy if exists "quote_requests_contractors_select_own_quoted_requests" on public.quote_requests;
create policy "quote_requests_contractors_select_own_quoted_requests"
  on public.quote_requests for select
  using (public.is_current_contractor_quote_request(id));

create or replace function public.mark_quote_viewed(target_quote_id uuid)
returns public.quote_status
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.user_role;
  current_quote record;
  new_status public.quote_status;
begin
  select profiles.role
    into current_role
  from public.profiles
  where profiles.id = auth.uid();

  if current_role is distinct from 'company'::public.user_role then
    raise exception '참여기업 계정으로 로그인해주세요.';
  end if;

  select quotes.id, quotes.quote_request_id, quotes.status
    into current_quote
  from public.quotes
  where quotes.id = target_quote_id;

  if not found then
    raise exception '견적을 찾을 수 없습니다.';
  end if;

  if not public.is_current_company_request(current_quote.quote_request_id) then
    raise exception '견적을 조회할 권한이 없습니다.';
  end if;

  if current_quote.status = 'draft'::public.quote_status then
    raise exception '임시저장 견적은 조회할 수 없습니다.';
  end if;

  update public.quotes
  set
    status = case
      when status = 'submitted'::public.quote_status then 'viewed'::public.quote_status
      else status
    end,
    viewed_at = coalesce(viewed_at, now())
  where id = target_quote_id;

  select quotes.status
    into new_status
  from public.quotes
  where quotes.id = target_quote_id;

  return new_status;
end;
$$;

create or replace function public.select_quote_for_request(
  target_quote_request_id uuid,
  target_quote_id uuid
)
returns table (
  quote_request_id uuid,
  selected_quote_id uuid,
  selected_status public.quote_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.user_role;
  request_record record;
  quote_record record;
begin
  select profiles.role
    into current_role
  from public.profiles
  where profiles.id = auth.uid();

  if current_role is distinct from 'company'::public.user_role then
    raise exception '참여기업 계정으로 로그인해주세요.';
  end if;

  select quote_requests.id, quote_requests.company_id, quote_requests.status, quote_requests.selected_quote_id
    into request_record
  from public.quote_requests
  where quote_requests.id = target_quote_request_id
  for update;

  if not found then
    raise exception '견적 요청을 찾을 수 없습니다.';
  end if;

  if not public.is_current_company_request(target_quote_request_id) then
    raise exception '견적 요청을 선택할 권한이 없습니다.';
  end if;

  if request_record.selected_quote_id is not null
    or request_record.status = 'selected'::public.quote_request_status then
    raise exception '이미 업체가 선택된 요청입니다.';
  end if;

  select quotes.id, quotes.quote_request_id, quotes.status, quotes.valid_until
    into quote_record
  from public.quotes
  where quotes.id = target_quote_id
  for update;

  if not found then
    raise exception '선택할 견적을 찾을 수 없습니다.';
  end if;

  if quote_record.quote_request_id <> target_quote_request_id then
    raise exception '선택한 견적이 해당 요청에 속하지 않습니다.';
  end if;

  if quote_record.status in ('draft'::public.quote_status, 'withdrawn'::public.quote_status) then
    raise exception '선택할 수 없는 견적 상태입니다.';
  end if;

  if quote_record.valid_until is not null and quote_record.valid_until < current_date then
    raise exception '견적 유효기간이 지났습니다.';
  end if;

  update public.quotes
  set
    status = 'selected'::public.quote_status,
    selected_at = now(),
    rejected_at = null
  where id = target_quote_id;

  update public.quotes
  set
    status = 'rejected'::public.quote_status,
    rejected_at = now()
  where quote_request_id = target_quote_request_id
    and id <> target_quote_id
    and status not in ('draft'::public.quote_status, 'withdrawn'::public.quote_status);

  update public.quote_requests
  set
    status = 'selected'::public.quote_request_status,
    selected_quote_id = target_quote_id,
    selected_at = now()
  where id = target_quote_request_id;

  return query
  select target_quote_request_id, target_quote_id, 'selected'::public.quote_status;
end;
$$;



-- ============================================================
-- 20260624050000_admin_mvp_stabilization.sql
-- ============================================================

alter table public.exhibitions add column if not exists last_checked_at timestamptz;

update public.exhibitions
set status = case
  when status in ('inactive', 'cancelled') then status
  else 'active'
end
where status is null
   or status not in ('active', 'inactive', 'cancelled');

alter table public.exhibitions alter column status set default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exhibitions_status_check'
      and conrelid = 'public.exhibitions'::regclass
  ) then
    alter table public.exhibitions
      add constraint exhibitions_status_check
      check (status in ('active', 'inactive', 'cancelled'));
  end if;
end;
$$;

create or replace function public.get_admin_dashboard_metrics()
returns table (
  company_count bigint,
  contractor_count bigint,
  verified_contractor_count bigint,
  active_subscription_contractor_count bigint,
  open_quote_request_count bigint,
  submitted_quote_count bigint,
  selected_quote_request_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  return query
  select
    (select count(*) from public.companies) as company_count,
    (select count(*) from public.contractors) as contractor_count,
    (select count(*) from public.contractors where verification_status = 'approved'::public.verification_status) as verified_contractor_count,
    (select count(*) from public.contractors where subscription_status::text = 'active') as active_subscription_contractor_count,
    (select count(*) from public.quote_requests where status = 'open'::public.quote_request_status) as open_quote_request_count,
    (select count(*) from public.quotes where status <> 'draft'::public.quote_status) as submitted_quote_count,
    (select count(*) from public.quote_requests where status = 'selected'::public.quote_request_status) as selected_quote_request_count;
end;
$$;

revoke all on function public.get_admin_dashboard_metrics() from public;
revoke all on function public.get_admin_dashboard_metrics() from anon;
grant execute on function public.get_admin_dashboard_metrics() to authenticated;

create or replace view public.admin_quote_request_overview
with (security_invoker = true)
as
select
  quote_requests.id,
  quote_requests.title,
  quote_requests.company_id,
  companies.company_name,
  quote_requests.exhibition_id,
  exhibitions.title as exhibition_title,
  quote_requests.booth_count,
  quote_requests.booth_area,
  quote_requests.budget_min,
  quote_requests.budget_max,
  quote_requests.status,
  quote_requests.deadline,
  quote_requests.selected_quote_id,
  selected_contractors.company_name as selected_contractor_name,
  quote_requests.created_at,
  count(quotes.id) filter (where quotes.status <> 'draft'::public.quote_status) as submitted_quote_count
from public.quote_requests
join public.companies on companies.id = quote_requests.company_id
left join public.exhibitions on exhibitions.id = quote_requests.exhibition_id
left join public.quotes on quotes.quote_request_id = quote_requests.id
left join public.quotes selected_quotes on selected_quotes.id = quote_requests.selected_quote_id
left join public.contractors selected_contractors on selected_contractors.id = selected_quotes.contractor_id
group by
  quote_requests.id,
  companies.company_name,
  exhibitions.title,
  selected_contractors.company_name;

grant select on public.admin_quote_request_overview to authenticated;



-- ============================================================
-- 기존 계정 백필 / 확인용
-- ============================================================

-- 회원가입 트리거가 없던 상태에서 생성된 참여기업/전시업체 계정을 보정합니다.
insert into public.companies (
  owner_id,
  company_name
)
select
  profiles.id,
  coalesce(nullif(trim(profiles.name), ''), profiles.email, '참여기업')
from public.profiles
where profiles.role = 'company'
  and not exists (
    select 1
    from public.companies
    where companies.owner_id = profiles.id
  );

insert into public.contractors (
  owner_id,
  company_name
)
select
  profiles.id,
  coalesce(nullif(trim(profiles.name), ''), profiles.email, '전시업체')
from public.profiles
where profiles.role = 'contractor'
  and not exists (
    select 1
    from public.contractors
    where contractors.owner_id = profiles.id
  );

select
  'profiles' as table_name,
  count(*) as row_count
from public.profiles
union all
select 'companies', count(*) from public.companies
union all
select 'contractors', count(*) from public.contractors
union all
select 'exhibitions', count(*) from public.exhibitions
union all
select 'quote_requests', count(*) from public.quote_requests
union all
select 'quotes', count(*) from public.quotes;

