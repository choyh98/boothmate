import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CompanyProfileForm } from "@/components/company/company-profile-form";
import { getCurrentCompany } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage() {
  const context = await requireRole("company");
  const company = await getCurrentCompany(context.userId);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-booth-blue">프로필 설정</p>
            <h1 className="mt-3 text-4xl font-black text-booth-ink">참여기업 프로필</h1>
            <p className="mt-3 text-base font-semibold leading-7 text-booth-muted">
              담당자와 회사 기본 정보를 관리합니다.
            </p>
          </div>
          <Link className="rounded-xl border border-booth-line bg-white px-5 py-3 text-sm font-black text-booth-ink shadow-sm" href="/company/dashboard">
            대시보드로
          </Link>
        </div>

        <CompanyProfileForm company={company} email={context.email} profile={context.profile} />
      </main>
    </AppShell>
  );
}
