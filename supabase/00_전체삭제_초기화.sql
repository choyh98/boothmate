-- 부스메이트 전체 삭제 / 초기화 SQL
-- 주의: 이 파일은 public 스키마의 모든 테이블, 함수, 뷰, 정책, 데이터를 삭제합니다.
-- 정말 새로 시작할 때만 Supabase SQL Editor에서 실행하세요.
--
-- 실행 순서:
-- 1. 00_전체삭제_초기화.sql
-- 2. 01_전체초기설정_스키마_RLS_트리거.sql
-- 3. 02_전시회_초기데이터_seed.sql
-- 4. 회원가입 테스트 후 03_테스트계정_권한확인_trial설정.sql

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant execute on functions to anon;
