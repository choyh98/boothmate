"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuoteRequestAction } from "@/app/company/quote-requests/actions";
import { formatCurrency, formatDateRange } from "@/lib/format";
import { emptyQuoteRequestForm } from "@/lib/quote-requests/validation";
import type { Exhibition } from "@/types/exhibition";
import type { QuoteRequest, QuoteRequestFormData, RequiredItems } from "@/types/quote-request";

type WizardProps = {
  exhibitions: Exhibition[];
  initialRequest?: QuoteRequest | null;
  initialExhibitionId?: string;
};

const boothTypes = ["목공부스", "블록·모듈부스", "시스템부스", "팝업형 부스", "업체 추천"];
const facilityItems = ["안내데스크", "상담 테이블", "의자", "제품 전시대", "창고", "TV 모니터", "LED 스크린", "파이텍스", "그래픽 출력"];
const floorColors = ["청색", "회색", "적색", "녹색", "기타"];
const openSides = ["1면 오픈", "2면 오픈", "3면 오픈", "4면 오픈", "위치 미정"];
const steps = ["전시회 정보", "부스 기본 조건", "예산과 일정", "상세 요청사항", "최종 확인"];
const budgetRanges = [
  { label: "300만원 이하", min: "", max: "3000000" },
  { label: "300만원 - 500만원", min: "3000000", max: "5000000" },
  { label: "500만원 - 1,000만원", min: "5000000", max: "10000000" },
  { label: "1,000만원 - 1,500만원", min: "10000000", max: "15000000" },
  { label: "1,500만원 - 2,000만원", min: "15000000", max: "20000000" },
  { label: "2,000만원 - 2,500만원", min: "20000000", max: "25000000" },
  { label: "2,500만원 - 3,000만원", min: "25000000", max: "30000000" },
  { label: "3,000만원 - 3,500만원", min: "30000000", max: "35000000" },
  { label: "3,500만원 - 4,000만원", min: "35000000", max: "40000000" },
  { label: "4,000만원 - 4,500만원", min: "40000000", max: "45000000" },
  { label: "4,500만원 - 5,000만원", min: "45000000", max: "50000000" },
  { label: "5,000만원 이상", min: "50000000", max: "" }
];

function requestToForm(request: QuoteRequest): QuoteRequestFormData {
  return {
    id: request.id,
    exhibitionId: request.exhibition_id ?? "",
    title: request.title,
    boothCount: request.booth_count ? String(request.booth_count) : "",
    boothWidth: request.booth_width ? String(request.booth_width) : "",
    boothDepth: request.booth_depth ? String(request.booth_depth) : "",
    boothArea: request.booth_area ? String(request.booth_area) : "",
    openSides: request.open_sides ?? "위치 미정",
    boothTypes: request.booth_types ?? [],
    budgetMin: request.budget_min ? String(request.budget_min) : "",
    budgetMax: request.budget_max ? String(request.budget_max) : "",
    vatIncluded: request.vat_included,
    requiredItems: cleanVisibleRequiredItems(request.required_items ?? {}),
    floorColor: floorColorFromRequirements(request.requirements),
    floorColorOther: floorColorOtherFromRequirements(request.requirements),
    designStyles: request.design_styles ?? [],
    requirements: request.requirements ?? "",
    deadlineHours: "48"
  };
}

function initialFormFromExhibition(exhibitions: Exhibition[], exhibitionId?: string) {
  const form = emptyQuoteRequestForm(exhibitionId ?? "");
  if (!exhibitionId) return form;

  const exhibition = exhibitions.find((item) => item.id === exhibitionId);
  return {
    ...form,
    title: exhibition ? `${exhibition.title} 부스 견적 요청` : form.title
  };
}

