"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signupAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialAuthState } from "@/lib/auth/form-state";
import type { SignupRole } from "@/types/auth";

type SignupFormProps = {
  role: SignupRole;
  configReady: boolean;
};

export function SignupForm({ role, configReady }: SignupFormProps) {
  const [state, formAction] = useFormState(signupAction, initialAuthState);
  const isContractor = role === "contractor";

  return (
    <form action={formAction} className="grid gap-4">
      <input name="role" type="hidden" value={role} />
      {!configReady ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
          Supabase 환경변수가 설정되지 않았습니다. `.env.local`에 URL과 Anon Key를 설정해주세요.
        </div>
      ) : null}
      {state.message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          이메일
          <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" name="email" required type="email" />
        </label>
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          비밀번호
          <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" minLength={8} name="password" placeholder="8자 이상" required type="password" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          담당자 이름
          <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" name="name" required />
        </label>
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          연락처
          <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" name="phone" required />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-black text-booth-ink">
        {isContractor ? "업체명" : "회사명"}
        <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" name="companyName" required />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          사업자등록번호
          <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" name="businessNumber" />
        </label>
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          {isContractor ? "주요 지역" : "업종"}
          <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" name="industry" />
        </label>
      </div>
      {isContractor ? (
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          업체 소개
          <textarea className="min-h-28 rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" name="description" />
        </label>
      ) : (
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          웹사이트
          <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue focus:bg-white" name="website" type="url" />
        </label>
      )}
      <SubmitButton pendingText="가입 처리 중...">
        {isContractor ? "전시업체 회원가입" : "참여기업 회원가입"}
      </SubmitButton>
      <div className="flex flex-wrap justify-between gap-3 text-sm font-bold text-booth-muted">
        <span>이미 계정이 있나요?</span>
        <Link className="text-booth-blue" href="/login">
          로그인
        </Link>
      </div>
    </form>
  );
}
