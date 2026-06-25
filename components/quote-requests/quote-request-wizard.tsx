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
const designStyles = ["미니멀", "프리미엄", "테크", "친환경", "컬러풀", "따뜻한 분위기", "자유 제안"];
const facilityItems = ["안내데스크", "상담 테이블", "의자", "제품 전시대", "창고", "TV 모니터", "LED 스크린", "조명", "전기", "바닥 시공", "그래픽 출력", "간판", "운송", "설치", "철거"];
const openSides = ["1면 오픈", "2면 오픈", "3면 오픈", "4면 오픈", "위치 미정"];
const steps = ["전시회 정보", "부스 기본 조건", "예산과 일정", "상세 요청사항", "최종 확인"];

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
    requiredItems: request.required_items ?? {},
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
      setForm(parsed);
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
                helper="1부스는 보통 9㎡ 기준입니다."
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
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="최소 예산(원)" value={form.budgetMin} onChange={(value) => patch({ budgetMin: value })} type="number" />
              <Field label="최대 예산(원)" value={form.budgetMax} onChange={(value) => patch({ budgetMax: value })} type="number" />
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-black text-booth-ink">
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
            title="필요 시설과 디자인 요청을 알려주세요."
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
              <h3 className="text-sm font-black text-booth-ink">디자인 방향</h3>
              <ChoiceGrid values={designStyles} selected={form.designStyles} onToggle={(value) => toggleList("designStyles", value)} />
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
    Object.keys(form.requiredItems).length > 0,
    form.designStyles.length > 0,
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

function SummaryList({ form, exhibitionTitle, compact = false }: { form: QuoteRequestFormData; exhibitionTitle: string; compact?: boolean }) {
  const rows = [
    ["전시회", exhibitionTitle],
    ["부스 규모", form.boothCount ? `${form.boothCount}부스 / ${form.boothArea || "면적 미정"}㎡` : "미입력"],
    ["부스 유형", form.boothTypes.join(", ") || "선택 전"],
    ["예산", form.budgetMin || form.budgetMax ? `${moneyText(form.budgetMin) || "0원"} ~ ${moneyText(form.budgetMax) || "미정"}` : "미정"],
    ["견적 마감", `${form.deadlineHours}시간 후`],
    ["필요 시설", Object.keys(form.requiredItems).length ? Object.entries(form.requiredItems).map(([key, value]) => `${key} ${value}`).join(", ") : "선택 전"],
    ["디자인", form.designStyles.join(", ") || "선택 전"]
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
