import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import type { Exhibition } from "@/types/exhibition";

export function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <div className="h-28 bg-[radial-gradient(circle_at_30%_20%,rgba(0,87,255,0.28),transparent_32%),linear-gradient(135deg,#0f172a,#1d4ed8)]" />
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
            {exhibition.venue_group ?? "전시장"}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-booth-muted">
            {exhibition.industry ?? "전시 / 박람회"}
          </span>
        </div>
        <h2 className="mt-4 min-h-14 text-lg font-black leading-7 text-booth-ink">
          {exhibition.title}
        </h2>
        <p className="mt-3 text-sm font-bold leading-6 text-booth-muted">
          {formatDateRange(exhibition.start_date, exhibition.end_date)}
        </p>
        <p className="text-sm font-bold leading-6 text-booth-muted">
          {exhibition.venue ?? "장소 미정"}
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            className="flex-1 rounded-xl border border-booth-line px-4 py-3 text-center text-sm font-black text-booth-ink transition hover:border-blue-200"
            href={`/exhibitions/${exhibition.id}`}
          >
            상세보기
          </Link>
          <Link
            className="flex-1 rounded-xl bg-booth-blue px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-700"
            href={`/company/quote-requests/new?exhibitionId=${exhibition.id}`}
          >
            견적요청
          </Link>
        </div>
      </div>
    </article>
  );
}
