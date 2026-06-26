import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ExhibitionCard } from "@/components/exhibitions/exhibition-card";
import { getExhibitionFilterOptions, listExhibitionsPage } from "@/lib/exhibitions/queries";
import type { ExhibitionStatusFilter } from "@/lib/exhibitions/queries";
import type { Exhibition } from "@/types/exhibition";

export const dynamic = "force-dynamic";

type ExhibitionsPageProps = {
  searchParams?: {
    q?: string;
    venue?: string;
    region?: string;
    industry?: string;
    status?: ExhibitionStatusFilter;
    startFrom?: string;
    startTo?: string;
    period?: "1m" | "3m" | "6m";
    sort?: "deadline" | "dateAsc" | "dateDesc" | "name";
    page?: string;
    view?: "card" | "calendar";
    month?: string;
  };
};

export default async function ExhibitionsPage({ searchParams }: ExhibitionsPageProps) {
  const query = searchParams?.q ?? "";
  const venue = searchParams?.venue ?? "all";
  const industry = searchParams?.industry ?? "all";
  const period = normalizePeriod(searchParams?.period);
  const status = period ? "upcoming" : (searchParams?.status ?? "current");
  const startFrom = period ? getTodayIsoDate() : (searchParams?.startFrom ?? "");
  const startTo = period ? addMonthsIsoDate(startFrom, Number(period.replace("m", ""))) : (searchParams?.startTo ?? "");
  const sort = "dateAsc";
  const page = normalizePage(searchParams?.page);
  const view = normalizeView(searchParams?.view);
  const currentMonth = normalizeMonth(searchParams?.month);
  const monthRange = getMonthRange(currentMonth);
  let exhibitions: Exhibition[] = [];
  let calendarExhibitions: Exhibition[] = [];
  let total = 0;
  let totalPages = 1;
  let filterOptions = { venueGroups: [] as string[], regions: [] as string[], industries: [] as string[] };
  let errorMessage = "";

  try {
    const [result, calendarResult, options] = await Promise.all([
      listExhibitionsPage({ query, venueGroup: venue, industry, status, startFrom, startTo, sort, page }),
      listExhibitionsPage({
        query,
        venueGroup: venue,
        industry,
        status,
        startFrom: monthRange.start,
        startTo: monthRange.end,
        sort,
        page: 1,
        pageSize: 60
      }),
      getExhibitionFilterOptions()
    ]);
    exhibitions = result.items;
    total = result.total;
    totalPages = result.totalPages;
    calendarExhibitions = calendarResult.items;
    filterOptions = options;
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "전시회 목록을 불러오지 못했습니다. Supabase 테이블과 seed를 확인해주세요.";
  }

  const hasFilters = Boolean(
    query ||
      venue !== "all" ||
      industry !== "all" ||
      Boolean(period) ||
      status !== "current" ||
      Boolean(searchParams?.startFrom) ||
      Boolean(searchParams?.startTo)
  );

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
          <aside className="sticky top-[104px] min-w-0 overflow-hidden rounded-[14px] border border-slate-900/10 bg-white/80 p-5 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span aria-hidden="true" />
              {hasFilters ? (
                <Link className="text-xs font-black text-booth-muted transition hover:text-booth-blue" href="/exhibitions">
                  초기화
                </Link>
              ) : null}
            </div>

            <form className="mt-5 grid gap-5" action="/exhibitions">
              <p className="text-lg font-black text-booth-blue">행사 검색</p>
              {period ? <input name="period" type="hidden" value={period} /> : null}
              {view === "calendar" ? <input name="view" type="hidden" value="calendar" /> : null}
              {view === "calendar" ? <input name="month" type="hidden" value={currentMonth} /> : null}
              <label className="grid gap-2 text-sm font-black text-booth-ink">
                전시회명
                <input
                  className="w-full min-w-0 rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-bold outline-none focus:border-booth-blue"
                  defaultValue={query}
                  name="q"
                  placeholder="전시회명 검색"
                  type="search"
                />
              </label>

              <FilterSelect label="전시장" name="venue" value={venue} allLabel="전체 전시장" options={filterOptions.venueGroups} />
              <FilterSelect label="산업 분야" name="industry" value={industry} allLabel="전체 산업" options={filterOptions.industries} />
              <div className="grid gap-3">
                <span className="text-sm font-black text-booth-ink">시작일</span>
                <div className="grid grid-cols-3 gap-2">
                  <PeriodLink active={period === "1m"} href={buildPeriodHref(searchParams, "1m")}>1개월</PeriodLink>
                  <PeriodLink active={period === "3m"} href={buildPeriodHref(searchParams, "3m")}>3개월</PeriodLink>
                  <PeriodLink active={period === "6m"} href={buildPeriodHref(searchParams, "6m")}>6개월</PeriodLink>
                </div>
              </div>

              <button
                className="group relative h-12 w-full min-w-0 overflow-hidden rounded-xl bg-booth-blue px-5 text-sm font-black text-white shadow-[0_12px_22px_rgba(0,86,255,.24)] transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_16px_30px_rgba(0,86,255,.28)]"
                type="submit"
              >
                <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.28),transparent)] transition duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  검색하기
                  <span aria-hidden="true" className="text-base leading-none">→</span>
                </span>
              </button>
            </form>
          </aside>

          <section className="rounded-[14px] border border-slate-900/10 bg-white/80 p-5 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-booth-line pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-base font-black text-booth-ink">총 {total.toLocaleString("ko-KR")}개의 전시회</strong>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
                  {view === "calendar" ? `${formatCalendarMonth(currentMonth)} 월간` : `${page} / ${totalPages}페이지`}
                </span>
              </div>
              <div className="flex rounded-full border border-slate-200 bg-slate-100 p-1 shadow-inner">
                <ViewLink active={view === "card"} href={buildViewHref(searchParams, "card")}>
                  카드 보기
                </ViewLink>
                <ViewLink active={view === "calendar"} href={buildViewHref(searchParams, "calendar")}>
                  캘린더 보기
                </ViewLink>
              </div>
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

            {view === "calendar" ? (
              <ExhibitionCalendar
                currentMonth={currentMonth}
                exhibitions={calendarExhibitions}
                nextHref={buildMonthHref(searchParams, addCalendarMonths(currentMonth, 1))}
                prevHref={buildMonthHref(searchParams, addCalendarMonths(currentMonth, -1))}
              />
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {exhibitions.map((exhibition) => (
                  <ExhibitionCard exhibition={exhibition} key={exhibition.id} />
                ))}
              </div>
            )}

            {!errorMessage && view === "card" && totalPages > 1 ? (
              <nav aria-label="전시회 목록 페이지" className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <PageLink disabled={page <= 1} href={buildPageHref(searchParams, page - 1)}>
                  이전
                </PageLink>
                <span className="rounded-full border border-booth-line bg-white px-4 py-2 text-sm font-black text-booth-ink shadow-sm">
                  {page} / {totalPages}
                </span>
                <PageLink disabled={page >= totalPages} href={buildPageHref(searchParams, page + 1)}>
                  다음
                </PageLink>
              </nav>
            ) : null}
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function normalizePage(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalizeView(value: string | undefined): "card" | "calendar" {
  return value === "calendar" ? "calendar" : "card";
}

function normalizePeriod(value: string | undefined): "1m" | "3m" | "6m" | "" {
  if (value === "1m" || value === "3m" || value === "6m") return value;
  return "";
}

function normalizeMonth(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  const today = getTodayIsoDate();
  return today.slice(0, 7);
}

function getTodayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addMonthsIsoDate(date: string, months: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setMonth(parsed.getMonth() + months);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsed);
}

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 0);

  return {
    start: formatIsoDate(start),
    end: formatIsoDate(end)
  };
}

