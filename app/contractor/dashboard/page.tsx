import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { getCurrentContractor } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { listExhibitions, getExhibitionDDay, getExhibitionDisplayStatus } from "@/lib/exhibitions/queries";
import { daysUntil, formatCurrency, formatDateRange, formatDateTime } from "@/lib/format";
import { canSubmitQuote, listMyQuotes, listOpenQuoteRequests } from "@/lib/quotes/queries";
import type { Exhibition } from "@/types/exhibition";
import type { Quote } from "@/types/quote";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

type RequestWithQuote = QuoteRequest & {
  myQuote: Quote | null;
};

export default async function ContractorDashboardPage() {
  const context = await requireRole("contractor");
  const contractor = await getCurrentContractor(context.userId);
  let openRequests: QuoteRequest[] = [];
  let quotes: Quote[] = [];
  let exhibitions: Exhibition[] = [];
  let dashboardError = "";

  try {
    const [requests, myQuotes, upcomingExhibitions] = await Promise.all([
      listOpenQuoteRequests(),
      listMyQuotes(context.userId),
      listExhibitions({ status: "current", sort: "dateAsc", pageSize: 5 })
    ]);

    openRequests = requests
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    quotes = myQuotes;
    exhibitions = upcomingExhibitions.filter((exhibition) => exhibition.status !== "cancelled").slice(0, 5);
  } catch {
    dashboardError = "대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  const quoteByRequestId = new Map(quotes.map((quote) => [quote.quote_request_id, quote]));
  const recentRequests: RequestWithQuote[] = openRequests.slice(0, 5).map((request) => ({
    ...request,
    myQuote: quoteByRequestId.get(request.id) ?? null
  }));
  const draftQuotes = quotes.filter((quote) => quote.status === "draft");
  const submittedQuotes = quotes.filter((quote) => quote.status !== "draft");
  const selectedQuotes = quotes.filter((quote) => quote.status === "selected");
  const recentQuoteActivity = quotes.slice(0, 4);
  const quoteAllowed = canSubmitQuote(contractor);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black text-booth-blue">전시업체 대시보드</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-booth-ink md:text-5xl">
                모집 중인 부스 요청을 확인하고 견적을 제출하세요.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-booth-muted">
                최근 공개 요청, 작성 중인 견적, 제출 결과와 다가오는 전시 일정을 한곳에서 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200"
                href="/contractor/quote-requests"
              >
                공개 요청 전체 보기
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-booth-line bg-slate-50 px-5 py-3 text-sm font-black text-booth-ink transition hover:-translate-y-0.5 hover:border-blue-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100"
                href="/contractor/quotes"
              >
                제출한 견적 보기
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-800">
            구독 기능은 정식 운영 시 제공될 예정입니다. 현재 테스트 운영 기간에는 공개 요청 확인 기능을 제공합니다.
            {!quoteAllowed ? " 최종 제출 권한은 계정 상태 확인 후 활성화됩니다." : ""}
          </div>
        </section>

        {dashboardError ? (
          <div className="mt-6">
            <ErrorState title="정보를 불러오지 못했습니다." description={dashboardError} />
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="견적 현황 요약">
          <SummaryCard label="모집 중 공개 요청" value={openRequests.length} helper="마감 전 공개 요청" />
          <SummaryCard label="작성 중 견적" value={draftQuotes.length} helper="임시저장된 견적" />
          <SummaryCard label="제출한 견적" value={submittedQuotes.length} helper="기업에 공개된 견적" />
          <SummaryCard label="최종 선택된 견적" value={selectedQuotes.length} helper="선정 완료" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.9fr]">
          <DashboardPanel title="최근 공개 요청" href="/contractor/quote-requests" action="공개 요청 전체 보기">
            {recentRequests.length === 0 ? (
              <EmptyState
                title="현재 모집 중인 공개 요청이 없습니다."
                description="새로운 견적 요청이 등록되면 이곳에서 확인할 수 있습니다."
                actionHref="/exhibitions"
                actionLabel="다가오는 전시 일정 보기"
              />
            ) : (
              <div className="grid gap-3">
                {recentRequests.map((request) => (
                  <OpenRequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="견적 현황" href="/contractor/quotes" action="제출한 견적 보기">
            {recentQuoteActivity.length === 0 ? (
              <EmptyState
                title="아직 작성한 견적이 없습니다."
                description="공개 요청 상세에서 요청 조건을 확인한 뒤 견적을 작성할 수 있습니다."
                actionHref="/contractor/quote-requests"
                actionLabel="공개 요청 보기"
              />
            ) : (
              <div className="grid gap-3">
                {recentQuoteActivity.map((quote) => (
                  <QuoteActivityCard key={quote.id} quote={quote} />
                ))}
              </div>
            )}
          </DashboardPanel>
        </section>

        <section className="mt-6">
          <DashboardPanel title="다가오는 전시 일정" href="/exhibitions" action="전체 전시 일정 보기">
            {exhibitions.length === 0 ? (
              <EmptyState title="다가오는 전시 일정이 없습니다." description="전시 일정이 추가되면 이곳에서 확인할 수 있습니다." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {exhibitions.slice(0, 3).map((exhibition) => (
                  <ExhibitionCard key={exhibition.id} exhibition={exhibition} />
                ))}
              </div>
            )}
          </DashboardPanel>
        </section>
      </main>
    </AppShell>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-booth-muted">{label}</p>
      <p className="mt-3 text-3xl font-black text-booth-ink">{value.toLocaleString("ko-KR")}</p>
      <p className="mt-2 text-xs font-bold text-booth-muted">{helper}</p>
    </div>
  );
}

function OpenRequestCard({ request }: { request: RequestWithQuote }) {
  const remainingDays = daysUntil(request.deadline);
  const quote = request.myQuote;
  const cta = getRequestCta(request, quote);

  return (
    <article className="rounded-[24px] border border-booth-line bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white focus-within:ring-4 focus-within:ring-blue-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="open" label="모집 중" />
            {quote ? <StatusBadge status={quote.status} /> : <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">견적 미작성</span>}
            {remainingDays !== null ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                {remainingDays > 0 ? `${remainingDays}일 남음` : "오늘 마감"}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 line-clamp-2 text-lg font-black text-booth-ink">{request.title}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-booth-muted">
            {request.exhibitions?.title ?? "전시회 정보 없음"} · {request.exhibitions?.venue_group ?? request.exhibitions?.venue ?? "전시장 미정"}
          </p>
          <dl className="mt-3 grid gap-2 text-sm font-bold text-booth-muted sm:grid-cols-2">
            <InfoTerm label="부스 유형" value={request.booth_types.join(", ") || "미정"} />
            <InfoTerm label="부스 규모" value={`${request.booth_count ?? "-"}부스 / ${request.booth_area ?? "-"}㎡`} />
            <InfoTerm label="희망 예산" value={`${formatCurrency(request.budget_min)} ~ ${formatCurrency(request.budget_max)}`} />
            <InfoTerm label="견적 마감" value={formatDateTime(request.deadline)} />
          </dl>
          <p className="mt-3 text-xs font-bold text-booth-muted">요청 등록일 {formatDateTime(request.created_at)}</p>
        </div>
        <Link
          aria-label={`${request.title} ${cta.label}`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-booth-blue px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200"
          href={cta.href}
        >
          {cta.label}
        </Link>
      </div>
    </article>
  );
}

function QuoteActivityCard({ quote }: { quote: Quote }) {
  const href = quote.status === "draft" ? `/contractor/quote-requests/${quote.quote_request_id}/quote` : `/contractor/quotes/${quote.id}`;
  const action = quote.status === "draft" ? "작성 중인 견적 계속하기" : "제출한 견적 보기";

  return (
    <Link
      aria-label={`${quote.quote_requests?.title ?? "견적"} ${action}`}
      className="block rounded-2xl border border-booth-line bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100"
      href={href}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <StatusBadge status={quote.status} />
          <h3 className="mt-3 line-clamp-2 text-base font-black text-booth-ink">
            {quote.quote_requests?.title ?? "견적 요청 정보 없음"}
          </h3>
          <p className="mt-2 text-sm font-bold text-booth-muted">
            {quote.quote_requests?.exhibitions?.title ?? "전시회 정보 없음"}
          </p>
        </div>
        <div className="text-right text-sm font-black text-booth-muted">
          <p className="text-booth-ink">{formatCurrency(quote.total_price)}</p>
          <p>{quote.status === "draft" ? "임시저장" : quote.submitted_at ? formatDateTime(quote.submitted_at) : "제출일 미정"}</p>
        </div>
      </div>
      <span className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-booth-line bg-white px-3 text-xs font-black text-booth-ink">
        {action}
      </span>
    </Link>
  );
}

function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  const displayStatus = getExhibitionDisplayStatus(exhibition);
  const status = displayStatus === "ongoing" ? "진행 중" : "예정";

  return (
    <Link
      aria-label={`${exhibition.title} 전시 일정 보기`}
      className="block rounded-2xl border border-booth-line bg-slate-50 p-5 transition hover:border-blue-200 hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100"
      href={`/exhibitions/${exhibition.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={displayStatus} label={status} />
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-booth-blue ring-1 ring-blue-100">
          {getExhibitionDDay(exhibition)}
        </span>
      </div>
      <h3 className="mt-4 line-clamp-2 text-lg font-black text-booth-ink">{exhibition.title}</h3>
      <p className="mt-3 text-sm font-bold leading-6 text-booth-muted">
        {exhibition.venue_group ?? exhibition.venue ?? "전시장 미정"} · {exhibition.region ?? "지역 미정"}
      </p>
      <p className="mt-2 text-sm font-bold text-booth-muted">{formatDateRange(exhibition.start_date, exhibition.end_date)}</p>
      <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
        {exhibition.industry ?? "산업 미정"}
      </p>
    </Link>
  );
}

function InfoTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black text-slate-500">{label}</dt>
      <dd className="mt-1 text-booth-ink">{value}</dd>
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
    <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-booth-ink">{title}</h2>
        <Link className="text-sm font-black text-booth-blue hover:text-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100" href={href}>
          {action}
        </Link>
      </div>
      {children}
    </section>
  );
}

function getRequestCta(request: RequestWithQuote, quote: Quote | null) {
  const remainingDays = daysUntil(request.deadline);
  if (remainingDays !== null && remainingDays < 0) {
    return { href: `/contractor/quote-requests/${request.id}`, label: "마감됨" };
  }

  if (!quote) {
    return { href: `/contractor/quote-requests/${request.id}`, label: "요청 상세 보기" };
  }

  if (quote.status === "draft") {
    return { href: `/contractor/quote-requests/${request.id}/quote`, label: "작성 중인 견적 계속하기" };
  }

  return { href: `/contractor/quotes/${quote.id}`, label: "제출한 견적 보기" };
}
