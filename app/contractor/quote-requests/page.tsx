import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatCurrency, formatDateRange } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { listOpenQuoteRequests } from "@/lib/quotes/queries";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

export default async function ContractorQuoteRequestsPage() {
  await requireRole("contractor");
  let requests: QuoteRequest[] = [];
  let errorMessage = "";

  try {
    requests = await listOpenQuoteRequests();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "공개 견적 요청을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">Open Requests</p>
          <h1 className="mt-3 text-4xl font-black text-booth-ink">공개 견적 요청</h1>
          <p className="mt-3 text-base font-semibold text-booth-muted">
            현재 모집 중이고 마감되지 않은 요청만 표시됩니다.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && requests.length === 0 ? (
          <div className="rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-sm">
            <p className="font-black text-booth-ink">현재 공개된 견적 요청이 없습니다.</p>
          </div>
        ) : null}

        <section className="grid gap-4">
          {requests.map((request) => (
            <Link
              className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
              href={`/contractor/quote-requests/${request.id}`}
              key={request.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
                    견적 모집중
                  </span>
                  <h2 className="mt-3 text-xl font-black text-booth-ink">{request.title}</h2>
                  <p className="mt-2 text-sm font-bold text-booth-muted">
                    {request.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request.exhibitions?.start_date, request.exhibitions?.end_date)}
                  </p>
                </div>
                <div className="text-right text-sm font-black text-booth-muted">
                  <p>{request.booth_count ?? "-"}부스</p>
                  <p>{formatCurrency(request.budget_max)}</p>
                  <p>{request.deadline ? new Date(request.deadline).toLocaleString("ko-KR") : "마감 미정"}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
