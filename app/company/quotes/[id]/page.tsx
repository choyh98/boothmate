import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SelectQuoteButton } from "@/components/company-quotes/select-quote-button";
import { markQuoteViewedAction } from "@/app/company/quotes/actions";
import { formatCurrency, formatDateRange, statusLabel } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { getCompanyQuote } from "@/lib/company-quotes/queries";

export const dynamic = "force-dynamic";

function isExpired(validUntil: string | null) {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() < new Date(new Date().toDateString()).getTime();
}

export default async function CompanyQuoteDetailPage({ params }: { params: { id: string } }) {
  const context = await requireRole("company");
  let quote;

  try {
    quote = await getCompanyQuote(context.userId, params.id);
    await markQuoteViewedAction(params.id);
  } catch {
    notFound();
  }

  const request = quote.quote_requests;
  const profile = quote.contractor_profile;
  const requestSelected = Boolean(request?.selected_quote_id);
  const expired = isExpired(quote.valid_until);
  const disabledReason = requestSelected
    ? "이미 최종 업체가 선택된 요청입니다."
    : expired
      ? "견적 유효기간이 지나 선택할 수 없습니다."
      : quote.status === "withdrawn"
        ? "철회된 견적은 선택할 수 없습니다."
        : quote.status === "rejected"
          ? "이미 미선정 처리된 견적입니다."
          : null;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href={request ? `/company/quote-requests/${request.id}/quotes` : "/company/quote-requests"}>
            받은 견적
          </Link>
          <span> / 상세</span>
        </div>
        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
              {statusLabel(quote.status)}
            </span>
            <h1 className="mt-5 text-3xl font-black text-booth-ink">
              {profile?.company_name ?? "공개 프로필 미승인 업체"}
            </h1>
            <p className="mt-3 text-sm font-bold text-booth-muted">
              {request?.title ?? "요청 정보 없음"} · {request?.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request?.exhibitions?.start_date, request?.exhibitions?.end_date)}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Info label="총 견적 금액" value={formatCurrency(quote.total_price)} />
              <Info label="부가세" value={quote.vat_included ? "포함" : "별도"} />
              <Info label="부스 유형" value={quote.booth_type ?? "미정"} />
              <Info label="인증 상태" value={profile?.verification_status ?? "비공개"} />
              <Info label="1차 디자인 제공일" value={quote.first_design_date ?? "미정"} />
              <Info label="수정 가능 횟수" value={quote.revision_count !== null ? `${quote.revision_count}회` : "미정"} />
              <Info label="제작 기간" value={quote.production_days !== null ? `${quote.production_days}일` : "미정"} />
              <Info label="견적 유효기간" value={quote.valid_until ?? "미정"} />
            </div>

            <h2 className="mt-8 text-lg font-black text-booth-ink">상세 비용</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Info label="디자인비" value={formatCurrency(quote.design_cost)} />
              <Info label="자재비" value={formatCurrency(quote.material_cost)} />
              <Info label="제작비" value={formatCurrency(quote.construction_cost)} />
              <Info label="운송비" value={formatCurrency(quote.transport_cost)} />
              <Info label="설치비" value={formatCurrency(quote.installation_cost)} />
              <Info label="철거비" value={formatCurrency(quote.dismantling_cost)} />
              <Info label="전기 및 조명" value={formatCurrency(quote.electrical_cost)} />
              <Info label="그래픽 출력" value={formatCurrency(quote.graphic_cost)} />
              <Info label="집기" value={formatCurrency(quote.furniture_cost)} />
              <Info label="기타 비용" value={formatCurrency(quote.other_cost)} />
            </div>

            <TextBlock label="포함 항목" value={quote.included_items} />
            <TextBlock label="불포함 항목" value={quote.excluded_items} />
            <TextBlock label="제안 내용" value={quote.proposal} />
          </div>

          <aside className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-black text-booth-ink">업체 프로필</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-booth-muted">
              {profile?.description ?? "공개된 업체 소개가 없습니다."}
            </p>
            <div className="mt-5 grid gap-3">
              <Info label="서비스 지역" value={profile?.service_regions.join(", ") || "비공개"} />
              <Info label="전문 부스" value={profile?.booth_types.join(", ") || "비공개"} />
              <Info label="최소 예산" value={formatCurrency(profile?.minimum_budget)} />
            </div>
            {request ? (
              <div className="mt-5">
                <SelectQuoteButton
                  contractorName={profile?.company_name ?? "공개 프로필 미승인 업체"}
                  disabled={Boolean(disabledReason)}
                  disabledReason={disabledReason ?? undefined}
                  quoteId={quote.id}
                  quoteRequestId={request.id}
                  totalPrice={quote.total_price}
                />
              </div>
            ) : null}
            <Link className="mt-3 block rounded-xl border border-booth-line px-5 py-4 text-center text-sm font-black text-booth-ink" href={request ? `/company/quote-requests/${request.id}/quotes` : "/company/quote-requests"}>
              목록으로
            </Link>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-booth-line bg-slate-50 p-5">
      <p className="text-xs font-black text-booth-muted">{label}</p>
      <p className="mt-2 text-base font-black text-booth-ink">{value}</p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mt-6 rounded-2xl bg-slate-50 p-5">
      <p className="text-sm font-black text-booth-muted">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-7 text-booth-ink">
        {value ?? "작성된 내용이 없습니다."}
      </p>
    </div>
  );
}
