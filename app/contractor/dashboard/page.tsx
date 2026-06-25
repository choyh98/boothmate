import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { getCurrentContractor } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { formatCurrency, formatDateRange } from "@/lib/format";
import { canSubmitQuote, listMySubmittedQuotes, listOpenQuoteRequests } from "@/lib/quotes/queries";
import type { Quote } from "@/types/quote";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

export default async function ContractorDashboardPage() {
  const context = await requireRole("contractor");
  const contractor = await getCurrentContractor(context.userId);
  let openRequests: QuoteRequest[] = [];
  let quotes: Quote[] = [];
  let errorMessage = "";

  try {
    const [requests, submittedQuotes] = await Promise.all([
      listOpenQuoteRequests(),
      listMySubmittedQuotes(context.userId)
    ]);
    openRequests = requests;
    quotes = submittedQuotes;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "업체 대시보드 데이터를 불러오지 못했습니다.";
  }

  const quoteAllowed = canSubmitQuote(contractor);
  const stats = [
    { label: "공개 요청", value: openRequests.length },
    { label: "제출 견적", value: quotes.length },
    { label: "선택 견적", value: quotes.filter((quote) => quote.status === "selected").length },
    { label: "미선정", value: quotes.filter((quote) => quote.status === "rejected").length }
  ];
  const recentRequests = openRequests.slice(0, 3);
  const recentQuotes = quotes.slice(0, 3);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft md:p-8">
            <p className="text-sm font-black text-booth-blue">전시업체 워크스페이스</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-booth-ink md:text-5xl">
              {contractor?.company_name ?? context.profile.name ?? "전시업체"}님의 견적 영업 현황
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-booth-muted">
              공개 요청을 확인하고 견적을 임시저장한 뒤 최종 제출하면 참여기업의 비교 화면에 노출됩니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5" href="/contractor/quote-requests">
                공개 요청 확인
              </Link>
              <Link className="rounded-xl border border-booth-line bg-slate-50 px-5 py-3 text-sm font-black text-booth-ink transition hover:-translate-y-0.5" href="/contractor/quotes">
                제출 견적 관리
              </Link>
            </div>
          </div>

          <aside className="rounded-[28px] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-soft">
            <p className="text-sm font-black text-blue-300">업체 계정 상태</p>
            <h2 className="mt-4 text-2xl font-black">업체 상태</h2>
            <div className="mt-6 grid gap-3">
              <StatusRow label="인증 상태" value={contractor?.verification_status ?? "pending"} />
              <StatusRow label="구독 상태" value={contractor?.subscription_status ?? "inactive"} />
              <StatusRow label="견적 제출" value={quoteAllowed ? "가능" : "불가"} />
            </div>
            {!quoteAllowed ? (
              <p className="mt-5 rounded-2xl bg-amber-100 p-4 text-sm font-bold leading-6 text-amber-900">
                active 또는 trial 구독 상태에서만 최종 제출할 수 있습니다. 임시저장은 가능합니다.
              </p>
            ) : null}
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

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <DashboardPanel title="최근 공개 요청" href="/contractor/quote-requests" action="전체 요청 보기">
            {recentRequests.length === 0 ? (
              <EmptyState title="현재 공개된 요청이 없습니다." description="참여기업이 공개 요청을 등록하면 이곳에 표시됩니다." />
            ) : (
              <div className="grid gap-3">
                {recentRequests.map((request) => (
                  <Link
                    className="rounded-2xl border border-booth-line bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200"
                    href={`/contractor/quote-requests/${request.id}`}
                    key={request.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <StatusBadge status="견적 모집중" />
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
          </DashboardPanel>

          <DashboardPanel title="최근 제출 견적" href="/contractor/quotes" action="제출 견적 보기">
            {recentQuotes.length === 0 ? (
              <EmptyState title="아직 제출한 견적이 없습니다." description="공개 요청 상세에서 견적을 작성하고 최종 제출할 수 있습니다." />
            ) : (
              <div className="grid gap-3">
                {recentQuotes.map((quote) => (
                  <Link
                    className="rounded-2xl border border-booth-line bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200"
                    href={`/contractor/quotes/${quote.id}`}
                    key={quote.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <StatusBadge status={quote.status} />
                        <h3 className="mt-3 text-lg font-black text-booth-ink">
                          {quote.quote_requests?.title ?? "견적 요청 정보 없음"}
                        </h3>
                        <p className="mt-2 text-sm font-bold text-booth-muted">
                          {quote.quote_requests?.exhibitions?.title ?? "전시회 정보 없음"}
                        </p>
                      </div>
                      <div className="text-right text-sm font-black text-booth-muted">
                        <p>{formatCurrency(quote.total_price)}</p>
                        <p>{quote.submitted_at ? new Date(quote.submitted_at).toLocaleDateString("ko-KR") : "제출일 없음"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DashboardPanel>
        </section>
      </main>
    </AppShell>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">
      <span>{label}</span>
      <span className="text-blue-200">{value}</span>
    </div>
  );
}

function DashboardPanel({
  title,
  href,
  action,
  children
}: {
  title: string;
  href: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-booth-ink">{title}</h2>
        <Link className="text-sm font-black text-booth-blue" href={href}>
          {action}
        </Link>
      </div>
      {children}
    </section>
  );
}