export function QuoteRequestWizard({
  exhibitions,
  initialRequest,
  initialExhibitionId
}: WizardProps) {
  const router = useRouter();
  const storageKey = useMemo(
    () => `boothmate:quote-request:${initialRequest?.id ?? initialExhibitionId ?? "new"}`,
    [initialExhibitionId, initialRequest?.id]
  );
  const [step, setStep] = useState(() => (initialExhibitionId && !initialRequest ? 1 : 0));
  const [form, setForm] = useState<QuoteRequestFormData>(
    initialRequest
      ? requestToForm(initialRequest)
      : initialFormFromExhibition(exhibitions, initialExhibitionId)
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [floorExampleOpen, setFloorExampleOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedExhibition = useMemo(
    () => exhibitions.find((item) => item.id === form.exhibitionId),
    [exhibitions, form.exhibitionId]
  );
  const completion = useMemo(() => getCompletion(form), [form]);

  useEffect(() => {
    if (initialRequest) return;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as QuoteRequestFormData;
      setForm({
        ...parsed,
        floorColor: parsed.floorColor ?? "",
        floorColorOther: parsed.floorColorOther ?? "",
        requiredItems: cleanVisibleRequiredItems(parsed.requiredItems ?? {})
      });
      setMessage("브라우저에 보관된 작성 내용을 불러왔습니다. 서버 저장은 임시저장을 눌러야 완료됩니다.");
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [initialRequest, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(form));
  }, [form, storageKey]);

  function patch(patchValue: Partial<QuoteRequestFormData>) {
    setForm((current) => ({ ...current, ...patchValue }));
  }

  function toggleList(key: "boothTypes" | "designStyles", value: string) {
    setForm((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
      };
    });
  }

  function setFacility(name: string, quantity: number) {
    setForm((current) => {
      const nextItems: RequiredItems = { ...current.requiredItems };
      if (quantity <= 0 || !Number.isFinite(quantity)) delete nextItems[name];
      else nextItems[name] = quantity;
      return { ...current, requiredItems: nextItems };
    });
  }

  function save(intent: "draft" | "submit") {
    setMessage("");
    setError("");

    if (intent === "submit") {
      const missing = getMissingRequired(form);
      if (missing.length > 0) {
        setError(`견적 요청 제출 전 ${missing.join(", ")} 항목을 입력해주세요.`);
        setStep(getFirstMissingStep(form));
        return;
      }
    }

    startTransition(async () => {
      const result = await saveQuoteRequestAction(form, intent);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      if (result.id) {
        patch({ id: result.id });
        window.history.replaceState(null, "", `/company/quote-requests/new?draftId=${result.id}`);
      }
      if (intent === "submit" && result.id) {
        window.localStorage.removeItem(storageKey);
        router.push(`/company/quote-requests/${result.id}`);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
      <aside className="self-start rounded-[20px] border border-white/80 bg-white p-4 shadow-sm lg:sticky lg:top-28">
        <div className="mb-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black text-booth-muted">작성 진행률</p>
          <p className="mt-1 text-2xl font-black text-booth-ink">{completion}%</p>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-booth-blue" style={{ width: `${completion}%` }} />
          </div>
        </div>
        <nav className="grid gap-2" aria-label="견적 요청 작성 단계">
          {steps.map((label, index) => (
            <button
              className={`rounded-xl px-3 py-3 text-left text-sm font-black transition ${
                index === step
                  ? "bg-booth-blue text-white"
                  : index < step
                    ? "bg-blue-50 text-booth-blue"
                    : "bg-slate-50 text-booth-muted"
              }`}
              key={label}
              onClick={() => setStep(index)}
              type="button"
            >
              {index < step ? "완료 · " : `${index + 1}. `}
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm md:p-7">
        {message ? <Notice tone="success">{message}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}

        {step === 0 ? (
          <StepBlock
            eyebrow="STEP 1"
            title="참가할 전시회를 선택해주세요."
            description="전시회를 선택하면 요청 제목과 전시 일정이 자동으로 연결됩니다."
          >
            <div className="grid max-h-[560px] gap-3 overflow-auto pr-1">
              {exhibitions.map((item) => (
                <button
                  className={`rounded-2xl border p-4 text-left transition hover:border-booth-blue ${
                    form.exhibitionId === item.id ? "border-booth-blue bg-blue-50" : "border-booth-line bg-slate-50"
                  }`}
                  key={item.id}
                  onClick={() => patch({ exhibitionId: item.id, title: `${item.title} 부스 견적 요청` })}
                  type="button"
                >
                  <strong className="block text-base font-black text-booth-ink">{item.title}</strong>
                  <span className="mt-2 block text-sm font-bold text-booth-muted">
                    {formatDateRange(item.start_date, item.end_date)} · {item.venue_group ?? ""} {item.venue ?? ""}
                  </span>
                </button>
              ))}
            </div>
          </StepBlock>
        ) : null}

        {step === 1 ? (
          <StepBlock
            eyebrow="STEP 2"
            title="부스 규모와 기본 조건을 입력해주세요."
            description="업체가 견적 가능 여부를 판단하는 가장 중요한 정보입니다."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="요청 제목" value={form.title} onChange={(value) => patch({ title: value })} />
              <Field
                label="부스 수"
                value={form.boothCount}
                onChange={(value) => patch({ boothCount: value, boothArea: value ? String(Number(value) * 9) : form.boothArea })}
                type="number"
              />
              <Field label="가로 길이(m)" value={form.boothWidth} onChange={(value) => patch({ boothWidth: value })} type="number" />
              <Field label="세로 길이(m)" value={form.boothDepth} onChange={(value) => patch({ boothDepth: value })} type="number" />
              <Field label="전체 면적(㎡)" value={form.boothArea} onChange={(value) => patch({ boothArea: value })} type="number" />
              <label className="grid gap-2 text-sm font-black text-booth-ink">
                오픈 면
                <select className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue" value={form.openSides} onChange={(event) => patch({ openSides: event.target.value })}>
                  {openSides.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-black text-booth-ink">희망 부스 유형</h3>
              <ChoiceGrid values={boothTypes} selected={form.boothTypes} onToggle={(value) => toggleList("boothTypes", value)} />
            </div>
          </StepBlock>
        ) : null}

        {step === 2 ? (
          <StepBlock
            eyebrow="STEP 3"
            title="예산과 견적 마감 시간을 정해주세요."
            description="예산 범위와 마감 시간이 명확할수록 업체가 현실적인 견적을 제출할 수 있습니다."
          >
            <div className="grid items-end gap-4 md:grid-cols-2">
              <BudgetRangeSelect
                max={form.budgetMax}
                min={form.budgetMin}
                onSelect={(range) => patch({ budgetMin: range.min, budgetMax: range.max })}
              />
              <label className="flex h-12 items-center gap-3 rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-black text-booth-ink">
                <input checked={form.vatIncluded} onChange={(event) => patch({ vatIncluded: event.target.checked })} type="checkbox" />
                부가세 포함 예산입니다.
              </label>
              <label className="grid gap-2 text-sm font-black text-booth-ink">
                견적 마감 시간
                <select className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue" value={form.deadlineHours} onChange={(event) => patch({ deadlineHours: event.target.value })}>
                  <option value="24">24시간 후 마감</option>
                  <option value="48">48시간 후 마감</option>
                  <option value="72">72시간 후 마감</option>
                </select>
              </label>
            </div>
          </StepBlock>
        ) : null}

        {step === 3 ? (
          <StepBlock
            eyebrow="STEP 4"
            title="필요 시설과 상세 요청사항을 알려주세요."
            description="세부 요청은 업체의 포함 항목과 제안 품질에 직접 영향을 줍니다."
          >
            <h3 className="text-sm font-black text-booth-ink">필요 시설</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {facilityItems.map((item) => (
                <label className="rounded-2xl border border-booth-line bg-slate-50 p-4 text-sm font-black text-booth-ink" key={item}>
                  {item}
                  <input
                    className="mt-3 w-full rounded-xl border border-booth-line px-3 py-2 outline-none focus:border-booth-blue"
                    min={0}
                    onChange={(event) => setFacility(item, Number(event.target.value))}
                    placeholder="수량"
                    type="number"
                    value={form.requiredItems[item] ?? ""}
                  />
                </label>
              ))}
            </div>
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-black text-booth-ink">바닥색</h3>
                <button className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-booth-blue transition hover:border-booth-blue" onClick={() => setFloorExampleOpen(true)} type="button">
                  예시 보기
                </button>
              </div>
              <ChoiceGrid
                values={floorColors}
                selected={form.floorColor ? [form.floorColor] : []}
                onToggle={(value) => {
                  const nextFloorColor = form.floorColor === value ? "" : value;
                  patch({
                    floorColor: nextFloorColor,
                    floorColorOther: nextFloorColor === "기타" ? form.floorColorOther : ""
                  });
                }}
              />
              {form.floorColor === "기타" ? (
                <div className="mt-3">
                  <Field
                    label="기타 바닥색"
                    value={form.floorColorOther}
                    onChange={(value) => patch({ floorColorOther: value })}
                  />
                </div>
              ) : null}
            </div>
            <label className="mt-6 grid gap-2 text-sm font-black text-booth-ink">
              상세 요청사항
              <textarea
                className="min-h-44 w-full rounded-2xl border border-booth-line bg-slate-50 p-4 text-sm font-bold leading-7 outline-none focus:border-booth-blue"
                onChange={(event) => patch({ requirements: event.target.value })}
                placeholder="제품 전시 방식, 상담 공간, 브랜드 분위기, 반드시 포함해야 하는 조건을 적어주세요."
                value={form.requirements}
              />
            </label>
            <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-bold leading-7 text-blue-800">
              로고, 배치도, 참고 이미지 업로드는 준비 중입니다. 이번 요청에서는 필요한 자료를 상세 요청사항에 텍스트로 적어주세요.
            </div>
          </StepBlock>
        ) : null}

        {step === 4 ? (
          <StepBlock
            eyebrow="STEP 5"
            title="제출 전 요청 내용을 확인해주세요."
            description="제출하면 전시업체에게 공개되고, 마감 전까지 견적을 받을 수 있습니다."
          >
            <SummaryList form={form} exhibitionTitle={selectedExhibition?.title ?? "선택 전"} />
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-900">
              요청 내용은 제출 후에도 상세 화면에서 확인할 수 있습니다. 첨부파일, 채팅, 연락처 공개는 아직 제공하지 않습니다.
            </div>
          </StepBlock>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-booth-line pt-5">
          <button className="rounded-xl border border-booth-line px-5 py-3 text-sm font-black text-booth-ink disabled:opacity-40" disabled={step === 0 || isPending} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button">
            이전 단계
          </button>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl border border-booth-line px-5 py-3 text-sm font-black text-booth-ink disabled:opacity-60" disabled={isPending} onClick={() => save("draft")} type="button">
              {isPending ? "임시저장 중..." : "임시저장"}
            </button>
            {step < steps.length - 1 ? (
              <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={isPending} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} type="button">
                다음 단계
              </button>
            ) : (
              <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={isPending} onClick={() => save("submit")} type="button">
                {isPending ? "견적 요청 제출 중..." : "견적 요청 제출"}
              </button>
            )}
          </div>
        </div>
      </section>

      <aside className="self-start rounded-[24px] border border-white/80 bg-white p-5 shadow-sm lg:sticky lg:top-28">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-booth-blue">Request Summary</p>
        <h2 className="mt-3 text-lg font-black text-booth-ink">실시간 요청서 요약</h2>
        <SummaryList form={form} exhibitionTitle={selectedExhibition?.title ?? "선택 전"} compact />
      </aside>

      {floorExampleOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-5" role="dialog" aria-modal="true" aria-label="바닥색 예시">
          <div className="w-full max-w-3xl rounded-[24px] bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-booth-ink">바닥색 예시</h2>
              <button className="rounded-xl border border-booth-line px-4 py-2 text-sm font-black text-booth-ink" onClick={() => setFloorExampleOpen(false)} type="button">
                닫기
              </button>
            </div>
            <img alt="파이텍스 바닥색 예시" className="max-h-[72vh] w-full rounded-2xl object-contain" src="/assets/example.jpg" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getCompletion(form: QuoteRequestFormData) {
  const checks = [
    Boolean(form.exhibitionId),
    Boolean(form.title.trim()),
    Boolean(form.boothCount || form.boothArea),
    form.boothTypes.length > 0,
    Boolean(form.budgetMax || form.budgetMin),
    Object.keys(form.requiredItems).length > 0 || Boolean(form.floorColor),
    Boolean(form.requirements.trim())
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getMissingRequired(form: QuoteRequestFormData) {
  const missing: string[] = [];
  if (!form.exhibitionId) missing.push("전시회");
  if (!form.title.trim()) missing.push("요청 제목");
  if (!form.boothCount && !form.boothArea) missing.push("부스 규모");
  if (form.boothTypes.length === 0) missing.push("부스 유형");
  if (!form.budgetMin && !form.budgetMax) missing.push("예산");
  return missing;
}

function getFirstMissingStep(form: QuoteRequestFormData) {
  if (!form.exhibitionId) return 0;
  if (!form.title.trim() || (!form.boothCount && !form.boothArea) || form.boothTypes.length === 0) return 1;
  if (!form.budgetMin && !form.budgetMax) return 2;
  return 4;
}

function StepBlock({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-booth-blue">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-booth-ink">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-booth-muted">{description}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  helper
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  helper?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-booth-ink">
      {label}
      <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
      {helper ? <span className="text-xs font-bold text-booth-muted">{helper}</span> : null}
    </label>
  );
}

function ChoiceGrid({ values, selected, onToggle }: { values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {values.map((value) => (
        <button className={`rounded-2xl border p-5 text-left text-sm font-black transition ${selected.includes(value) ? "border-booth-blue bg-blue-50 text-booth-blue" : "border-booth-line bg-slate-50 text-booth-ink"}`} key={value} onClick={() => onToggle(value)} type="button">
          {value}
        </button>
      ))}
    </div>
  );
}

function BudgetRangeSelect({
  min,
  max,
  onSelect
}: {
  min: string;
  max: string;
  onSelect: (range: (typeof budgetRanges)[number]) => void;
}) {
  const selectedValue = `${min}|${max}`;

  return (
    <label className="grid gap-2 text-sm font-black text-booth-ink">
      희망 예산 범위
      <select
        className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue"
        onChange={(event) => {
          const range = budgetRanges.find((item) => `${item.min}|${item.max}` === event.target.value);
          if (range) onSelect(range);
        }}
        value={selectedValue}
      >
        <option value="|">예산 범위를 선택해주세요</option>
        {budgetRanges.map((range) => (
          <option key={range.label} value={`${range.min}|${range.max}`}>
            {range.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryList({ form, exhibitionTitle, compact = false }: { form: QuoteRequestFormData; exhibitionTitle: string; compact?: boolean }) {
  const rows = [
    ["전시회", exhibitionTitle],
    ["부스 규모", form.boothCount ? `${form.boothCount}부스 / ${form.boothArea || "면적 미정"}㎡` : "미입력"],
    ["부스 유형", form.boothTypes.join(", ") || "선택 전"],
    ["예산", budgetText(form)],
    ["견적 마감", `${form.deadlineHours}시간 후`],
    ["바닥색", floorColorText(form)],
    ["필요 시설", Object.keys(form.requiredItems).length ? Object.entries(form.requiredItems).map(([key, value]) => `${key} ${value}`).join(", ") : "선택 전"]
  ];
  return (
    <dl className={compact ? "mt-4 grid gap-3" : "grid gap-3 md:grid-cols-2"}>
      {rows.map(([label, value]) => (
        <div className="rounded-xl bg-slate-50 p-4" key={label}>
          <dt className="text-xs font-black text-booth-muted">{label}</dt>
          <dd className="mt-1 text-sm font-black leading-6 text-booth-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function budgetText(form: Pick<QuoteRequestFormData, "budgetMin" | "budgetMax">) {
  if (!form.budgetMin && !form.budgetMax) return "미정";

  const selectedRange = budgetRanges.find(
    (range) => range.min === form.budgetMin && range.max === form.budgetMax
  );
  if (selectedRange) return selectedRange.label;

  return `${moneyText(form.budgetMin) || "0원"} ~ ${moneyText(form.budgetMax) || "미정"}`;
}

function floorColorFromRequirements(requirements: string | null) {
  const match = requirements?.match(/바닥색:\s*(청색|회색|적색|녹색|기타)(?:\s*\(([^)]+)\))?/);
  return match?.[1] ?? "";
}

function floorColorOtherFromRequirements(requirements: string | null) {
  const match = requirements?.match(/바닥색:\s*기타(?:\s*\(([^)]+)\))?/);
  return match?.[1] ?? "";
}

function floorColorText(form: Pick<QuoteRequestFormData, "floorColor" | "floorColorOther">) {
  if (!form.floorColor) return "선택 전";
  if (form.floorColor === "기타" && form.floorColorOther.trim()) return `기타 (${form.floorColorOther.trim()})`;
  return form.floorColor;
}

function cleanVisibleRequiredItems(items: RequiredItems) {
  const visibleItems = new Set(facilityItems);
  return Object.fromEntries(Object.entries(items).filter(([key]) => visibleItems.has(key)));
}

function moneyText(value: string) {
  if (!value) return "";
  return formatCurrency(Number(value));
}

function Notice({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";
  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${className}`}>
      {children}
    </div>
  );
}
