import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ExhibitionCard } from "@/components/exhibitions/exhibition-card";
import { listExhibitions } from "@/lib/exhibitions/queries";
import type { Exhibition } from "@/types/exhibition";

export const dynamic = "force-dynamic";

type ExhibitionsPageProps = {
  searchParams?: {
    q?: string;
    venue?: string;
    sort?: "deadline" | "dateAsc" | "dateDesc" | "name";
  };
};

const venues = ["all", "코엑스", "코엑스 마곡", "킨텍스"];

export default async function ExhibitionsPage({ searchParams }: ExhibitionsPageProps) {
  const query = searchParams?.q ?? "";
  const venue = searchParams?.venue ?? "all";
  const sort = searchParams?.sort ?? "dateAsc";
  let exhibitions: Exhibition[] = [];
  let errorMessage = "";

  try {
    exhibitions = await listExhibitions({ query, venueGroup: venue, sort });
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "전시회 목록을 불러오지 못했습니다. Supabase 테이블과 seed를 확인해주세요.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">
              Exhibitions
            </p>
            <h1 className="mt-3 text-4xl font-black text-booth-ink">전시 일정 확인</h1>
            <p className="mt-3 text-base font-semibold text-booth-muted">
              Supabase exhibitions 테이블에서 조회한 전시회 목록입니다.
            </p>
          </div>
          <Link
            className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
            href="/company/quote-requests"
          >
            내 견적 요청
          </Link>
        </div>

        <form className="mb-6 grid gap-3 rounded-2xl border border-white/80 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto]" action="/exhibitions">
          <input
            className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-booth-blue focus:bg-white"
            defaultValue={query}
            name="q"
            placeholder="전시회명, 장소, 산업 검색"
          />
          <select
            className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-black outline-none focus:border-booth-blue"
            defaultValue={venue}
            name="venue"
          >
            {venues.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "전체 전시장" : item}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-black outline-none focus:border-booth-blue"
            defaultValue={sort}
            name="sort"
          >
            <option value="dateAsc">날짜순</option>
            <option value="dateDesc">최신순</option>
            <option value="name">이름순</option>
          </select>
          <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white md:col-start-3" type="submit">
            검색
          </button>
        </form>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!errorMessage && exhibitions.length === 0 ? (
          <div className="rounded-2xl border border-white/80 bg-white p-8 text-center font-bold text-booth-muted">
            조건에 맞는 전시회가 없습니다.
          </div>
        ) : null}

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {exhibitions.map((exhibition) => (
            <ExhibitionCard exhibition={exhibition} key={exhibition.id} />
          ))}
        </section>
      </main>
    </AppShell>
  );
}
