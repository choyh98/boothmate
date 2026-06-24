import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { formatDateRange } from "@/lib/format";
import { getExhibition } from "@/lib/exhibitions/queries";

export const dynamic = "force-dynamic";

export default async function ExhibitionDetailPage({ params }: { params: { id: string } }) {
  let exhibition;

  try {
    exhibition = await getExhibition(params.id);
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href="/exhibitions">
            전시 일정
          </Link>
          <span> / 상세보기</span>
        </div>
        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-soft">
            <div className="h-80 bg-[radial-gradient(circle_at_36%_26%,rgba(0,87,255,0.35),transparent_30%),linear-gradient(135deg,#0f172a,#1d4ed8_60%,#38bdf8)]" />
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
                  {exhibition.venue_group ?? "전시장"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-booth-muted">
                  {exhibition.industry ?? "전시 / 박람회"}
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight text-booth-ink">
                {exhibition.title}
              </h1>
              <p className="mt-4 text-base font-bold leading-7 text-booth-muted">
                {exhibition.organizer ?? "주최 정보 미정"}
              </p>
            </div>
          </div>
          <aside className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
            <Info label="개최 기간" value={formatDateRange(exhibition.start_date, exhibition.end_date)} />
            <Info label="장소" value={`${exhibition.venue_group ?? ""} ${exhibition.venue ?? ""}`.trim() || "장소 미정"} />
            <Info label="산업 분야" value={exhibition.industry ?? "미정"} />
            <Info label="주최사" value={exhibition.organizer ?? "미정"} />
            {exhibition.homepage_url ? (
              <a
                className="mt-5 block rounded-xl border border-booth-line px-5 py-4 text-center text-sm font-black text-booth-ink transition hover:border-blue-200"
                href={exhibition.homepage_url.startsWith("http") ? exhibition.homepage_url : `https://${exhibition.homepage_url}`}
                rel="noreferrer"
                target="_blank"
              >
                공식 홈페이지
              </a>
            ) : null}
            <Link
              className="mt-3 block rounded-xl bg-booth-blue px-5 py-4 text-center text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700"
              href={`/company/quote-requests/new?exhibitionId=${exhibition.id}`}
            >
              이 전시회로 견적 요청하기
            </Link>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-booth-line py-4 first:pt-0">
      <p className="text-xs font-black text-booth-muted">{label}</p>
      <p className="mt-2 text-base font-black text-booth-ink">{value}</p>
    </div>
  );
}
