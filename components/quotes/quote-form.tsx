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
  ["electricalCost", "전기 및 조명"],
  ["graphicCost", "그래픽 출력"],
  ["furnitureCost", "집기"],
  ["otherCost", "기타 비용"]
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
  const totalPriceValue = numeric(form.totalPrice);
  const hasCostMismatch = totalPriceValue > 0 && costTotal > 0 && totalPriceValue !== costTotal;
  const isSubmitted = initialQuote?.status && initialQuote.status !== "draft";
  const canSubmitWithSubscription = contractor.subscription_status === "active" || contractor.subscription_status === "trial";

  function patch(patchValue: Partial<QuoteFormData>) {
    setForm((current) => ({ ...current, ...patchValue }));
  }

  function save(intent: "draft" | "submit") {
    setMessage("");
    setError("");

    if (intent === "submit") {
      const missing = getMissingRequired(form);
      if (missing.length > 0) {
        setError(`최종 제출 전 ${missing.join(", ")} 항목을 입력해주세요. 작성 내용은 그대로 유지됩니다.`);
        return;
      }
    }

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
        {message ? <Notice tone="success">{message}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {!canSubmitWithSubscription ? (
          <Notice tone="warning">
            현재 구독 상태는 {contractor.subscription_status}입니다. 임시저장은 가능하지만 최종 제출은 active 또는 trial 상태에서만 가능합니다.
          </Notice>
        ) : null}

        <div className="mb-6 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm font-black text-booth-blue">견적 작성</p>
          <h2 className="mt-2 text-2xl font-black text-booth-ink">금액, 포함 범위, 제작 일정을 정확히 입력해주세요.</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-booth-muted">
            임시저장은 참여기업에게 공개되지 않습니다. 최종 제출 후에만 받은 견적 목록과 비교 화면에 표시됩니다.
          </p>
        </div>

        <div className="grid gap-6">
          <FormSection
            index="1"
            title="기본 견적"
            description="참여기업이 목록에서 가장 먼저 확인하는 정보입니다."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="제안 부스 유형" value={form.boothType} onChange={(value) => patch({ boothType: value })} />
              <Field label="총 견적 금액(원)" value={form.totalPrice} onChange={(value) => patch({ totalPrice: value })} type="number" />
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-black text-booth-ink">
                <input checked={form.vatIncluded} onChange={(event) => patch({ vatIncluded: event.target.checked })} type="checkbox" />
                부가세 포함 금액입니다.
              </label>
            </div>
            {hasCostMismatch ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                총 견적 금액과 상세 비용 합계가 다릅니다. 총액 {formatCurrency(totalPriceValue)}, 상세 합계 {formatCurrency(costTotal)}입니다.
                <button
                  className="ml-2 font-black text-booth-blue underline underline-offset-4"
                  onClick={() => patch({ totalPrice: String(costTotal) })}
                  type="button"
                >
                  상세 합계로 맞추기
                </button>
              </div>
            ) : null}
          </FormSection>

          <FormSection
            index="2"
            title="세부 비용"
            description="세부 비용은 비교 화면에서 그대로 보여집니다. 입력하지 않은 항목은 미정으로 표시됩니다."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {costFields.map(([key, label]) => (
                <Field
                  key={key}
                  label={`${label}(원)`}
                  value={String(form[key] ?? "")}
                  onChange={(value) => patch({ [key]: value })}
                  type="number"
                />
              ))}
            </div>
          </FormSection>

          <FormSection
            index="3"
            title="포함 및 제외 항목"
            description="나중에 분쟁이 생기기 쉬운 범위를 명확히 구분해주세요."
          >
            <Textarea label="포함 항목" value={form.includedItems} onChange={(value) => patch({ includedItems: value })} />
            <Textarea label="제외 항목" value={form.excludedItems} onChange={(value) => patch({ excludedItems: value })} />
          </FormSection>

          <FormSection
            index="4"
            title="디자인 및 제작 일정"
            description="기업은 금액만큼 일정과 수정 가능 횟수를 중요하게 봅니다."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="1차 디자인 제공일" value={form.firstDesignDate} onChange={(value) => patch({ firstDesignDate: value })} type="date" />
              <Field label="수정 가능 횟수" value={form.revisionCount} onChange={(value) => patch({ revisionCount: value })} type="number" />
              <Field label="제작 소요일" value={form.productionDays} onChange={(value) => patch({ productionDays: value })} type="number" />
              <Field label="견적 유효기간" value={form.validUntil} onChange={(value) => patch({ validUntil: value })} type="date" />
            </div>
          </FormSection>

          <FormSection
            index="5"
            title="제안 내용"
            description="견적 금액 외에 업체의 강점과 진행 방식을 설명해주세요."
          >
            <Textarea label="제안 내용" value={form.proposal} onChange={(value) => patch({ proposal: value })} rows={7} />
          </FormSection>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-booth-line pt-5">
          <p className="text-sm font-bold text-booth-muted">
            {isSubmitted ? "이미 최종 제출된 견적은 수정할 수 없습니다." : "입력 내용은 임시저장 후 다시 이어서 작성할 수 있습니다."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-booth-line px-5 py-3 text-sm font-black text-booth-ink disabled:opacity-60"
              disabled={isPending || Boolean(isSubmitted)}
              onClick={() => save("draft")}
              type="button"
            >
              {isPending ? "임시저장 중..." : "임시저장"}
            </button>
            <button
              className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              disabled={isPending || Boolean(isSubmitted) || !canSubmitWithSubscription}
              onClick={() => save("submit")}
              type="button"
              title={!canSubmitWithSubscription ? "active 또는 trial 구독 상태에서만 제출할 수 있습니다." : undefined}
            >
              {isPending ? "최종 제출 중..." : "견적 최종 제출"}
            </button>
          </div>
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
          <p className="text-xs font-black uppercase tracking-[0.16em] text-booth-blue">Quote Preview</p>
          <h2 className="mt-3 text-3xl font-black text-booth-ink">{formatCurrency(previewTotal)}</h2>
          <p className="mt-1 text-sm font-bold text-booth-muted">
            {form.vatIncluded ? "부가세 포함" : "부가세 별도"} · {contractor.company_name}
          </p>
          <dl className="mt-5 grid gap-3">
            <PreviewRow label="부스 유형" value={form.boothType || "입력 전"} />
            <PreviewRow label="상세 비용 합계" value={formatCurrency(costTotal)} />
            {hasCostMismatch ? <PreviewRow label="총액 차이" value={formatCurrency(totalPriceValue - costTotal)} /> : null}
            <PreviewRow label="1차 디자인" value={form.firstDesignDate || "미정"} />
            <PreviewRow label="제작 기간" value={form.productionDays ? `${form.productionDays}일` : "미정"} />
            <PreviewRow label="유효기간" value={form.validUntil || "미정"} />
          </dl>
        </section>
      </aside>
    </div>
  );
}

function getMissingRequired(form: QuoteFormData) {
  const missing: string[] = [];
  if (!form.boothType.trim()) missing.push("제안 부스 유형");
  if (numeric(form.totalPrice) <= 0) missing.push("총 견적 금액");
  if (!form.includedItems.trim()) missing.push("포함 항목");
  if (!form.proposal.trim()) missing.push("제안 내용");
  if (!form.validUntil) missing.push("견적 유효기간");
  return missing;
}

function FormSection({
  index,
  title,
  description,
  children
}: {
  index: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-booth-line bg-white p-5">
      <div className="mb-4 flex gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-black text-booth-blue">
          {index}
        </span>
        <div>
          <h2 className="text-lg font-black text-booth-ink">{title}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-booth-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
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

function Notice({ tone, children }: { tone: "success" | "error" | "warning"; children: React.ReactNode }) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-700";
  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${className}`}>
      {children}
    </div>
  );
}
