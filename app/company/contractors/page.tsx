import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { getContractorFilterOptions, listPublicContractors } from "@/lib/contractors/queries";
import type { ContractorPublicProfile } from "@/types/quote";

export const dynamic = "force-dynamic";

type CompanyContractorsPageProps = {
  searchParams?: {
    q?: string;
    region?: string;
    boothType?: string;
  };
};

export default async function CompanyContractorsPage({ searchParams }: CompanyContractorsPageProps) {
  await requireRole("company");

  const query = searchParams?.q ?? "";
  const region = searchParams?.region ?? "all";
  const boothType = searchParams?.boothType ?? "all";
  let contractors: ContractorPublicProfile[] = [];
  let options = { regions: [] as string[], boothTypes: [] as string[] };
  let errorMessage = "";

  try {
    const [items, filterOptions] = await Promise.all([
      listPublicContractors({ query, region, boothType }),
      getContractorFilterOptions()
    ]);
    contractors = items;
    options = filterOptions;
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "전시업체 목록을 불러오지 못했습니다.";
  }

  const hasFilters = Boolean(query || region !== "all" || boothType !== "all");

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-booth-blue">인증 전시업체</p>
            <h1 className="mt-3 text-4xl font-black text-booth-ink">전시업체 찾기</h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-booth-muted">
              관리자 인증을 통과한 업체의 공개 정보만 확인할 수 있습니다. 견적은 공개 요청을 통해 받는 구조입니다.
            </p>
          </div>
          <Link className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm" href="/exhibitions">
            전시 일정에서 요청하기
          </Link>
        </div>

        <section className="mb-6 rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]" action="/company/contractors">
            <input
              className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-bold outline-none focus:border-booth-blue"
              defaultValue={query}
              name="q"
              placeholder="업체명, 소개, 지역, 부스 유형 검색"
              type="search"
            />
            <FilterSelect label="서비스 지역" name="region" options={options.regions} value={region} />
            <FilterSelect label="부스 유형" name="boothType" options={options.boothTypes} value={boothType} />
            <div className="flex gap-2">
              <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" type="submit">
                검색
              </button>
              {hasFilters ? (
                <Link className="inline-flex items-center rounded-xl border border-booth-line px-4 py-3 text-sm font-black text-booth-ink" href="/company/contractors">
                  초기화
                </Link>
              ) : null}
            </div>
          </form>
        </section>

        {errorMessage ? <ErrorState title="목록을 불러오지 못했습니다." description={errorMessage} /> : null}
        {!errorMessage && contractors.length === 0 ? (
          <EmptyState
            title="조건에 맞는 인증 업체가 없습니다."
            description="필터를 줄이거나 새 견적 요청을 공개하면 업체가 견적으로 응답할 수 있습니다."
            actionHref="/company/quote-requests/new"
            actionLabel="견적 요청 작성"
          />
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {contractors.map((contractor) => (
            <article className="rounded-[24px] border border-white/80 bg-white p-6 shadow-sm" key={contractor.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-booth-ink">{contractor.company_name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-booth-muted">
                    {contractor.description ?? "공개 소개가 등록되지 않았습니다."}
                  </p>
                </div>
                <StatusBadge status={contractor.verification_status} />
              </div>
              <div className="mt-5 grid gap-3 text-sm font-bold text-booth-muted">
                <InfoLine label="서비스 지역" value={contractor.service_regions.join(", ") || "미등록"} />
                <InfoLine label="부스 유형" value={contractor.booth_types.join(", ") || "미등록"} />
                <InfoLine label="최소 예산" value={formatCurrency(contractor.minimum_budget)} />
              </div>
              <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
                연락처는 아직 공개하지 않습니다. 견적 요청을 제출하면 업체가 견적으로 응답합니다.
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}

function FilterSelect({
  label,
  name,
  options,
  value
}: {
  label: string;
  name: string;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-black text-booth-muted">
      <span>{label}</span>
      <select
        className="w-full rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black text-booth-ink outline-none focus:border-booth-blue"
        defaultValue={value}
        name={name}
      >
        <option value="all">전체 {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-booth-line pb-3 last:border-b-0 last:pb-0">
      <span>{label}</span>
      <strong className="text-right text-booth-ink">{value}</strong>
    </div>
  );
}
