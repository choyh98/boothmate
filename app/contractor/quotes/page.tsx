import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatCurrency, formatDateRange, statusLabel } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { listMySubmittedQuotes } from "@/lib/quotes/queries";
import type { Quote } from "@/types/quote";

export const dynamic = "force-dynamic";

export default async function ContractorQuotesPage() {
  const context = await requireRole("contractor");
  let quotes: Quote[] = [];
  let errorMessage = "";

  try {
    quotes = await listMySubmittedQuotes(context.userId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "제출한 견적 목록을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">Submitted Quotes</p>
            <h1 className="mt-3 text-4xl font-black text-booth-ink">제출한 견적</h1>
            <p className="mt-3 text-base font-semibold text-booth-muted">
              최종 제출한 견적과 진행 상태를 확인합니다.
            </p>
          </div>
          <Link className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm" href="/contractor/quote-requests">
            공개 요청 보기
          </Link>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && quotes.length === 0 ? (
          <div className="rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-sm">
            <p className="font-black text-booth-ink">아직 제출한 견적이 없습니다.</p>
            <Link className="mt-5 inline-flex rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" href="/contractor/quote-requests">
              공개 요청 보기
            </Link>
          </div>
        ) : null}

        <section className="grid gap-4">
          {quotes.map((quote) => (
            <Link
              className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
              href={`/contractor/quotes/${quote.id}`}
              key={quote.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
                    {statusLabel(quote.status)}
                  </span>
                  <h2 className="mt-3 text-xl font-black text-booth-ink">
                    {quote.quote_requests?.title ?? "견적 요청 정보 없음"}
                  </h2>
                  <p className="mt-2 text-sm font-bold text-booth-muted">
                    {quote.quote_requests?.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(quote.quote_requests?.exhibitions?.start_date, quote.quote_requests?.exhibitions?.end_date)}
                  </p>
                </div>
                <div className="text-right text-sm font-black text-booth-muted">
                  <p>{formatCurrency(quote.total_price)}</p>
                  <p>{quote.submitted_at ? new Date(quote.submitted_at).toLocaleString("ko-KR") : "제출일 없음"}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
