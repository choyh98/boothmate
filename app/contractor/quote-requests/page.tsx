import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, StatusBadge } from "@/components/ui/state";
import { daysUntil, formatCurrency, formatDateRange, formatDateTime } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { listOpenQuoteRequests } from "@/lib/quotes/queries";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

type ContractorQuoteRequestsPageProps = {
  searchParams?: {
    q?: string;
    sort?: "deadline" | "latest" | "budgetDesc";
    venue?: string;
    boothType?: string;
  };
};

export default async function ContractorQuoteRequestsPage({ searchParams }: ContractorQuoteRequestsPageProps) {
  await requireRole("contractor");
  let requests: QuoteRequest[] = [];
  let errorMessage = "";

  try {
    requests = await listOpenQuoteRequests();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "공개 견적 요청을 불러오지 못했습니다.";
  }

  const query = searchParams?.q?.trim().toLowerCase() ?? "";
  const sort = searchParams?.sort ?? "deadline";
  const venue = searchParams?.venue ?? "all";
  const boothType = searchParams?.boothType ?? "all";
  const venueOptions = uniqueValues(requests.map((request) => request.exhibitions?.venue_group ?? request.exhibitions?.venue ?? ""));
  const boothTypeOptions = uniqueValues(requests.flatMap((request) => request.booth_types));
  const filteredRequests = requests
    .filter((request) => {
      const matchesQuery = query
        ? [
            request.title,
            request.exhibitions?.title,
            request.exhibitions?.venue,
            request.exhibitions?.venue_group,
            request.exhibitions?.industry,
            request.requirements,
            request.booth_types.join(" ")
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;
      const matchesVenue =
        venue === "all" || request.exhibitions?.venue_group === venue || request.exhibitions?.venue === venue;
      const matchesBoothType = boothType === "all" || request.booth_types.includes(boothType);
      return matchesQuery && matchesVenue && matchesBoothType;
    })
    .sort((a, b) => {
      if (sort === "budgetDesc") return (b.budget_max ?? 0) - (a.budget_max ?? 0);
      if (sort === "latest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(a.deadline ?? "9999-12-31").getTime() - new Date(b.deadline ?? "9999-12-31").getTime();
    });

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-booth-blue">공개 요청</p>
            <h1 className="mt-3 text-4xl font-black text-booth-ink">견적 제출 기회</h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-booth-muted">
              현재 모집 중이고 마감되지 않은 요청만 표시됩니다. 마감일, 예산, 부스 유형으로 우선순위를 정해 확인하세요.
            </p>
          </div>
          <Link className="rounded-xl border border-booth-line bg-white px-5 py-3 text-sm font-black text-booth-ink shadow-sm" href="/contractor/quotes">
            제출 견적 보기
          </Link>
        </div>

        <section className="mb-6 rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
          <form className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" action="/contractor/quote-requests">
            <input
              className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-bold outline-none focus:border-booth-blue"
              defaultValue={searchParams?.q ?? ""}
              name="q"
              placeholder="전시회, 요청 제목, 요구사항 검색"
              type="search"
            />
            <SelectFilter label="전시장" name="venue" options={venueOptions} value={venue} />
            <SelectFilter label="부스 유형" name="boothType" options={boothTypeOptions} value={boothType} />
            <label className="grid gap-2 text-xs font-black text-booth-muted">
              정렬
              <select className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black text-booth-ink outline-none focus:border-booth-blue" defaultValue={sort} name="sort">
                <option value="deadline">마감 임박순</option>
                <option value="latest">최신 등록순</option>
                <option value="budgetDesc">예산 높은 순</option>
              </select>
            </label>
            <button className="self-end rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" type="submit">
              검색
            </button>
          </form>
        </section>

        {errorMessage ? <ErrorState title="공개 요청을 불러오지 못했습니다." description={errorMessage} /> : null}

        {!errorMessage && filteredRequests.length === 0 ? (
          <EmptyState
            title="조건에 맞는 공개 요청이 없습니다."
            description="필터를 줄이거나 최신 등록순으로 다시 확인해주세요."
            actionHref="/contractor/quote-requests"
            actionLabel="필터 초기화"
          />
        ) : null}

        <section className="grid gap-4">
          {filteredRequests.map((request) => {
            const remainingDays = daysUntil(request.deadline);
            return (
              <Link
                className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
                href={`/contractor/quote-requests/${request.id}`}
                key={request.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status="open" />
                      {remainingDays !== null && remainingDays <= 2 ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                          마감 임박
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-xl font-black text-booth-ink">{request.title}</h2>
                    <p className="mt-2 text-sm font-bold text-booth-muted">
                      {request.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request.exhibitions?.start_date, request.exhibitions?.end_date)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-booth-muted">
                      {request.requirements || "상세 요청사항이 아직 입력되지 않았습니다."}
                    </p>
                  </div>
                  <div className="min-w-56 rounded-2xl bg-slate-50 p-4 text-sm font-black text-booth-muted">
                    <p className="flex justify-between gap-4"><span>부스 규모</span><strong className="text-booth-ink">{request.booth_count ?? "-"}부스 / {request.booth_area ?? "-"}㎡</strong></p>
                    <p className="mt-2 flex justify-between gap-4"><span>예산</span><strong className="text-booth-ink">{formatCurrency(request.budget_max)}</strong></p>
                    <p className="mt-2 flex justify-between gap-4"><span>마감</span><strong className="text-booth-ink">{formatDateTime(request.deadline)}</strong></p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </main>
    </AppShell>
  );
}

function SelectFilter({
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
      {label}
      <select className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black text-booth-ink outline-none focus:border-booth-blue" defaultValue={value} name={name}>
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

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ko")
  );
}
