import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { getCurrentCompany } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { formatCurrency, formatDate, formatDateRange } from "@/lib/format";
import { listMyQuoteRequests } from "@/lib/quote-requests/queries";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage() {
  const context = await requireRole("company");
  const company = await getCurrentCompany(context.userId);
  let requests: QuoteRequest[] = [];
  let errorMessage = "";

  try {
    requests = await listMyQuoteRequests(context.userId);
  } catch (error) {
    if (!context.userId.startsWith("dev-")) {
      errorMessage = error instanceof Error ? error.message : "견적 요청 현황을 불러오지 못했습니다.";
    }
  }

  const stats = [
    { label: "전체 요청", value: requests.length },
    { label: "공개 요청", value: requests.filter((request) => request.status === "open").length },
    { label: "임시저장", value: requests.filter((request) => request.status === "draft").length },
    { label: "선택 완료", value: requests.filter((request) => request.status === "selected").length }
  ];
  const recentRequests = requests.slice(0, 4);
  const nextDeadline = requests
    .filter((request) => request.deadline && ["open", "reviewing"].includes(request.status))
    .sort((a, b) => new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime())[0];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft md:p-8">
            <p className="text-sm font-black text-booth-blue">참여기업 워크스페이스</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-booth-ink md:text-5xl">
              {company?.company_name ?? context.profile.name ?? "참여기업"}님의 전시 준비 현황
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-booth-muted">
              전시 일정 선택, 견적 요청 공개, 제출 견적 비교, 최종 업체 선택까지 한 곳에서 이어집니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5" href="/exhibitions">
                전시 일정에서 요청 시작
              </Link>
              <Link className="rounded-xl border border-booth-line bg-slate-50 px-5 py-3 text-sm font-black text-booth-ink transition hover:-translate-y-0.5" href="/company/quote-requests">
                내 견적 요청 관리
              </Link>
            </div>
          </div>

          <aside className="rounded-[28px] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-soft">
            <p className="text-sm font-black text-blue-300">오늘 확인할 일</p>
            <h2 className="mt-4 text-2xl font-black">오늘 확인할 일</h2>
            <div className="mt-6 grid gap-3">
              <ActionLine label="요청서 임시저장" value={`${stats[2].value}건`} href="/company/quote-requests" />
              <ActionLine label="견적 모집 중" value={`${stats[1].value}건`} href="/company/quote-requests" />
              <ActionLine label="마감 임박" value={nextDeadline ? formatDate(nextDeadline.deadline) : "없음"} href="/company/quote-requests" />
            </div>
          </aside>
        </section>

        {errorMessage ? (
          <div className="mt-6">
            <ErrorState title="대시보드 데이터를 불러오지 못했습니다." description={errorMessage} />
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm" key={stat.label}>
              <p className="text-sm font-black text-booth-muted">{stat.label}</p>
              <p className="mt-3 text-3xl font-black text-booth-ink">{stat.value.toLocaleString("ko-KR")}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-booth-ink">최근 견적 요청</h2>
                <p className="mt-2 text-sm font-bold text-booth-muted">작성 중이거나 공개한 요청의 현재 상태입니다.</p>
              </div>
              <Link className="text-sm font-black text-booth-blue" href="/company/quote-requests">
                전체 보기
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="아직 견적 요청이 없습니다."
                  description="전시 일정을 선택하면 요청서의 전시 정보가 자동으로 채워집니다."
                  actionHref="/exhibitions"
                  actionLabel="전시 일정 보기"
                />
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {recentRequests.map((request) => (
                  <Link
                    className="rounded-2xl border border-booth-line bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200"
                    href={`/company/quote-requests/${request.id}`}
                    key={request.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <StatusBadge status={request.status} />
                        <h3 className="mt-3 text-lg font-black text-booth-ink">{request.title}</h3>
                        <p className="mt-2 text-sm font-bold text-booth-muted">
                          {request.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request.exhibitions?.start_date, request.exhibitions?.end_date)}
                        </p>
                      </div>
                      <div className="text-right text-sm font-black text-booth-muted">
                        <p>{request.booth_count ?? "-"}부스</p>
                        <p>{formatCurrency(request.budget_max)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="grid gap-4">
            <NextCard
              title="전시 일정"
              body="참가 전시회를 고르면 1단계가 자동 완료됩니다."
              href="/exhibitions"
              action="일정 확인"
            />
            <NextCard
              title="전시업체 찾기"
              body="인증된 업체의 공개 프로필과 가능 부스 유형을 확인합니다."
              href="/company/contractors"
              action="업체 보기"
            />
            <NextCard
              title="이용방법"
              body="요청, 비교, 선택 흐름과 아직 준비 중인 기능을 확인합니다."
              href="/company/guide"
              action="가이드 보기"
            />
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

function ActionLine({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-black transition hover:bg-white/15" href={href}>
      <span>{label}</span>
      <span className="text-blue-200">{value}</span>
    </Link>
  );
}

function NextCard({
  title,
  body,
  href,
  action
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <Link className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft" href={href}>
      <h3 className="text-lg font-black text-booth-ink">{title}</h3>
      <p className="mt-3 text-sm font-bold leading-6 text-booth-muted">{body}</p>
      <span className="mt-5 inline-flex text-sm font-black text-booth-blue">{action}</span>
    </Link>
  );
}
