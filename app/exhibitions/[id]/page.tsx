import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/state";
import {
  getExhibition,
  getExhibitionDDay,
  getExhibitionDisplayStatus,
  normalizeExternalUrl
} from "@/lib/exhibitions/queries";
import { formatDateRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExhibitionDetailPage({ params }: { params: { id: string } }) {
  let exhibition;

  try {
    exhibition = await getExhibition(params.id);
  } catch {
    notFound();
  }

  const displayStatus = getExhibitionDisplayStatus(exhibition);
  const homepageUrl = normalizeExternalUrl(exhibition.homepage_url);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href="/exhibitions">
            전시 일정
          </Link>
          <span> / 상세</span>
        </div>

        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={displayStatus}
              label={displayStatus === "ongoing" ? "진행 중" : displayStatus === "upcoming" ? "예정" : "종료"}
            />
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue ring-1 ring-blue-100">
              {getExhibitionDDay(exhibition)}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight text-booth-ink md:text-5xl">{exhibition.title}</h1>
          <p className="mt-4 text-base font-semibold leading-7 text-booth-muted">
            {formatDateRange(exhibition.start_date, exhibition.end_date)}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Info label="전시장" value={exhibition.venue_group ?? exhibition.venue ?? "전시장 미정"} />
            <Info label="지역" value={exhibition.region ?? "지역 미정"} />
            <Info label="산업 분야" value={exhibition.industry ?? "산업 미정"} />
            <Info label="주최/주관" value={exhibition.organizer ?? "정보 없음"} />
            <Info label="데이터 출처" value={exhibition.source ?? "정보 없음"} />
            <Info label="상태" value={displayStatus === "ongoing" ? "진행 중" : displayStatus === "upcoming" ? "예정" : "종료"} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {homepageUrl ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200"
                href={homepageUrl}
                rel="noreferrer"
                target="_blank"
              >
                공식 홈페이지 보기
              </a>
            ) : null}
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-booth-line bg-slate-50 px-5 py-3 text-sm font-black text-booth-ink transition hover:border-blue-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100"
              href="/exhibitions"
            >
              전체 전시 일정 보기
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-booth-line bg-slate-50 p-5">
      <p className="text-xs font-black text-booth-muted">{label}</p>
      <p className="mt-2 text-base font-black text-booth-ink">{value}</p>
    </div>
  );
}
