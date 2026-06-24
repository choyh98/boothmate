create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('기업', '시공업체')),
  company_name text,
  manager_name text,
  phone text,
  specialty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'submitted',
  event_name text,
  venue text,
  event_dates text,
  industry text,
  booth_count text,
  area text,
  booth_width text,
  booth_depth text,
  booth_number text,
  open_side text,
  booth_types text[] default '{}',
  budget_range text,
  min_budget text,
  max_budget text,
  vat text,
  facilities jsonb default '{}'::jsonb,
  design_styles text[] default '{}',
  request_text text,
  files text[] default '{}',
  deadline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.quote_requests enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Anyone can create quote request"
  on public.quote_requests for insert
  with check (true);

create policy "Users can read own quote requests"
  on public.quote_requests for select
  using (auth.uid() = user_id);