function addCalendarMonths(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  date.setMonth(date.getMonth() + amount);
  return formatIsoDate(date).slice(0, 7);
}

function formatIsoDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function buildPeriodHref(searchParams: ExhibitionsPageProps["searchParams"], period: "1m" | "3m" | "6m") {
  const params = new URLSearchParams();
  const query = searchParams?.q;
  const venue = searchParams?.venue;
  const industry = searchParams?.industry;
  const view = normalizeView(searchParams?.view);
  const month = searchParams?.month;

  if (query) params.set("q", query);
  if (venue && venue !== "all") params.set("venue", venue);
  if (industry && industry !== "all") params.set("industry", industry);
  params.set("period", period);
  if (view === "calendar") params.set("view", "calendar");
  if (view === "calendar" && month) params.set("month", month);

  return `/exhibitions?${params.toString()}`;
}

function buildViewHref(searchParams: ExhibitionsPageProps["searchParams"], view: "card" | "calendar") {
  const params = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value && key !== "page" && key !== "view" && key !== "month") params.set(key, String(value));
  });
  if (view === "calendar") {
    params.set("view", "calendar");
    params.set("month", normalizeMonth(searchParams?.month));
  }
  const queryString = params.toString();
  return queryString ? `/exhibitions?${queryString}` : "/exhibitions";
}

