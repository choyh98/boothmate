import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReceivedQuotesList } from "@/components/company-quotes/received-quotes-list";
import { formatDateRange } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { getMyQuoteRequest } from "@/lib/quote-requests/queries";
import { listCompanyQuotesForRequest } from "@/lib/company-quotes/queries";
import type { Quote } from "@/types/quote";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

export default async function CompanyReceivedQuotesPage({ params }: { params: { id: string } }) {
  const context = await requireRole("company");
  let request: QuoteRequest;
  let quotes: Quote[] = [];

  try {
    request = await getMyQuoteRequest(context.userId, params.id);
    quotes = await listCompanyQuotesForRequest(context.userId, params.id);
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href={`/company/quote-requests/${request.id}`}>
            요청 상세
          </Link>
          <span> / 받은 견적</span>
        </div>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-booth-blue">받은 견적 관리</p>
            <h1 className="mt-3 text-4xl font-black text-booth-ink">받은 견적</h1>
            <p className="mt-3 text-base font-semibold text-booth-muted">
              {request.title} · {request.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request.exhibitions?.start_date, request.exhibitions?.end_date)}
            </p>
          </div>
          <Link className="rounded-xl border border-booth-line bg-white px-5 py-3 text-sm font-black text-booth-ink shadow-sm" href={`/company/quote-requests/${request.id}/compare`}>
            전체 비교
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-sm">
            <p className="font-black text-booth-ink">아직 제출된 견적이 없습니다.</p>
          </div>
        ) : (
          <ReceivedQuotesList quoteRequestId={request.id} quotes={quotes} />
        )}
      </main>
    </AppShell>
  );
}
