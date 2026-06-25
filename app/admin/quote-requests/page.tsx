import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { listAdminQuoteRequests } from "@/lib/admin/queries";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function AdminQuoteRequestsPage() {
  await requireRole("admin");
  let requests: Awaited<ReturnType<typeof listAdminQuoteRequests>> = [];
  let errorMessage = "";

  try {
    requests = await listAdminQuoteRequests();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "견적 요청 목록을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <PageHeader title="견적 요청 관리" description="요청 상태와 제출 견적 수를 조회합니다. 상태 임의 수정은 제공하지 않습니다." />
        {errorMessage ? <ErrorState title="조회 오류" description={errorMessage} /> : null}
        {requests.length === 0 && !errorMessage ? <EmptyState title="견적 요청이 없습니다." /> : null}
        <div className="overflow-x-auto rounded-[24px] border border-white/80 bg-white shadow-sm">
          <table className="min-w-[1180px] w-full text-left">
            <thead className="bg-slate-50 text-sm font-black text-booth-muted">
              <tr>
                <th className="p-4">요청 ID</th>
                <th className="p-4">참여기업</th>
                <th className="p-4">전시회</th>
                <th className="p-4">부스 규모</th>
                <th className="p-4">예산</th>
                <th className="p-4">상태</th>
                <th className="p-4">마감일</th>
                <th className="p-4">제출 견적 수</th>
                <th className="p-4">선택 견적</th>
                <th className="p-4">생성일</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr className="border-t border-booth-line text-sm font-bold text-booth-ink" key={request.id}>
                  <td className="max-w-40 truncate p-4">{request.id}</td>
                  <td className="p-4">{request.company_name}</td>
                  <td className="p-4">{request.exhibition_title ?? "없음"}</td>
                  <td className="p-4">{request.booth_count ?? "-"}부스 / {request.booth_area ?? "-"}㎡</td>
                  <td className="p-4">{formatCurrency(request.budget_min)} ~ {formatCurrency(request.budget_max)}</td>
                  <td className="p-4"><StatusBadge status={request.status} /></td>
                  <td className="p-4">{request.deadline ? new Date(request.deadline).toLocaleString("ko-KR") : "미정"}</td>
                  <td className="p-4">{request.submitted_quote_count}</td>
                  <td className="p-4">{request.selected_contractor_name ?? request.selected_quote_id ?? "없음"}</td>
                  <td className="p-4">{new Date(request.created_at).toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppShell>
  );
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">Admin</p>
      <h1 className="mt-3 text-4xl font-black text-booth-ink">{title}</h1>
      <p className="mt-3 text-base font-semibold text-booth-muted">{description}</p>
    </div>
  );
}
