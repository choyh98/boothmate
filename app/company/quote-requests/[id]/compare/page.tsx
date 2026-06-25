import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SelectQuoteButton } from "@/components/company-quotes/select-quote-button";
import { EmptyState, StatusBadge } from "@/components/ui/state";
import { daysUntil, formatCurrency, formatDateRange } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { getMyQuoteRequest } from "@/lib/quote-requests/queries";
import { listCompanyQuotesForCompare } from "@/lib/company-quotes/queries";
import type { Quote } from "@/types/quote";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

type ComparePageProps = {
  params: { id: string };
  searchParams?: { quotes?: string };
};

const rows: Array<{
  group: string;
  label: string;
  getValue: (quote: Quote) => string;
  highlight?: (quote: Quote, context: CompareContext) => string | null;
}> = [
  { group: "업체", label: "업체명", getValue: (quote) => quote.contractor_profile?.company_name ?? "공개 프로필 미승인 업체" },
  { group: "업체", label: "인증 상태", getValue: (quote) => quote.contractor_profile?.verification_status ?? "비공개" },
  {
    group: "금액",
    label: "총 견적금액",
    getValue: (quote) => formatCurrency(quote.total_price),
    highlight: (quote, context) => quote.total_price && quote.total_price === context.lowestPrice ? "최저가" : null
  },
  { group: "금액", label: "부가세 여부", getValue: (quote) => (quote.vat_included ? "포함" : "별도") },
  { group: "부스", label: "부스 유형", getValue: (quote) => quote.booth_type ?? "미정" },
  { group: "세부 비용", label: "디자인비", getValue: (quote) => formatCurrency(quote.design_cost) },
  { group: "세부 비용", label: "자재비", getValue: (quote) => formatCurrency(quote.material_cost) },
  { group: "세부 비용", label: "제작비", getValue: (quote) => formatCurrency(quote.construction_cost) },
  { group: "세부 비용", label: "운송비", getValue: (quote) => formatCurrency(quote.transport_cost) },
  { group: "세부 비용", label: "설치비", getValue: (quote) => formatCurrency(quote.installation_cost) },
  { group: "세부 비용", label: "철거비", getValue: (quote) => formatCurrency(quote.dismantling_cost) },
  { group: "세부 비용", label: "전기 및 조명", getValue: (quote) => formatCurrency(quote.electrical_cost) },
  { group: "세부 비용", label: "그래픽 출력", getValue: (quote) => formatCurrency(quote.graphic_cost) },
  { group: "세부 비용", label: "집기", getValue: (quote) => formatCurrency(quote.furniture_cost) },
  { group: "세부 비용", label: "기타 비용", getValue: (quote) => formatCurrency(quote.other_cost) },
  { group: "범위", label: "포함 항목", getValue: (quote) => quote.included_items ?? "미정" },
  { group: "범위", label: "불포함 항목", getValue: (quote) => quote.excluded_items ?? "미정" },
  { group: "일정", label: "1차 디자인 제공일", getValue: (quote) => quote.first_design_date ?? "미정" },
  { group: "일정", label: "수정 가능 횟수", getValue: (quote) => quote.revision_count !== null ? `${quote.revision_count}회` : "미정" },
  {
    group: "일정",
    label: "제작 기간",
    getValue: (quote) => quote.production_days !== null ? `${quote.production_days}일` : "미정",
    highlight: (quote, context) => quote.production_days && quote.production_days === context.fastestProductionDays ? "가장 빠름" : null
  },
  {
    group: "유효성",
    label: "견적 유효기간",
    getValue: (quote) => quote.valid_until ?? "미정",
    highlight: (quote) => {
      const remaining = daysUntil(quote.valid_until);
      if (remaining === null) return null;
      if (remaining < 0) return "만료";
      if (remaining <= 3) return `${remaining}일 남음`;
      return null;
    }
  }
];

type CompareContext = {
  lowestPrice: number | null;
  fastestProductionDays: number | null;
};

