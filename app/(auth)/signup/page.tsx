import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AuthCard } from "@/components/auth/auth-card";
import { getPublicEnvStatus } from "@/lib/config/env";
import { redirectSignedInUser } from "@/lib/auth/require-role";

export default async function SignupPage() {
  const envStatus = getPublicEnvStatus();

  if (envStatus.hasUrl && envStatus.hasAnonKey) {
    await redirectSignedInUser();
  }

  return (
    <AppShell>
      <AuthCard
        eyebrow="Signup"
        title="회원 유형을 선택해주세요."
        description="관리자 계정은 일반 회원가입으로 만들 수 없고 Supabase에서 수동 지정합니다."
      >
        {!envStatus.hasUrl || !envStatus.hasAnonKey ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
            Supabase 환경변수가 설정되지 않았습니다. 가입 전에 `.env.local`을 설정해주세요.
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            className="rounded-2xl border border-blue-200 bg-blue-50 p-5 transition hover:-translate-y-0.5 hover:bg-blue-100"
            href="/signup/company"
          >
            <span className="text-sm font-black text-booth-blue">company</span>
            <h2 className="mt-3 text-xl font-black text-booth-ink">참여기업</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-booth-muted">
              전시회에 참가하고 부스 견적을 요청하는 기업 계정입니다.
            </p>
          </Link>
          <Link
            className="rounded-2xl border border-booth-line bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
            href="/signup/contractor"
          >
            <span className="text-sm font-black text-booth-blue">contractor</span>
            <h2 className="mt-3 text-xl font-black text-booth-ink">전시업체</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-booth-muted">
              공개된 견적 요청을 확인하고 견적을 제출하는 업체 계정입니다.
            </p>
          </Link>
        </div>
      </AuthCard>
    </AppShell>
  );
}
