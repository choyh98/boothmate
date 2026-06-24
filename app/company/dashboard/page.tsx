import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentCompany } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage() {
  const context = await requireRole("company");
  const company = await getCurrentCompany(context.userId);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8">
        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">
                Company Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-black text-booth-ink">
                참여기업 대시보드
              </h1>
            </div>
            <LogoutButton />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <InfoCard label="사용자 이름" value={context.profile.name ?? "이름 없음"} />
            <InfoCard label="회사명" value={company?.company_name ?? "회사 정보 없음"} />
            <InfoCard label="역할" value={context.profile.role} />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link className="rounded-2xl bg-booth-blue p-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5" href="/exhibitions">
              전시회 선택하고 견적 요청하기
            </Link>
            <Link className="rounded-2xl border border-booth-line bg-slate-50 p-5 text-sm font-black text-booth-ink transition hover:-translate-y-0.5 hover:border-blue-200" href="/company/quote-requests">
              내 견적 요청 보기
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-booth-line bg-slate-50 p-5">
      <p className="text-sm font-black text-booth-muted">{label}</p>
      <p className="mt-2 text-xl font-black text-booth-ink">{value}</p>
    </div>
  );
}
