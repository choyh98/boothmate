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





