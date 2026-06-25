import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { listAdminUsers } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole("admin");
  let users: Awaited<ReturnType<typeof listAdminUsers>> = [];
  let errorMessage = "";

  try {
    users = await listAdminUsers();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "사용자 목록을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <PageHeader title="사용자 관리" description="역할은 조회만 가능하며 이 화면에서 변경하지 않습니다." />
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-bold leading-7 text-blue-800">
          인증 사용자와 프로필 누락 비교 기능은 서버 전용 관리자 API가 연결된 이후 제공됩니다.
        </div>
        {errorMessage ? <ErrorState title="조회 오류" description={errorMessage} /> : null}
        {users.length === 0 && !errorMessage ? <EmptyState title="사용자가 없습니다." /> : null}
        <div className="overflow-x-auto rounded-[24px] border border-white/80 bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-left">
            <thead className="bg-slate-50 text-sm font-black text-booth-muted">
              <tr>
                <th className="p-4">이름</th>
                <th className="p-4">이메일</th>
                <th className="p-4">role</th>
                <th className="p-4">가입일</th>
                <th className="p-4">company 연결</th>
                <th className="p-4">contractor 연결</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="border-t border-booth-line text-sm font-bold text-booth-ink" key={user.id}>
                  <td className="p-4">{user.name ?? "이름 없음"}</td>
                  <td className="p-4">{user.email ?? "이메일 없음"}</td>
                  <td className="p-4"><StatusBadge status={user.role} /></td>
                  <td className="p-4">{new Date(user.created_at).toLocaleString("ko-KR")}</td>
                  <td className="p-4">{user.company ? user.company.company_name : "없음"}</td>
                  <td className="p-4">{user.contractor ? user.contractor.company_name : "없음"}</td>
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
