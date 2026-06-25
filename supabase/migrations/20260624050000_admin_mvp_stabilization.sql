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

