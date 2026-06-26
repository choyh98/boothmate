import Image from "next/image";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import type { Exhibition } from "@/types/exhibition";

export function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  const dDay = getDDay(exhibition.start_date);
  const visual = getVisualVariant(exhibition);
  const homepageUrl = normalizeHomepageUrl(exhibition.homepage_url);
  const faviconUrl = getFaviconUrl(homepageUrl);

  return (
    <article className="group overflow-hidden rounded-xl border border-[#dbe4f0] bg-white shadow-sm transition hover:-translate-y-2 hover:border-blue-200 hover:shadow-[0_24px_48px_rgba(0,86,255,.16)]">
      <div className="relative h-[154px] overflow-hidden" style={{ background: visual.background }}>
        <div
          className="absolute inset-0 opacity-25 transition duration-500 group-hover:opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)",
            backgroundSize: `${visual.gridSize}px ${visual.gridSize}px`
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 to-transparent" />
        <div className="absolute left-1/2 top-1/2 grid h-[74px] w-[74px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-white/65 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,.28)] transition duration-500 group-hover:scale-105">
          {faviconUrl ? (
            <Image
              alt={`${exhibition.title} 공식 홈페이지 아이콘`}
              className="max-h-full max-w-full object-contain"
              height={56}
              src={faviconUrl}
              unoptimized
              width={56}
            />
          ) : (
            <BoothmateSymbol />
          )}
        </div>
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
          {homepageUrl ? (
            <a
              className="flex h-10 items-center justify-center rounded-lg border border-booth-line text-sm font-black text-booth-ink transition hover:-translate-y-0.5 hover:border-blue-200"
              href={homepageUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              공식 홈페이지
            </a>
          ) : (
            <span className="flex h-10 items-center justify-center rounded-lg border border-booth-line bg-slate-50 text-sm font-black text-slate-400">
              홈페이지 없음
            </span>
          )}
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

function BoothmateSymbol() {
  return (
    <svg aria-label="부스메이트 심볼" className="h-12 w-12" fill="none" viewBox="0 0 50 50">
      <rect fill="#0056FF" height="50" rx="7" width="50" />
      <path
        d="M35.7608 11.0449C37.3043 11.0449 38.5559 12.2965 38.5559 13.8401V36.1593C38.5559 37.7028 37.3043 38.9545 35.7608 38.9545H18.2087V33.3631H32.9648V16.6363H18.2087V11.0449H35.7608Z"
        fill="white"
      />
      <path
        d="M11.4434 13.8401C11.4434 12.2965 12.695 11.0449 14.2385 11.0449H23.4054C28.2707 11.0449 32.215 14.9892 32.215 19.8545C32.215 24.7198 28.2707 28.6641 23.4054 28.6641H17.0347V38.9545H14.2385C12.695 38.9545 11.4434 37.7028 11.4434 36.1593V13.8401ZM17.0347 16.6363V23.0727H23.4054C25.183 23.0727 26.6237 21.632 26.6237 19.8545C26.6237 18.0769 25.183 16.6363 23.4054 16.6363H17.0347Z"
        fill="white"
      />
    </svg>
  );
}

function getVisualVariant(exhibition: Exhibition) {
  const variants = [
    {
      background: "linear-gradient(135deg, #071B4D 0%, #0056FF 54%, #44C8FF 100%)",
      gridSize: 28
    },
    {
      background: "linear-gradient(135deg, #082F6F 0%, #1261FF 48%, #69D2FF 100%)",
      gridSize: 30
    },
    {
      background: "linear-gradient(135deg, #0B1F5E 0%, #0047D8 52%, #26A9FF 100%)",
      gridSize: 26
    },
    {
      background: "linear-gradient(135deg, #061A3B 0%, #0B5CFF 58%, #7DD3FC 100%)",
      gridSize: 32
    }
  ];
  const key = `${exhibition.id ?? ""}${exhibition.title ?? ""}`;
  const index = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0) % variants.length;
  return variants[index];
}

function normalizeHomepageUrl(value: string | null) {
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

function getFaviconUrl(homepageUrl: string) {
  if (!homepageUrl) return "";
  try {
    const url = new URL(homepageUrl);
    const domain = url.hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  } catch {
    return "";
  }
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
