import Image from "next/image";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import type { Exhibition } from "@/types/exhibition";

export function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  const dDay = getDDay(exhibition.start_date);

  return (
    <article className="group overflow-hidden rounded-xl border border-[#dbe4f0] bg-white shadow-sm transition hover:-translate-y-2 hover:border-blue-200 hover:shadow-[0_24px_48px_rgba(0,86,255,.16)]">
      <div className="relative h-[154px] overflow-hidden bg-slate-950">
        <Image
          className="object-cover brightness-75 saturate-105 transition duration-500 group-hover:scale-110 group-hover:brightness-95 group-hover:saturate-150"
          src="/assets/ilv-booth-hero.png"
          alt={`${exhibition.title} 전시회`}
          fill
          sizes="(min-width: 1280px) 260px, (min-width: 768px) 50vw, 100vw"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-booth-blue shadow-sm">
          {dDay}
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-black text-white backdrop-blur">
          {exhibition.venue_group ?? "전시장"}
        </span>
      </div>

      <div className="p-[18px]">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue">
          {exhibition.industry ?? "전시 / 박람회"}
        </span>
        <h2 className="mt-4 min-h-12 text-[17px] font-black leading-snug text-booth-ink">
          {exhibition.title}
        </h2>
        <p className="mt-3 text-sm font-bold leading-6 text-booth-muted">
          {formatDateRange(exhibition.start_date, exhibition.end_date)}
        </p>
        <p className="text-sm font-bold leading-6 text-booth-muted">
          {exhibition.venue ?? "장소 미정"}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            className="flex h-10 items-center justify-center rounded-lg border border-booth-line text-sm font-black text-booth-ink transition hover:-translate-y-0.5 hover:border-blue-200"
            href={`/exhibitions/${exhibition.id}`}
          >
            상세보기
          </Link>
          <Link
            className="flex h-10 items-center justify-center rounded-lg bg-booth-blue text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
            href={`/company/quote-requests/new?exhibitionId=${exhibition.id}`}
          >
            견적요청
          </Link>
        </div>
      </div>
    </article>
  );
}

function getDDay(startDate: string | null) {
  if (!startDate) return "일정 미정";
  const today = new Date();
  const target = new Date(`${startDate}T00:00:00`);
  const diff = Math.ceil((target.getTime() - startOfDay(today).getTime()) / 86400000);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-DAY";
  return "진행/종료";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
