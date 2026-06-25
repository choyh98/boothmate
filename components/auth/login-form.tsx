"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialAuthState } from "@/lib/auth/form-state";

type LoginFormProps = {
  configReady: boolean;
  nextPath?: string;
  pageMessage?: string;
};

export function LoginForm({ configReady, nextPath, pageMessage }: LoginFormProps) {
  const [state, formAction] = useFormState(loginAction, initialAuthState);

  return (
    <form action={formAction} className="grid gap-4">
      {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
      {pageMessage ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-800">
          {pageMessage}
        </div>
      ) : null}
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
      <label className="grid gap-2 text-sm font-black text-booth-ink">
        이메일
        <input
          className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none transition focus:border-booth-blue focus:bg-white"
          name="email"
          placeholder="name@company.com"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-black text-booth-ink">
        비밀번호
        <input
          className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none transition focus:border-booth-blue focus:bg-white"
          minLength={8}
          name="password"
          placeholder="8자 이상"
          required
          type="password"
        />
      </label>
      <SubmitButton pendingText="로그인 확인 중...">로그인</SubmitButton>
      <div className="flex flex-wrap justify-between gap-3 text-sm font-bold text-booth-muted">
        <span>계정이 없나요?</span>
        <Link className="text-booth-blue" href="/signup">
          회원가입
        </Link>
      </div>
    </form>
  );
}
