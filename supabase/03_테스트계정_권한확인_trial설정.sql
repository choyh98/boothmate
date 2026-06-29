-- 테스트 계정 권한 확인 / trial 설정 SQL
-- 목적:
-- 1. 회원가입 후 profiles, companies, contractors 행이 제대로 생겼는지 확인합니다.
-- 2. 전시업체 테스트 계정이 견적 최종 제출을 할 수 있도록 subscription_status를 trial로 맞춥니다.
--
-- 사용 시점:
-- 01, 02 실행 후 참여기업/전시업체 계정을 새로 회원가입한 다음 실행하세요.

-- 혹시 회원가입 트리거가 실행되지 않았던 계정을 보정합니다.
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

-- 테스트 기간에는 전시업체가 견적 최종 제출까지 할 수 있게 trial로 둡니다.
update public.contractors
set subscription_status = 'trial'::public.subscription_status
where subscription_status::text in ('inactive', 'expired', 'suspended', 'past_due', 'cancelled');

-- 전시업체 공개 목록에 보이게 하려면 approved가 필요합니다.
-- 견적 작성 자체에는 필수는 아니지만, 테스트 편의를 위해 pending인 전시업체를 approved로 둡니다.
update public.contractors
set verification_status = 'approved'::public.verification_status
where verification_status = 'pending'::public.verification_status;

-- 확인용 조회
select
  profiles.email,
  profiles.role,
  companies.id as company_id,
  companies.company_name as company_name,
  contractors.id as contractor_id,
  contractors.company_name as contractor_name,
  contractors.verification_status,
  contractors.subscription_status
from public.profiles
left join public.companies on companies.owner_id = profiles.id
left join public.contractors on contractors.owner_id = profiles.id
order by profiles.created_at desc;
