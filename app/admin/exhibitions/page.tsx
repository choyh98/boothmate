import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { createExhibitionAction, updateExhibitionAction } from "@/app/admin/actions";
import { listAdminExhibitions } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/require-role";
import { statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { q?: string; status?: string; error?: string; success?: string };
};

const exhibitionStatuses = ["active", "inactive", "cancelled"];

export default async function AdminExhibitionsPage({ searchParams }: PageProps) {
  await requireRole("admin");
  let exhibitions: Awaited<ReturnType<typeof listAdminExhibitions>> = [];
  let errorMessage = "";

  try {
    exhibitions = await listAdminExhibitions({ query: searchParams?.q, status: searchParams?.status });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "전시회 목록을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <PageHeader title="전시회 관리" description="삭제 대신 비활성화를 사용합니다." />
        {searchParams?.error === "duplicate" ? <ErrorState title="중복 전시회" description="같은 이름, 장소, 시작일의 전시회가 이미 있습니다." /> : null}
        {errorMessage ? <ErrorState title="조회 오류" description={errorMessage} /> : null}
        <section className="mb-6 rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-booth-ink">신규 등록</h2>
          <ExhibitionForm action={createExhibitionAction} />
        </section>
        <form className="mb-5 flex flex-wrap gap-3">
          <input className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-bold" name="q" placeholder="전시회 검색" defaultValue={searchParams?.q ?? ""} />
          <select className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-bold" name="status" defaultValue={searchParams?.status ?? "all"}>
            <option value="all">전체 상태</option>
            {exhibitionStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
          <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" type="submit">필터</button>
        </form>
        {exhibitions.length === 0 && !errorMessage ? <EmptyState title="전시회가 없습니다." /> : null}
        <section className="grid gap-4">
          {exhibitions.map((item) => (
            <article className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm" key={item.id}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <StatusBadge status={item.status} />
                  <h2 className="mt-3 text-xl font-black text-booth-ink">{item.title}</h2>
                  <p className="mt-1 text-sm font-bold text-booth-muted">{item.venue_group ?? ""} {item.venue ?? ""} · {item.start_date ?? "일정 미정"}</p>
                </div>
                <p className="text-sm font-bold text-booth-muted">출처 {item.source ?? "미입력"} · 마지막 확인 {item.last_checked_at ? new Date(item.last_checked_at).toLocaleDateString("ko-KR") : "미확인"}</p>
              </div>
              <ExhibitionForm action={updateExhibitionAction} exhibition={item} />
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}

function ExhibitionForm({ action, exhibition }: { action: (formData: FormData) => void; exhibition?: any }) {
  return (
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-4">
      {exhibition ? <input name="id" type="hidden" value={exhibition.id} /> : null}
      <Input name="title" label="전시회명" required defaultValue={exhibition?.title} />
      <Input name="venue" label="장소" defaultValue={exhibition?.venue} />
      <Input name="venue_group" label="전시장" defaultValue={exhibition?.venue_group} />
      <Input name="region" label="지역" defaultValue={exhibition?.region} />
      <Input name="start_date" label="시작일" type="date" defaultValue={exhibition?.start_date} />
      <Input name="end_date" label="종료일" type="date" defaultValue={exhibition?.end_date} />
      <Input name="industry" label="업종" defaultValue={exhibition?.industry} />
      <Input name="organizer" label="주최" defaultValue={exhibition?.organizer} />
      <Input name="source_id" label="출처 ID" defaultValue={exhibition?.source_id} />
      <Input name="source" label="데이터 출처" defaultValue={exhibition?.source} />
      <Input name="homepage_url" label="홈페이지" defaultValue={exhibition?.homepage_url} />
      <Input name="last_checked_at" label="마지막 확인일" type="datetime-local" defaultValue={exhibition?.last_checked_at?.slice(0, 16)} />
      <label className="grid gap-2 text-sm font-black text-booth-ink">
        상태
        <select className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold" name="status" defaultValue={exhibition?.status ?? "active"}>
          {exhibitionStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select>
      </label>
      <div className="flex items-end">
        <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" type="submit">{exhibition ? "수정" : "등록"}</button>
      </div>
    </form>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-booth-ink">
      {label}
      <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold" {...props} />
    </label>
  );
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