function quoteIdsFromParam(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function isExpired(validUntil: string | null) {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() < new Date(new Date().toDateString()).getTime();
}

function minPositive(values: Array<number | null>) {
  const validValues = values.filter((value): value is number => typeof value === "number" && value > 0);
  return validValues.length ? Math.min(...validValues) : null;
}

function disabledReasonForQuote(request: QuoteRequest, quote: Quote) {
  if (request.selected_quote_id) return "이미 최종 업체가 선택된 요청입니다.";
  if (isExpired(quote.valid_until)) return "견적 유효기간이 지나 선택할 수 없습니다.";
  if (quote.status === "withdrawn") return "철회된 견적은 선택할 수 없습니다.";
  if (quote.status === "rejected") return "이미 미선정 처리된 견적입니다.";
  return null;
}

export default async function CompanyQuoteComparePage({ params, searchParams }: ComparePageProps) {
  const context = await requireRole("company");
  const quoteIds = quoteIdsFromParam(searchParams?.quotes);
  let request: QuoteRequest;
  let quotes: Quote[] = [];

  try {
    request = await getMyQuoteRequest(context.userId, params.id);
    quotes = await listCompanyQuotesForCompare(context.userId, params.id, quoteIds);
  } catch {
    notFound();
  }

  const compareContext: CompareContext = {
    lowestPrice: minPositive(quotes.map((quote) => quote.total_price)),
    fastestProductionDays: minPositive(quotes.map((quote) => quote.production_days))
  };
  const expiredCount = quotes.filter((quote) => isExpired(quote.valid_until)).length;
  const selectableCount = quotes.filter((quote) => !disabledReasonForQuote(request, quote)).length;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href={`/company/quote-requests/${request.id}/quotes`}>
            받은 견적
          </Link>
          <span> / 견적 비교</span>
        </div>

        <section className="mb-6 rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-black text-booth-blue">견적 비교</p>
              <h1 className="mt-3 text-4xl font-black text-booth-ink">{request.title}</h1>
              <p className="mt-3 text-sm font-bold leading-6 text-booth-muted">
                {request.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request.exhibitions?.start_date, request.exhibitions?.end_date)}
              </p>
            </div>
            <Link className="rounded-xl border border-booth-line bg-slate-50 px-5 py-3 text-sm font-black text-booth-ink" href={`/company/quote-requests/${request.id}/quotes`}>
              비교 대상 다시 선택
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <DecisionMetric label="비교 견적" value={`${quotes.length}개`} />
            <DecisionMetric label="최저 금액" value={formatCurrency(compareContext.lowestPrice)} />
            <DecisionMetric label="가장 빠른 제작" value={compareContext.fastestProductionDays ? `${compareContext.fastestProductionDays}일` : "미정"} />
            <DecisionMetric label="선택 가능" value={`${selectableCount}개`} warning={expiredCount > 0 ? `만료 ${expiredCount}개` : undefined} />
          </div>
        </section>

        {quotes.length === 0 ? (
          <EmptyState title="비교할 견적이 없습니다." actionHref={`/company/quote-requests/${request.id}/quotes`} actionLabel="받은 견적 보기" />
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-white/80 bg-white shadow-sm">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 w-52 border-b border-booth-line bg-slate-50 p-4 text-sm font-black text-booth-muted">
                    비교 항목
                  </th>
                  {quotes.map((quote) => {
                    const disabledReason = disabledReasonForQuote(request, quote);
                    return (
                      <th className="sticky top-0 z-10 min-w-[240px] border-b border-booth-line bg-white p-4 align-top" key={quote.id}>
                        <StatusBadge status={quote.status} />
                        <p className="mt-3 text-base font-black text-booth-ink">
                          {quote.contractor_profile?.company_name ?? "공개 프로필 미승인 업체"}
                        </p>
                        <p className="mt-2 text-2xl font-black text-booth-ink">{formatCurrency(quote.total_price)}</p>
                        <p className="mt-1 text-xs font-bold text-booth-muted">
                          {quote.vat_included ? "부가세 포함" : "부가세 별도"} · {quote.valid_until ?? "유효기간 미정"}
                        </p>
                        <div className="mt-4 grid gap-2">
                          <SelectQuoteButton
                            contractorName={quote.contractor_profile?.company_name ?? "공개 프로필 미승인 업체"}
                            disabled={Boolean(disabledReason)}
                            disabledReason={disabledReason ?? undefined}
                            quoteId={quote.id}
                            quoteRequestId={request.id}
                            totalPrice={quote.total_price}
                          />
                          <Link className="rounded-xl border border-booth-line px-3 py-2 text-center text-xs font-black text-booth-ink" href={`/company/quotes/${quote.id}`}>
                            상세 보기
                          </Link>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.group}-${row.label}`}>
                    <th className="sticky left-0 z-10 border-b border-booth-line bg-slate-50 p-4 align-top">
                      <span className="block text-xs font-black text-booth-blue">{row.group}</span>
                      <span className="mt-1 block text-sm font-black text-booth-muted">{row.label}</span>
                    </th>
                    {quotes.map((quote) => {
                      const highlight = row.highlight?.(quote, compareContext);
                      return (
                        <td className="max-w-72 whitespace-pre-wrap border-b border-booth-line p-4 align-top text-sm font-bold leading-7 text-booth-ink" key={quote.id}>
                          <div className={highlight ? "rounded-xl bg-blue-50 p-3" : ""}>
                            <span>{row.getValue(quote)}</span>
                            {highlight ? (
                              <span className="mt-2 block w-fit rounded-full bg-white px-2 py-1 text-xs font-black text-booth-blue ring-1 ring-blue-200">
                                {highlight}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AppShell>
  );
}

function DecisionMetric({ label, value, warning }: { label: string; value: string; warning?: string }) {
  return (
    <div className="rounded-2xl border border-booth-line bg-slate-50 p-4">
      <p className="text-xs font-black text-booth-muted">{label}</p>
      <p className="mt-2 text-xl font-black text-booth-ink">{value}</p>
      {warning ? <p className="mt-1 text-xs font-black text-amber-700">{warning}</p> : null}
    </div>
  );
}
