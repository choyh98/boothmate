import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SelectQuoteButton } from "@/components/company-quotes/select-quote-button";
import { formatCurrency, statusLabel } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { getMyQuoteRequest } from "@/lib/quote-requests/queries";
import { listCompanyQuotesForCompare } from "@/lib/company-quotes/queries";
import type { Quote } from "@/types/quote";

export const dynamic = "force-dynamic";

type ComparePageProps = {
  params: { id: string };
  searchParams?: { quotes?: string };
};

const rows: Array<[string, (quote: Quote) => string]> = [
  ["업체명", (quote) => quote.contractor_profile?.company_name ?? "공개 프로필 미승인 업체"],
  ["인증 상태", (quote) => quote.contractor_profile?.verification_status ?? "비공개"],
  ["총 견적금액", (quote) => formatCurrency(quote.total_price)],
  ["부가세 여부", (quote) => (quote.vat_included ? "포함" : "별도")],
  ["부스 유형", (quote) => quote.booth_type ?? "미정"],
  ["디자인비", (quote) => formatCurrency(quote.design_cost)],
  ["자재비", (quote) => formatCurrency(quote.material_cost)],
  ["제작비", (quote) => formatCurrency(quote.construction_cost)],
  ["운송비", (quote) => formatCurrency(quote.transport_cost)],
  ["설치비", (quote) => formatCurrency(quote.installation_cost)],
  ["철거비", (quote) => formatCurrency(quote.dismantling_cost)],
  ["전기 및 조명", (quote) => formatCurrency(quote.electrical_cost)],
  ["그래픽 출력", (quote) => formatCurrency(quote.graphic_cost)],
  ["집기", (quote) => formatCurrency(quote.furniture_cost)],
  ["기타 비용", (quote) => formatCurrency(quote.other_cost)],
  ["포함 항목", (quote) => quote.included_items ?? "미정"],
  ["불포함 항목", (quote) => quote.excluded_items ?? "미정"],
  ["1차 디자인 제공일", (quote) => quote.first_design_date ?? "미정"],
  ["수정 가능 횟수", (quote) => quote.revision_count !== null ? `${quote.revision_count}회` : "미정"],
  ["제작 기간", (quote) => quote.production_days !== null ? `${quote.production_days}일` : "미정"],
  ["견적 유효기간", (quote) => quote.valid_until ?? "미정"]
];

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

export default async function CompanyQuoteComparePage({ params, searchParams }: ComparePageProps) {
  const context = await requireRole("company");
  const quoteIds = quoteIdsFromParam(searchParams?.quotes);
  let request;
  let quotes: Quote[] = [];

  try {
    request = await getMyQuoteRequest(context.userId, params.id);
    quotes = await listCompanyQuotesForCompare(context.userId, params.id, quoteIds);
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href={`/company/quote-requests/${request.id}/quotes`}>
            받은 견적
          </Link>
          <span> / 비교</span>
        </div>
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">Compare</p>
          <h1 className="mt-3 text-4xl font-black text-booth-ink">견적 비교</h1>
          <p className="mt-3 text-base font-semibold text-booth-muted">{request.title}</p>
        </div>

        {quotes.length === 0 ? (
          <div className="rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-sm">
            <p className="font-black text-booth-ink">비교할 견적이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-white/80 bg-white shadow-sm">
            <table className="min-w-[980px] w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="w-48 border-b border-booth-line bg-slate-50 p-4 text-sm font-black text-booth-muted">항목</th>
                  {quotes.map((quote) => (
                    <th className="border-b border-booth-line p-4 align-top" key={quote.id}>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
                        {statusLabel(quote.status)}
                      </span>
                      <p className="mt-3 text-base font-black text-booth-ink">
                        {quote.contractor_profile?.company_name ?? "공개 프로필 미승인 업체"}
                      </p>
                      <Link className="mt-3 inline-flex rounded-xl border border-booth-line px-3 py-2 text-xs font-black text-booth-ink" href={`/company/quotes/${quote.id}`}>
                        상세
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, getValue]) => (
                  <tr key={label}>
                    <th className="border-b border-booth-line bg-slate-50 p-4 text-sm font-black text-booth-muted">{label}</th>
                    {quotes.map((quote) => (
                      <td className="max-w-72 whitespace-pre-wrap border-b border-booth-line p-4 text-sm font-bold leading-7 text-booth-ink" key={quote.id}>
                        {getValue(quote)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th className="bg-slate-50 p-4 text-sm font-black text-booth-muted">선택</th>
                  {quotes.map((quote) => {
                    const disabledReason = request.selected_quote_id
                      ? "이미 최종 업체가 선택된 요청입니다."
                      : isExpired(quote.valid_until)
                        ? "견적 유효기간이 지나 선택할 수 없습니다."
                        : quote.status === "withdrawn"
                          ? "철회된 견적은 선택할 수 없습니다."
                          : quote.status === "rejected"
                            ? "이미 미선정 처리된 견적입니다."
                            : null;
                    return (
                      <td className="p-4 align-top" key={quote.id}>
                        <SelectQuoteButton
                          contractorName={quote.contractor_profile?.company_name ?? "공개 프로필 미승인 업체"}
                          disabled={Boolean(disabledReason)}
                          disabledReason={disabledReason ?? undefined}
                          quoteId={quote.id}
                          quoteRequestId={request.id}
                          totalPrice={quote.total_price}
                        />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AppShell>
  );
}
