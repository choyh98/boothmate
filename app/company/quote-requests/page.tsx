import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/state";
import { formatCurrency, formatDateRange } from "@/lib/format";
import { listMyQuoteRequests } from "@/lib/quote-requests/queries";
import { requireRole } from "@/lib/auth/require-role";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

export default async function MyQuoteRequestsPage() {
  const context = await requireRole("company");
  let requests: QuoteRequest[] = [];
  let errorMessage = "";

  try {
    requests = await listMyQuoteRequests(context.userId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "견적 요청 목록을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-booth-blue">견적 요청 관리</p>
            <h1 className="mt-3 text-4xl font-black text-booth-ink">내 견적 요청</h1>
            <p className="mt-3 text-base font-semibold text-booth-muted">
              임시저장과 제출 완료 요청을 Supabase에서 다시 불러옵니다.
            </p>
          </div>
          <Link className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm" href="/company/quote-requests/new">
            새 견적 요청
          </Link>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && requests.length === 0 ? (
          <div className="rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-sm">
            <p className="font-black text-booth-ink">아직 작성한 견적 요청이 없습니다.</p>
            <Link className="mt-5 inline-flex rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" href="/exhibitions">
              전시회 선택하러 가기
            </Link>
          </div>
        ) : null}

        <section className="grid gap-4">
          {requests.map((request) => (
            <Link className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft" href={`/company/quote-requests/${request.id}`} key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <StatusBadge status={request.status} />
                  <h2 className="mt-3 text-xl font-black text-booth-ink">{request.title}</h2>
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
        </section>
      </main>
    </AppShell>
  );
}
