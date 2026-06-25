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

