import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { listAdminQuotes } from "@/lib/admin/queries";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPage() {
  await requireRole("admin");
  let quotes: Awaited<ReturnType<typeof listAdminQuotes>> = [];
  let errorMessage = "";

  try {
    quotes = await listAdminQuotes();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "제출 견적 목록을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <PageHeader title="제출 견적 관리" description="견적 금액과 상태는 조회만 가능하며 관리자 수정은 제공하지 않습니다." />
        {errorMessage ? <ErrorState title="조회 오류" description={errorMessage} /> : null}
        {quotes.length === 0 && !errorMessage ? <EmptyState title="제출 견적이 없습니다." /> : null}
        <div className="overflow-x-auto rounded-[24px] border border-white/80 bg-white shadow-sm">
          <table className="min-w-[1120px] w-full text-left">
            <thead className="bg-slate-50 text-sm font-black text-booth-muted">
              <tr>
                <th className="p-4">견적 ID</th>
                <th className="p-4">요청 정보</th>
                <th className="p-4">업체명</th>
                <th className="p-4">총 견적금액</th>
                <th className="p-4">상태</th>
                <th className="p-4">제출일</th>
                <th className="p-4">열람일</th>
                <th className="p-4">선택일</th>
                <th className="p-4">미선정일</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const request = relationOne(quote.quote_requests);
                const exhibition = relationOne(request?.exhibitions);
                const contractor = relationOne(quote.contractors);
                return (
                  <tr className="border-t border-booth-line text-sm font-bold text-booth-ink" key={quote.id}>
                    <td className="max-w-40 truncate p-4">{quote.id}</td>
                    <td className="p-4">
                      <p>{request?.title ?? "요청 없음"}</p>
                      <p className="text-xs text-booth-muted">{exhibition?.title ?? ""}</p>
                    </td>
                    <td className="p-4">{contractor?.company_name ?? "업체 정보 없음"}</td>
                    <td className="p-4">{formatCurrency(quote.total_price)}</td>
                    <td className="p-4"><StatusBadge status={quote.status} /></td>
                    <td className="p-4">{quote.submitted_at ? new Date(quote.submitted_at).toLocaleString("ko-KR") : "미정"}</td>
                    <td className="p-4">{quote.viewed_at ? new Date(quote.viewed_at).toLocaleString("ko-KR") : "미정"}</td>
                    <td className="p-4">{quote.selected_at ? new Date(quote.selected_at).toLocaleString("ko-KR") : "미정"}</td>
                    <td className="p-4">{quote.rejected_at ? new Date(quote.rejected_at).toLocaleString("ko-KR") : "미정"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </AppShell>
  );
}

function relationOne<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-black text-booth-blue">관리자</p>
      <h1 className="mt-3 text-4xl font-black text-booth-ink">{title}</h1>
      <p className="mt-3 text-base font-semibold text-booth-muted">{description}</p>
    </div>
  );
}
