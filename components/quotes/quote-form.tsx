"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuoteAction } from "@/app/contractor/quote-requests/actions";
import { formatCurrency, formatDateRange } from "@/lib/format";
import { emptyQuoteForm, quoteToForm } from "@/lib/quotes/validation";
import type { Contractor } from "@/types/auth";
import type { Quote, QuoteFormData } from "@/types/quote";
import type { QuoteRequest } from "@/types/quote-request";

type QuoteFormProps = {
  contractor: Contractor;
  request: QuoteRequest;
  initialQuote?: Quote | null;
};

const costFields: Array<[keyof QuoteFormData, string]> = [
  ["designCost", "디자인비"],
  ["materialCost", "자재비"],
  ["constructionCost", "제작비"],
  ["transportCost", "운송비"],
  ["installationCost", "설치비"],
  ["dismantlingCost", "철거비"],
  ["electricalCost", "전기공사"],
  ["graphicCost", "그래픽"],
  ["furnitureCost", "가구/비품"],
  ["otherCost", "기타"]
];

function numeric(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function QuoteForm({ contractor, request, initialQuote }: QuoteFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<QuoteFormData>(
    initialQuote ? quoteToForm(initialQuote) : emptyQuoteForm(request.id)
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const costTotal = useMemo(
    () => costFields.reduce((sum, [key]) => sum + numeric(String(form[key] ?? "")), 0),
    [form]
  );
  const previewTotal = numeric(form.totalPrice) || costTotal;
  const isSubmitted = initialQuote?.status && initialQuote.status !== "draft";

  function patch(patchValue: Partial<QuoteFormData>) {
    setForm((current) => ({ ...current, ...patchValue }));
  }

  function save(intent: "draft" | "submit") {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await saveQuoteAction(form, intent);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      if (result.id) {
        patch({ id: result.id });
      }
      if (intent === "submit" && result.id) {
        router.push(`/contractor/quotes/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm md:p-7">
        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="제안 부스 유형" value={form.boothType} onChange={(value) => patch({ boothType: value })} />
            <Field label="총 견적 금액" value={form.totalPrice} onChange={(value) => patch({ totalPrice: value })} type="number" />
            <label className="flex items-center gap-3 rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-black text-booth-ink">
              <input checked={form.vatIncluded} onChange={(event) => patch({ vatIncluded: event.target.checked })} type="checkbox" />
              부가세 포함
            </label>
          </div>

          <div>
            <h2 className="text-lg font-black text-booth-ink">상세 비용</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {costFields.map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={String(form[key] ?? "")}
                  onChange={(value) => patch({ [key]: value })}
                  type="number"
                />
              ))}
            </div>
          </div>

          <Textarea label="포함 항목" value={form.includedItems} onChange={(value) => patch({ includedItems: value })} />
          <Textarea label="제외 항목" value={form.excludedItems} onChange={(value) => patch({ excludedItems: value })} />
          <Textarea label="제안 내용" value={form.proposal} onChange={(value) => patch({ proposal: value })} rows={7} />

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="1차 디자인 제공일" value={form.firstDesignDate} onChange={(value) => patch({ firstDesignDate: value })} type="date" />
            <Field label="수정 가능 횟수" value={form.revisionCount} onChange={(value) => patch({ revisionCount: value })} type="number" />
            <Field label="제작 소요일" value={form.productionDays} onChange={(value) => patch({ productionDays: value })} type="number" />
            <Field label="견적 유효기간" value={form.validUntil} onChange={(value) => patch({ validUntil: value })} type="date" />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-booth-line pt-5">
          <button
            className="rounded-xl border border-booth-line px-5 py-3 text-sm font-black text-booth-ink disabled:opacity-60"
            disabled={isPending || Boolean(isSubmitted)}
            onClick={() => save("draft")}
            type="button"
          >
            {isPending ? "저장 중..." : "임시저장"}
          </button>
          <button
            className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            disabled={isPending || Boolean(isSubmitted)}
            onClick={() => save("submit")}
            type="button"
          >
            {isPending ? "제출 중..." : "최종 제출"}
          </button>
        </div>
      </section>

      <aside className="grid gap-4 self-start lg:sticky lg:top-28">
        <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-booth-blue">Request</p>
          <h2 className="mt-3 text-xl font-black leading-7 text-booth-ink">{request.title}</h2>
          <p className="mt-2 text-sm font-bold text-booth-muted">
            {request.exhibitions?.title ?? "전시회 정보 없음"} · {formatDateRange(request.exhibitions?.start_date, request.exhibitions?.end_date)}
          </p>
          <dl className="mt-5 grid gap-3">
            <PreviewRow label="부스 규모" value={`${request.booth_count ?? "-"}부스 / ${request.booth_area ?? "-"}㎡`} />
            <PreviewRow label="요청 유형" value={request.booth_types.join(", ") || "미정"} />
            <PreviewRow label="예산" value={`${formatCurrency(request.budget_min)} ~ ${formatCurrency(request.budget_max)}`} />
            <PreviewRow label="마감" value={request.deadline ? new Date(request.deadline).toLocaleString("ko-KR") : "미정"} />
          </dl>
        </section>

        <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-booth-blue">Preview</p>
          <h2 className="mt-3 text-2xl font-black text-booth-ink">{formatCurrency(previewTotal)}</h2>
          <p className="mt-1 text-sm font-bold text-booth-muted">
            {form.vatIncluded ? "부가세 포함" : "부가세 별도"} · {contractor.company_name}
          </p>
          <dl className="mt-5 grid gap-3">
            <PreviewRow label="부스 유형" value={form.boothType || "입력 전"} />
            <PreviewRow label="상세 비용 합계" value={formatCurrency(costTotal)} />
            <PreviewRow label="1차 디자인" value={form.firstDesignDate || "미정"} />
            <PreviewRow label="제작 기간" value={form.productionDays ? `${form.productionDays}일` : "미정"} />
            <PreviewRow label="유효기간" value={form.validUntil || "미정"} />
          </dl>
        </section>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-booth-ink">
      {label}
      <input
        className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 4
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-booth-ink">
      {label}
      <textarea
        className="rounded-2xl border border-booth-line bg-slate-50 p-4 text-sm font-bold leading-7 outline-none focus:border-booth-blue"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-black text-booth-muted">{label}</dt>
      <dd className="mt-1 text-sm font-black leading-6 text-booth-ink">{value}</dd>
    </div>
  );
}
