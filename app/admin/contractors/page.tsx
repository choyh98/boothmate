import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { updateContractorStatusAction } from "@/app/admin/actions";
import { getAdminContractor, listAdminContractors } from "@/lib/admin/queries";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { verification?: string; subscription?: string; contractorId?: string };
};

const verificationStatuses = ["pending", "approved", "rejected"];
const subscriptionStatuses = ["trial", "active", "inactive", "expired", "suspended", "cancelled"];

export default async function AdminContractorsPage({ searchParams }: PageProps) {
  await requireRole("admin");
  let contractors: Awaited<ReturnType<typeof listAdminContractors>> = [];
  let selectedContractor: Awaited<ReturnType<typeof getAdminContractor>> = null;
  let errorMessage = "";

  try {
    contractors = await listAdminContractors({
      verification: searchParams?.verification,
      subscription: searchParams?.subscription
    });
    selectedContractor = await getAdminContractor(searchParams?.contractorId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "업체 목록을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <PageHeader title="전시업체 관리" description="인증 상태와 구독 상태를 수동으로 관리합니다." />
        {errorMessage ? <ErrorState title="조회 오류" description={errorMessage} /> : null}
        <form className="mb-5 flex flex-wrap gap-3">
          <select className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-bold" name="verification" defaultValue={searchParams?.verification ?? "all"}>
            <option value="all">전체 인증 상태</option>
            {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-bold" name="subscription" defaultValue={searchParams?.subscription ?? "all"}>
            <option value="all">전체 구독 상태</option>
            {subscriptionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" type="submit">필터</button>
        </form>
        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-4">
            {contractors.length === 0 && !errorMessage ? <EmptyState title="전시업체가 없습니다." /> : null}
            {contractors.map((contractor) => (
              <Link className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200" href={`/admin/contractors?contractorId=${contractor.id}`} key={contractor.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex gap-2">
                      <StatusBadge status={contractor.verification_status} />
                      <StatusBadge status={contractor.subscription_status} />
                    </div>
                    <h2 className="mt-3 text-xl font-black text-booth-ink">{contractor.company_name}</h2>
                    <p className="mt-1 text-sm font-bold text-booth-muted">{relationOne(contractor.profiles)?.email ?? "이메일 없음"}</p>
                  </div>
                  <p className="text-sm font-black text-booth-muted">{formatCurrency(contractor.minimum_budget)}</p>
                </div>
              </Link>
            ))}
          </div>
          <aside className="self-start rounded-[24px] border border-white/80 bg-white p-5 shadow-sm lg:sticky lg:top-28">
            {selectedContractor ? (
              <ContractorDetail contractor={selectedContractor} />
            ) : (
              <EmptyState title="업체를 선택해주세요." description="목록에서 업체를 선택하면 상세 정보와 상태 변경 폼이 표시됩니다." />
            )}
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

function ContractorDetail({ contractor }: { contractor: any }) {
  const profile = relationOne(contractor.profiles);
  return (
    <div>
      <h2 className="text-xl font-black text-booth-ink">{contractor.company_name}</h2>
      <dl className="mt-5 grid gap-3">
        <Info label="이메일" value={profile?.email ?? "없음"} />
        <Info label="담당자" value={profile?.name ?? "없음"} />
        <Info label="사업자번호" value={contractor.business_number ?? "없음"} />
        <Info label="소개" value={contractor.description ?? "없음"} />
        <Info label="가입일" value={new Date(contractor.created_at).toLocaleString("ko-KR")} />
      </dl>
      <form action={updateContractorStatusAction} className="mt-5 grid gap-3">
        <input name="id" type="hidden" value={contractor.id} />
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          인증 상태
          <select className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold" name="verification_status" defaultValue={contractor.verification_status}>
            {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-booth-ink">
          구독 상태
          <select className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold" name="subscription_status" defaultValue={contractor.subscription_status}>
            {subscriptionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <ConfirmDialog
          buttonLabel="상태 변경"
          title="업체 상태를 변경할까요?"
          description="인증 상태와 구독 상태가 즉시 반영됩니다. 실제 결제 처리는 이번 단계에서 수행하지 않습니다."
        >
          <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" type="submit">
            변경 확정
          </button>
        </ConfirmDialog>
      </form>
    </div>
  );
}

function relationOne<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-black text-booth-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-black leading-6 text-booth-ink">{value}</dd>
    </div>
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
