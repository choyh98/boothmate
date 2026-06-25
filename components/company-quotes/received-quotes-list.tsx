"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/state";
import { daysUntil, formatCurrency } from "@/lib/format";
import type { Quote } from "@/types/quote";

type ReceivedQuotesListProps = {
  quoteRequestId: string;
  quotes: Quote[];
};

export function ReceivedQuotesList({ quoteRequestId, quotes }: ReceivedQuotesListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [limitMessage, setLimitMessage] = useState("");
  const selectedCount = selectedIds.length;
  const canCompare = selectedCount > 0 && selectedCount <= 4;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    setLimitMessage("");
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) {
        setLimitMessage("견적 비교는 최대 4개까지 선택할 수 있습니다.");
        return current;
      }
      return [...current, id];
    });
  }

  function compare() {
    if (!canCompare) return;
    router.push(`/company/quote-requests/${quoteRequestId}/compare?quotes=${selectedIds.join(",")}`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-black text-booth-muted">
            비교 대상 {selectedCount}/4
          </p>
          {limitMessage ? <p className="mt-1 text-xs font-bold text-amber-700">{limitMessage}</p> : null}
        </div>
        <button
          className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          disabled={!canCompare}
          title={!canCompare ? "비교할 견적을 1개 이상 선택해주세요." : undefined}
          onClick={compare}
          type="button"
        >
          선택 견적 비교
        </button>
      </div>
      <section className="grid gap-4">
        {quotes.map((quote) => {
          const profile = quote.contractor_profile;
          const checked = selectedSet.has(quote.id);
          const validDays = daysUntil(quote.valid_until);
          return (
            <article className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm" key={quote.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-xl border border-booth-line bg-slate-50 px-3 py-2 text-sm font-black text-booth-ink">
                      <input
                        aria-label={`${profile?.company_name ?? "공개 프로필 미승인 업체"} 견적 비교 선택`}
                        checked={checked}
                        onChange={() => toggle(quote.id)}
                        type="checkbox"
                      />
                      비교
                    </label>
                    <StatusBadge status={quote.status} />
                  </div>
                  <h2 className="mt-3 text-xl font-black text-booth-ink">
                    {profile?.company_name ?? "공개 프로필 미승인 업체"}
                  </h2>
                  <p className="mt-2 text-sm font-bold text-booth-muted">
                    {quote.booth_type ?? "부스 유형 미정"} · {profile?.verification_status === "approved" ? "인증 완료" : "인증 정보 비공개"}
                  </p>
                </div>
                <div className="text-right text-sm font-black text-booth-muted">
                  <p className="text-xl text-booth-ink">{formatCurrency(quote.total_price)}</p>
                  <p>{quote.vat_included ? "부가세 포함" : "부가세 별도"}</p>
                  <p className={validDays !== null && validDays <= 3 ? "text-amber-700" : ""}>
                    {validDays === null ? "유효기간 미정" : validDays < 0 ? "유효기간 만료" : `${validDays}일 남음`}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 md:grid-cols-3">
                <MiniFact label="제작 기간" value={quote.production_days !== null ? `${quote.production_days}일` : "미정"} />
                <MiniFact label="1차 디자인" value={quote.first_design_date ?? "미정"} />
                <MiniFact label="수정 횟수" value={quote.revision_count !== null ? `${quote.revision_count}회` : "미정"} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="rounded-xl border border-booth-line px-4 py-3 text-sm font-black text-booth-ink" href={`/company/quotes/${quote.id}`}>
                  상세 보기
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-black text-booth-muted">{label}</dt>
      <dd className="mt-1 text-sm font-black text-booth-ink">{value}</dd>
    </div>
  );
}
