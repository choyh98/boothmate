"use client";

import { useFormState } from "react-dom";
import { updateCompanyProfileAction } from "@/app/company/profile/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialAuthState } from "@/lib/auth/form-state";
import type { Company, Profile } from "@/types/auth";

type CompanyProfileFormProps = {
  company: Company | null;
  profile: Profile;
  email: string | null;
};

export function CompanyProfileForm({ company, profile, email }: CompanyProfileFormProps) {
  const [state, formAction] = useFormState(updateCompanyProfileAction, initialAuthState);

  return (
    <form action={formAction} className="grid gap-6">
      {state.message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <section className="rounded-[24px] border border-white/80 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-booth-blue">Account</p>
            <h2 className="mt-2 text-2xl font-black text-booth-ink">담당자 정보</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-booth-muted">
            {profile.role}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="로그인 이메일" value={email ?? profile.email ?? ""} readOnly />
          <Field label="담당자 이름" name="name" defaultValue={profile.name ?? ""} />
          <Field label="연락처" name="phone" defaultValue={profile.phone ?? ""} />
        </div>
      </section>

      <section className="rounded-[24px] border border-white/80 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-sm font-black text-booth-blue">Company</p>
          <h2 className="mt-2 text-2xl font-black text-booth-ink">회사 정보</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-booth-muted">
            견적 요청과 받은 견적 화면에 연결되는 기본 회사 정보입니다.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="회사명" name="companyName" defaultValue={company?.company_name ?? ""} required />
          <Field label="사업자등록번호" name="businessNumber" defaultValue={company?.business_number ?? ""} />
          <Field label="업종" name="industry" defaultValue={company?.industry ?? ""} />
          <Field label="웹사이트" name="website" defaultValue={company?.website ?? ""} type="url" />
          <Field label="인증 상태" value={company?.verification_status ?? "pending"} readOnly />
        </div>
      </section>

      <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
        <SubmitButton pendingText="프로필 저장 중...">프로필 저장</SubmitButton>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  value,
  type = "text",
  readOnly = false,
  required = false
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-black text-booth-ink">
      {label}
      <input
        className="w-full min-w-0 rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none transition focus:border-booth-blue focus:bg-white read-only:text-booth-muted"
        defaultValue={defaultValue}
        name={name}
        readOnly={readOnly}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
