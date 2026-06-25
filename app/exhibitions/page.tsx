import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ExhibitionCard } from "@/components/exhibitions/exhibition-card";
import { getExhibitionFilterOptions, listExhibitions } from "@/lib/exhibitions/queries";
import type { Exhibition } from "@/types/exhibition";

export const dynamic = "force-dynamic";

type ExhibitionsPageProps = {
  searchParams?: {
    q?: string;
    venue?: string;
    region?: string;
    industry?: string;
    sort?: "deadline" | "dateAsc" | "dateDesc" | "name";
  };
};

export default async function ExhibitionsPage({ searchParams }: ExhibitionsPageProps) {
  const query = searchParams?.q ?? "";
  const venue = searchParams?.venue ?? "all";
  const region = searchParams?.region ?? "all";
  const industry = searchParams?.industry ?? "all";
  const sort = searchParams?.sort ?? "dateAsc";
  let exhibitions: Exhibition[] = [];
  let filterOptions = { venueGroups: [] as string[], regions: [] as string[], industries: [] as string[] };
  let errorMessage = "";

  try {
    const [items, options] = await Promise.all([
      listExhibitions({ query, venueGroup: venue, region, industry, sort }),
      getExhibitionFilterOptions()
    ]);
    exhibitions = items;
    filterOptions = options;
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "전시회 목록을 불러오지 못했습니다. Supabase 테이블과 seed를 확인해주세요.";
  }

  const hasFilters = Boolean(query || venue !== "all" || region !== "all" || industry !== "all" || sort !== "dateAsc");

  return (
    <AppShell>
      <main className="mx-auto w-[min(1120px,calc(100%-36px))] pb-16">
        <div className="mb-8">
          <div className="flex gap-2 text-xs font-black text-booth-muted">
            <Link className="text-booth-blue" href="/company/dashboard">홈</Link>
            <span>/</span>
            <span>전시 일정</span>
          </div>
          <div className="mt-4">
            <h1 className="text-5xl font-black leading-tight text-booth-ink md:text-[58px]">전시 일정</h1>
            <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-booth-muted">
              참가할 전시회를 찾고 바로 견적 요청을 시작하세요. 전시회에서 견적요청을 누르면 전시 선택 단계는 자동으로 완료됩니다.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="sticky top-[104px] rounded-[14px] border border-slate-900/10 bg-white/80 p-5 shadow-soft backdrop-blur lg:max-h-[calc(100vh-128px)] lg:overflow-auto">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-booth-ink">필터</h2>
              {hasFilters ? (
                <Link className="text-xs font-black text-booth-muted transition hover:text-booth-blue" href="/exhibitions">
                  초기화
                </Link>
              ) : null}
            </div>

            <form className="mt-5 grid gap-5" action="/exhibitions">
              <label className="grid gap-2 text-sm font-black text-booth-ink">
                전시회명 검색
                <input
                  className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-bold outline-none focus:border-booth-blue"
                  defaultValue={query}
                  name="q"
                  placeholder="전시회명, 장소, 분야 검색"
                  type="search"
                />
              </label>

              <FilterSelect label="전시장" name="venue" value={venue} allLabel="전체 전시장" options={filterOptions.venueGroups} />
              <FilterSelect label="지역" name="region" value={region} allLabel="전체 지역" options={filterOptions.regions} />
              <FilterSelect label="산업 분야" name="industry" value={industry} allLabel="전체 산업" options={filterOptions.industries} />

              <label className="grid gap-2 text-sm font-black text-booth-ink">
                정렬
                <select className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black outline-none focus:border-booth-blue" defaultValue={sort} name="sort">
                  <option value="dateAsc">날짜순</option>
                  <option value="dateDesc">최신순</option>
                  <option value="deadline">종료 임박순</option>
                  <option value="name">이름순</option>
                </select>
              </label>

              <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-[6px_6px_0_#0f172a] transition hover:-translate-y-0.5" type="submit">
                검색하기
              </button>
            </form>

            <div className="mt-6 rounded-xl bg-slate-950 p-4 text-white">
              <b className="text-xs font-black text-blue-300">PRO SERVICE</b>
              <p className="mt-2 text-sm font-extrabold leading-6">전시 전문가입찰<br />무료 컨설팅 받기</p>
              <Link className="mt-4 flex h-10 items-center justify-center rounded-lg bg-booth-blue text-sm font-black" href="/company/quote-requests/new">
                신청하기
              </Link>
            </div>
          </aside>

          <section className="rounded-[14px] border border-slate-900/10 bg-white/80 p-5 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-booth-line pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-base font-black text-booth-ink">총 {exhibitions.length.toLocaleString("ko-KR")}개의 전시회</strong>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">전체</span>
              </div>
              <span className="text-xs font-black text-booth-muted">카드 보기</span>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {!errorMessage && exhibitions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/80 bg-white p-8 text-center font-bold text-booth-muted">
                조건에 맞는 전시회가 없습니다.
              </div>
            ) : null}

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {exhibitions.map((exhibition) => (
                <ExhibitionCard exhibition={exhibition} key={exhibition.id} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function FilterSelect({
  label,
  name,
  value,
  allLabel,
  options
}: {
  label: string;
  name: string;
  value: string;
  allLabel: string;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-booth-ink">
      {label}
      <select className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black outline-none focus:border-booth-blue" defaultValue={value} name={name}>
        <option value="all">{allLabel}</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}
