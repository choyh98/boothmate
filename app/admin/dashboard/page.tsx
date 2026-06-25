import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/ui/state";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminMetrics } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const context = await requireRole("admin");
  let metrics;
  let errorMessage = "";

  try {
    metrics = await getAdminMetrics();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "관리자 지표를 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8">
        <div className="mb-8">
          <p className="text-sm font-black text-booth-blue">관리자 대시보드</p>
          <h1 className="mt-3 text-4xl font-black text-booth-ink">관리자 대시보드</h1>
          <p className="mt-3 text-base font-semibold text-booth-muted">
            {context.profile.name ?? context.email ?? "관리자"} 계정으로 접속 중입니다.
          </p>
        </div>
        {errorMessage ? <ErrorState title="지표 오류" description={errorMessage} /> : null}
        {metrics ? (
          <>
            <section className="mb-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-lg font-black text-amber-950">우선 확인 항목</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Metric label="인증 미완료 업체" value={Math.max(metrics.contractor_count - metrics.verified_contractor_count, 0)} />
                <Metric label="공개 요청" value={metrics.open_quote_request_count} />
                <Metric label="선택 완료 요청" value={metrics.selected_quote_request_count} />
              </div>
            </section>
            <section className="grid gap-4 md:grid-cols-4">
              <Metric label="참여기업" value={metrics.company_count} />
              <Metric label="전시업체" value={metrics.contractor_count} />
              <Metric label="인증 업체" value={metrics.verified_contractor_count} />
              <Metric label="활성 구독 업체" value={metrics.active_subscription_contractor_count} />
              <Metric label="제출 견적" value={metrics.submitted_quote_count} />
            </section>
          </>
        ) : null}
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["전시회 관리", "/admin/exhibitions"],
            ["전시업체 관리", "/admin/contractors"],
            ["사용자 관리", "/admin/users"],
            ["견적 요청 관리", "/admin/quote-requests"],
            ["제출 견적 관리", "/admin/quotes"]
          ].map(([label, href]) => (
            <Link className="rounded-[24px] border border-white/80 bg-white p-5 text-sm font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200" href={href} key={href}>
              {label}
            </Link>
          ))}
        </section>
      </main>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-booth-muted">{label}</p>
      <p className="mt-2 text-3xl font-black text-booth-ink">{value}</p>
    </div>
  );
}
