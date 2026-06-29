import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, InlineNotice, StatusBadge } from "@/components/ui/state";
import { getCurrentCompany } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { formatCurrency, formatDate, formatDateRange } from "@/lib/format";
import { listCompanyQuotesForRequest } from "@/lib/company-quotes/queries";
import { listMyQuoteRequests } from "@/lib/quote-requests/queries";
import type { Quote } from "@/types/quote";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage() {
  const context = await requireRole("company");
  const company = await getCurrentCompany(context.userId);
  let requests: QuoteRequest[] = [];
  let receivedQuotes: Quote[] = [];
  let errorMessage = "";
  let setupMessage = "";

  try {
    if (!company) {
      setupMessage = "참여기업 기본 정보가 아직 연결되지 않았습니다. Supabase에서 만든 계정이면 companies 레코드가 없거나 자동 생성 권한이 막힌 상태일 수 있습니다.";
    } else {
      requests = await listMyQuoteRequests(context.userId);
      const quoteGroups = await Promise.all(
        requests.map(async (request) => {
          try {
            return listCompanyQuotesForRequest(context.userId, request.id);
          } catch {
            return [];
          }
        })
      );
      receivedQuotes = quoteGroups.flat();
    }
  } catch (error) {
    if (!context.userId.startsWith("dev-")) {
      errorMessage = requests.length === 0
        ? error instanceof Error ? error.message : "견적 요청 현황을 불러오지 못했습니다."
        : "";
    }
  }

  const openRequestIds = new Set(requests.filter((request) => request.status === "open").map((request) => request.id));
  const activeReceivedQuotes = receivedQuotes.filter((quote) => openRequestIds.has(quote.quote_request_id));
  const selectedQuotes = receivedQuotes.filter((quote) => quote.status === "selected");
  const quoteCountByRequest = new Map<string, number>();
  for (const quote of receivedQuotes) {
    quoteCountByRequest.set(quote.quote_request_id, (quoteCountByRequest.get(quote.quote_request_id) ?? 0) + 1);
  }

  const stats = [
    { label: "전체 요청", value: requests.length, caption: "작성/공개 포함", tone: "border-blue-100 bg-blue-50/70 text-booth-blue" },
    { label: "공개 요청", value: requests.filter((request) => request.status === "open").length, caption: "업체 모집 중", tone: "border-emerald-100 bg-emerald-50/70 text-emerald-700" },
    { label: "받은 견적", value: receivedQuotes.length, caption: "비교 가능 견적", tone: "border-indigo-100 bg-indigo-50/70 text-indigo-700" },
    { label: "선택 완료", value: requests.filter((request) => request.status === "selected").length, caption: "최종 업체 확정", tone: "border-slate-200 bg-slate-100 text-slate-700" }
  ];
  const recentRequests = requests.slice(0, 4);
  const recentQuotes = receivedQuotes
    .slice()
    .sort((a, b) => Date.parse(b.submitted_at ?? b.updated_at) - Date.parse(a.submitted_at ?? a.updated_at))
    .slice(0, 3);
  const nextDeadline = requests
    .filter((request) => request.deadline && ["open", "reviewing"].includes(request.status))
    .sort((a, b) => new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime())[0];
  const primaryQuoteHref = recentQuotes[0]?.quote_requests
    ? `/company/quote-requests/${recentQuotes[0].quote_request_id}/quotes`
    : "/company/quote-requests";

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-soft md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue ring-1 ring-blue-100">
                  참여기업 대시보드
                </span>
                {nextDeadline ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                    다음 마감 {formatDate(nextDeadline.deadline)}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 break-words text-3xl font-black leading-tight text-booth-ink md:text-4xl">
                {company?.company_name ?? "참여기업"} 전시 준비 현황
              </h1>
              {context.email ? (
                <p className="mt-2 text-sm font-bold text-booth-muted">{context.email}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-booth-line bg-slate-50 p-4 lg:w-[360px]">
              <p className="text-xs font-black text-booth-muted">다음 작업</p>
              <p className="mt-2 text-lg font-black text-booth-ink">
                {activeReceivedQuotes.length > 0 ? "새 견적을 확인하세요." : "진행 중인 요청을 관리하세요."}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-booth-muted">
                {nextDeadline ? `가장 가까운 마감은 ${formatDate(nextDeadline.deadline)}입니다.` : "마감 임박 요청은 없습니다."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-booth-line pt-5">
            <Link className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5" href="/exhibitions">
              전시 일정에서 요청 시작
            </Link>
            <Link className="rounded-xl border border-booth-line bg-slate-50 px-5 py-3 text-sm font-black text-booth-ink transition hover:-translate-y-0.5" href={primaryQuoteHref}>
              받은 견적 확인
            </Link>
            <Link className="rounded-xl border border-booth-line bg-slate-50 px-5 py-3 text-sm font-black text-booth-ink transition hover:-translate-y-0.5" href="/company/profile">
              프로필 수정
            </Link>
          </div>
        </section>

        {errorMessage ? (
          <div className="mt-6">
            <InlineNotice
              title="일부 데이터를 불러오지 못했습니다."
              description={errorMessage}
              actionHref="/company/quote-requests"
              actionLabel="내 요청 확인"
            />
          </div>
        ) : null}

        {!errorMessage && setupMessage ? (
          <div className="mt-6">
            <InlineNotice
              title="계정 기본 정보를 준비하는 중입니다."
              description={setupMessage}
              actionHref="/signup/company"
              actionLabel="참여기업 가입 화면 보기"
            />
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm" key={stat.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-booth-muted">{stat.label}</p>
                  <p className="mt-3 text-3xl font-black text-booth-ink">{stat.value.toLocaleString("ko-KR")}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${stat.tone}`}>{stat.caption}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-booth-ink">최근 견적 요청</h2>
                <p className="mt-2 text-sm font-bold text-booth-muted">진행 중인 요청과 견적 수신 상태를 한눈에 확인합니다.</p>
              </div>
              <Link className="rounded-xl border border-booth-line bg-slate-50 px-4 py-2 text-sm font-black text-booth-ink" href="/company/quote-requests">
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
                    className="group block overflow-hidden rounded-2xl border border-booth-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-soft"
                    href={`/company/quote-requests/${request.id}`}
                    key={request.id}
                  >
                    <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_180px]">
                      <div className="min-w-0 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={request.status} />
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-booth-muted">
                            {request.exhibitions?.venue_group ?? request.exhibitions?.venue ?? "장소 미정"}
                          </span>
                        </div>
                        <h3 className="mt-4 truncate text-xl font-black text-booth-ink group-hover:text-booth-blue">{request.title}</h3>
                        <div className="mt-3 grid gap-1 text-sm font-bold leading-6 text-booth-muted">
                          <p className="truncate">{request.exhibitions?.title ?? "전시회 정보 없음"}</p>
                          <p>{formatDateRange(request.exhibitions?.start_date, request.exhibitions?.end_date)}</p>
                        </div>
                      </div>

                      <div className="grid border-t border-booth-line bg-slate-50 p-5 md:border-l md:border-t-0">
                        <div className="self-center text-right md:text-left">
                          <p className="text-xs font-black text-booth-muted">부스 규모</p>
                          <p className="mt-1 text-lg font-black text-booth-ink">{request.booth_count ?? "-"}부스</p>
                          <p className="mt-4 text-xs font-black text-booth-muted">예산 상한</p>
                          <p className="mt-1 text-lg font-black text-booth-ink">{formatCurrency(request.budget_max)}</p>
                          <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-booth-blue ring-1 ring-blue-100">
                            받은 견적 {quoteCountByRequest.get(request.id) ?? 0}건
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-[28px] border border-white/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-booth-ink">운영 요약</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-booth-muted">요청 운영 상태와 다음 액션입니다.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
                LIVE
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              <OpsRow label="견적 수신" value={`${receivedQuotes.length}건`} href={primaryQuoteHref} />
              <OpsRow label="모집 중 요청" value={`${stats[1].value}건`} href="/company/quote-requests" />
              <OpsRow label="최종 선택" value={`${selectedQuotes.length}건`} href="/company/quote-requests" />
              <OpsRow label="가까운 마감" value={nextDeadline ? formatDate(nextDeadline.deadline) : "없음"} href="/company/quote-requests" />
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-black text-booth-ink">권장 작업</p>
              <p className="mt-2 text-sm font-bold leading-6 text-booth-muted">
                {receivedQuotes.length > 0
                  ? "새 견적을 비교한 뒤 조건이 맞는 업체를 선택하세요."
                  : "공개 요청의 마감과 예산 조건을 확인해 업체가 견적을 제출할 수 있게 유지하세요."}
              </p>
              <Link className="mt-4 inline-flex rounded-xl bg-booth-blue px-4 py-3 text-sm font-black text-white" href={receivedQuotes.length > 0 ? primaryQuoteHref : "/company/quote-requests"}>
                바로 확인
              </Link>
            </div>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

function OpsRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link className="flex items-center justify-between gap-3 rounded-2xl border border-booth-line bg-slate-50 px-4 py-3 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white" href={href}>
      <span className="text-sm font-black text-booth-muted">{label}</span>
      <span className="text-sm font-black text-booth-ink">{value}</span>
    </Link>
  );
}
