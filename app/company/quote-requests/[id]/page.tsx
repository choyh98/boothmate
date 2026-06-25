import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { continueDraftAction } from "@/app/company/quote-requests/actions";
import { formatCurrency, formatDateRange, statusLabel } from "@/lib/format";
import { getMyQuoteRequest } from "@/lib/quote-requests/queries";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function QuoteRequestDetailPage({ params }: { params: { id: string } }) {
  const context = await requireRole("company");
  let request;

  try {
    request = await getMyQuoteRequest(context.userId, params.id);
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href="/company/quote-requests">
            내 견적 요청
          </Link>
          <span> / 상세</span>
        </div>
        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
              {statusLabel(request.status)}
            </span>
            <h1 className="mt-5 text-3xl font-black text-booth-ink">{request.title}</h1>
            <p className="mt-3 text-sm font-bold text-booth-muted">
              {request.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request.exhibitions?.start_date, request.exhibitions?.end_date)}
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Info label="부스 규모" value={`${request.booth_count ?? "-"}부스 / ${request.booth_area ?? "-"}㎡`} />
              <Info label="오픈 면" value={request.open_sides ?? "미정"} />
              <Info label="부스 유형" value={request.booth_types.join(", ") || "미정"} />
              <Info label="예산" value={`${formatCurrency(request.budget_min)} ~ ${formatCurrency(request.budget_max)}`} />
              <Info label="디자인" value={request.design_styles.join(", ") || "미정"} />
              <Info label="견적 마감" value={request.deadline ? new Date(request.deadline).toLocaleString("ko-KR") : "미정"} />
            </div>
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-black text-booth-muted">요청사항</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-7 text-booth-ink">
                {request.requirements ?? "작성된 요청사항이 없습니다."}
              </p>
            </div>
          </div>
          <aside className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-black text-booth-ink">요청 상태</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-booth-muted">
              {request.status === "draft"
                ? "임시저장 상태입니다. 이어서 작성한 뒤 최종 제출할 수 있습니다."
                : "제출 완료된 요청입니다. 받은 견적을 확인하고 비교할 수 있습니다."}
            </p>
            {request.status === "draft" ? (
              <form action={continueDraftAction} className="mt-5">
                <input name="id" type="hidden" value={request.id} />
                <button className="w-full rounded-xl bg-booth-blue px-5 py-4 text-sm font-black text-white" type="submit">
                  이어서 작성
                </button>
              </form>
            ) : null}
            {request.status !== "draft" ? (
              <Link className="mt-5 block rounded-xl bg-booth-blue px-5 py-4 text-center text-sm font-black text-white" href={`/company/quote-requests/${request.id}/quotes`}>
                받은 견적 보기
              </Link>
            ) : null}
            <Link className="mt-3 block rounded-xl border border-booth-line px-5 py-4 text-center text-sm font-black text-booth-ink" href="/company/quote-requests">
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