function buildMonthHref(searchParams: ExhibitionsPageProps["searchParams"], month: string) {
  const params = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value && key !== "page" && key !== "month" && key !== "view") params.set(key, String(value));
  });
  params.set("view", "calendar");
  params.set("month", month);
  return `/exhibitions?${params.toString()}`;
}

function buildPageHref(searchParams: ExhibitionsPageProps["searchParams"], nextPage: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value && key !== "page") params.set(key, String(value));
  });
  if (nextPage > 1) params.set("page", String(nextPage));
  const queryString = params.toString();
  return queryString ? `/exhibitions?${queryString}` : "/exhibitions";
}

function PageLink({ children, disabled, href }: { children: ReactNode; disabled: boolean; href: string }) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="rounded-full border border-slate-200 bg-slate-100 px-5 py-2 text-sm font-black text-slate-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      className="rounded-full border border-booth-line bg-white px-5 py-2 text-sm font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-booth-blue hover:shadow-[0_12px_24px_rgba(15,23,42,.08)]"
      href={href}
    >
      {children}
    </Link>
  );
}

function ViewLink({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
  return (
    <Link
      className={`flex h-9 items-center justify-center rounded-full px-4 text-xs font-black transition ${
        active
          ? "bg-white text-booth-blue shadow-[0_8px_18px_rgba(15,23,42,.08)]"
          : "text-booth-muted hover:bg-white/70 hover:text-booth-blue"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

function PeriodLink({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
  return (
    <Link
      className={`flex h-10 min-w-0 items-center justify-center rounded-full border px-2 text-xs font-black transition ${
        active
          ? "border-booth-blue bg-booth-blue text-white shadow-[0_10px_22px_rgba(0,86,255,.24)]"
          : "border-booth-line bg-white text-booth-ink shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:text-booth-blue hover:shadow-[0_10px_22px_rgba(15,23,42,.08)]"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

function ExhibitionCalendar({
  currentMonth,
  exhibitions,
  nextHref,
  prevHref
}: {
  currentMonth: string;
  exhibitions: Exhibition[];
  nextHref: string;
  prevHref: string;
}) {
  const days = buildCalendarDays(currentMonth);
  const eventsByDate = groupExhibitionsByStartDate(exhibitions);
  const monthTitle = formatCalendarMonth(currentMonth);
  const sortedEvents = exhibitions
    .filter((exhibition) => exhibition.start_date)
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <Link
            aria-label="이전 달"
            className="grid h-10 w-10 place-items-center rounded-full border border-booth-line bg-white text-xl font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-booth-blue hover:shadow-[0_12px_24px_rgba(15,23,42,.08)]"
            href={prevHref}
          >
            ‹
          </Link>
          <h2 className="rounded-full border border-slate-200 bg-white px-5 py-2 text-2xl font-black tracking-normal text-booth-ink shadow-sm">
            {monthTitle}
          </h2>
          <Link
            aria-label="다음 달"
            className="grid h-10 w-10 place-items-center rounded-full border border-booth-line bg-white text-xl font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-booth-blue hover:shadow-[0_12px_24px_rgba(15,23,42,.08)]"
            href={nextHref}
          >
            ›
          </Link>
        </div>
        <span className="text-xs font-black text-booth-muted">시작일 기준 일정</span>
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-booth-line py-3 text-center text-xs font-black text-booth-muted">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
            <span className={index === 0 ? "text-red-500" : ""} key={day}>
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-b-2xl border border-t-0 border-booth-line bg-white">
          {days.map((day) => {
            const items = eventsByDate.get(day.isoDate) ?? [];
            const visibleItems = items.slice(0, 3);
            const hiddenCount = Math.max(0, items.length - visibleItems.length);

            return (
              <div
                className={`min-h-[132px] border-b border-r border-booth-line p-3 last:border-r-0 ${
                  day.isCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400"
                } ${day.isToday ? "ring-2 ring-inset ring-booth-blue" : ""}`}
                key={day.isoDate}
              >
                <div className={`text-sm font-black ${day.isSunday ? "text-red-500" : "text-booth-ink"}`}>
                  {day.day}
                </div>
                <div className="mt-2 grid gap-1">
                  {visibleItems.map((exhibition) => (
                    <CalendarEvent exhibition={exhibition} key={exhibition.id} />
                  ))}
                  {hiddenCount ? (
                    <span className="text-[11px] font-black text-booth-blue">+{hiddenCount}개 더보기</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {sortedEvents.length ? (
          sortedEvents.map((exhibition) => (
            <div className="rounded-2xl border border-booth-line bg-white p-4" key={exhibition.id}>
              <p className="text-xs font-black text-booth-blue">{formatMobileDate(exhibition.start_date)}</p>
              <CalendarEvent exhibition={exhibition} isMobile />
              <p className="mt-2 text-xs font-bold text-booth-muted">{exhibition.venue ?? "장소 미정"}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-booth-line bg-white p-8 text-center text-sm font-bold text-booth-muted">
            이 달에 표시할 전시 일정이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarEvent({ exhibition, isMobile = false }: { exhibition: Exhibition; isMobile?: boolean }) {
  const homepageUrl = normalizeExternalUrl(exhibition.homepage_url);
  const content = (
    <>
      <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-orange-500" />
      <span className={isMobile ? "min-w-0 text-sm font-black text-booth-ink" : "min-w-0 truncate text-[11px] font-black text-booth-ink"}>
        {exhibition.title}
      </span>
    </>
  );

  if (!homepageUrl) {
    return <div className="flex min-w-0 items-start gap-2">{content}</div>;
  }

  return (
    <a className="flex min-w-0 items-start gap-2 hover:text-booth-blue" href={homepageUrl} rel="noopener noreferrer" target="_blank">
      {content}
    </a>
  );
}

function buildCalendarDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const today = getTodayIsoDate();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isoDate = formatIsoDate(date);
    return {
      isoDate,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === monthNumber - 1,
      isSunday: date.getDay() === 0,
      isToday: isoDate === today
    };
  });
}

function groupExhibitionsByStartDate(exhibitions: Exhibition[]) {
  const map = new Map<string, Exhibition[]>();
  exhibitions.forEach((exhibition) => {
    if (!exhibition.start_date) return;
    const items = map.get(exhibition.start_date) ?? [];
    items.push(exhibition);
    map.set(exhibition.start_date, items);
  });
  return map;
}

function formatCalendarMonth(month: string) {
  return month.replace("-", ". ");
}

function formatMobileDate(date: string | null) {
  if (!date) return "일정 미정";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "일정 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul"
  }).format(parsed);
}

function normalizeExternalUrl(value: string | null | undefined) {
  if (!value) return "";
  const first = value
    .split(/\s+\/\s+|,\s*|\n/)
    .map((item) => item.trim())
    .find(Boolean);
  if (!first) return "";
  const normalized = /^https?:\/\//i.test(first) ? first : `https://${first}`;
  try {
    const url = new URL(normalized);
    return url.href;
  } catch {
    return "";
  }
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
      <select className="w-full min-w-0 rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black outline-none focus:border-booth-blue" defaultValue={value} name={name}>
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
