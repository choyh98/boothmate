import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/state";
import { formatCurrency, formatDateRange } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { getMyQuote } from "@/lib/quotes/queries";

export const dynamic = "force-dynamic";

export default async function ContractorQuoteDetailPage({ params }: { params: { id: string } }) {
  const context = await requireRole("contractor");
  let quote;

  try {
    quote = await getMyQuote(context.userId, params.id);
    if (quote.status === "draft") notFound();
  } catch {
    notFound();
  }

  const request = quote.quote_requests;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href="/contractor/quotes">
            제출한 견적
          </Link>
          <span> / 상세</span>
        </div>
        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
            <StatusBadge status={quote.status} />
            <h1 className="mt-5 text-3xl font-black text-booth-ink">
              {request?.title ?? "견적 요청 정보 없음"}
            </h1>
            <p className="mt-3 text-sm font-bold text-booth-muted">
              {request?.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request?.exhibitions?.start_date, request?.exhibitions?.end_date)}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Info label="총 견적 금액" value={formatCurrency(quote.total_price)} />
              <Info label="부가세" value={quote.vat_included ? "포함" : "별도"} />
              <Info label="부스 유형" value={quote.booth_type ?? "미정"} />
              <Info label="제출일" value={quote.submitted_at ? new Date(quote.submitted_at).toLocaleString("ko-KR") : "미정"} />
              <Info label="열람일" value={quote.viewed_at ? new Date(quote.viewed_at).toLocaleString("ko-KR") : "미정"} />
              <Info label="선택일" value={quote.selected_at ? new Date(quote.selected_at).toLocaleString("ko-KR") : "미정"} />
              <Info label="미선정일" value={quote.rejected_at ? new Date(quote.rejected_at).toLocaleString("ko-KR") : "미정"} />
              <Info label="1차 디자인 제공일" value={quote.first_design_date ?? "미정"} />
              <Info label="수정 가능 횟수" value={quote.revision_count !== null ? `${quote.revision_count}회` : "미정"} />
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
              <Info label="전기공사" value={formatCurrency(quote.electrical_cost)} />
              <Info label="그래픽" value={formatCurrency(quote.graphic_cost)} />
              <Info label="가구/비품" value={formatCurrency(quote.furniture_cost)} />
              <Info label="기타" value={formatCurrency(quote.other_cost)} />
            </div>

            <TextBlock label="제안 내용" value={quote.proposal} />
          </div>

          <aside className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-black text-booth-ink">요청 요약</h2>
            <div className="mt-5 grid gap-3">
              <Info label="부스 규모" value={`${request?.booth_count ?? "-"}부스 / ${request?.booth_area ?? "-"}㎡`} />
              <Info label="요청 부스 유형" value={request?.booth_types.join(", ") || "미정"} />
              <Info label="요청 예산" value={`${formatCurrency(request?.budget_min)} ~ ${formatCurrency(request?.budget_max)}`} />
              <Info label="요청 마감" value={request?.deadline ? new Date(request.deadline).toLocaleString("ko-KR") : "미정"} />
            </div>
            <Link className="mt-5 block rounded-xl border border-booth-line px-5 py-4 text-center text-sm font-black text-booth-ink" href="/contractor/quotes">
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
