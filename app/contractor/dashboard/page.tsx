import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentContractor } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function ContractorDashboardPage() {
  const context = await requireRole("contractor");
  const contractor = await getCurrentContractor(context.userId);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8">
        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">
                Contractor Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-black text-booth-ink">
                전시업체 대시보드
              </h1>
            </div>
            <LogoutButton />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <InfoCard label="사용자 이름" value={context.profile.name ?? "이름 없음"} />
            <InfoCard label="업체명" value={contractor?.company_name ?? "업체 정보 없음"} />
            <InfoCard label="인증 상태" value={contractor?.verification_status ?? "pending"} />
            <InfoCard label="구독 상태" value={contractor?.subscription_status ?? "inactive"} />
          </div>
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-bold leading-7 text-blue-800">
            공개 요청을 확인하고 견적을 임시저장하거나 최종 제출할 수 있습니다.
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm" href="/contractor/quote-requests">
              공개 요청 보기
            </Link>
            <Link className="rounded-xl border border-booth-line bg-white px-5 py-3 text-sm font-black text-booth-ink shadow-sm" href="/contractor/quotes">
              제출한 견적
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
