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
end $$;

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
end $$;

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
