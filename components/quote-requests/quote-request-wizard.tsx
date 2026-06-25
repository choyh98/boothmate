"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuoteRequestAction } from "@/app/company/quote-requests/actions";
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
const steps = ["전시회", "부스 정보", "부스 유형", "예산", "필요 시설", "디자인 요청", "첨부 안내", "최종 확인"];

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

export function QuoteRequestWizard({
  exhibitions,
  initialRequest,
  initialExhibitionId
}: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<QuoteRequestFormData>(
    initialRequest
      ? requestToForm(initialRequest)
      : emptyQuoteRequestForm(initialExhibitionId ?? "")
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedExhibition = useMemo(
    () => exhibitions.find((item) => item.id === form.exhibitionId),
    [exhibitions, form.exhibitionId]
  );

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
        router.push(`/company/quote-requests/${result.id}`);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr_300px]">
      <aside className="rounded-[24px] border border-white/80 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-black text-booth-ink">견적 요청 단계</h2>
        <div className="grid gap-2">
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
              {index < step ? "✓ " : `${index + 1}. `}
              {label}
            </button>
          ))}
        </div>
      </aside>

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

        {step === 0 ? (
          <StepBlock title="참여할 전시회를 선택해주세요.">
            <div className="grid max-h-[520px] gap-3 overflow-auto pr-1">
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
                    {item.start_date ?? "일정 미정"} · {item.venue_group ?? ""} {item.venue ?? ""}
                  </span>
                </button>
              ))}
            </div>
          </StepBlock>
        ) : null}

        {step === 1 ? (
          <StepBlock title="부스 규모와 위치를 알려주세요.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="요청 제목" value={form.title} onChange={(value) => patch({ title: value })} />
              <Field label="부스 수" value={form.boothCount} onChange={(value) => patch({ boothCount: value, boothArea: value ? String(Number(value) * 9) : form.boothArea })} type="number" />
              <Field label="가로 길이(m)" value={form.boothWidth} onChange={(value) => patch({ boothWidth: value })} type="number" />
              <Field label="세로 길이(m)" value={form.boothDepth} onChange={(value) => patch({ boothDepth: value })} type="number" />
              <Field label="전체 면적㎡" value={form.boothArea} onChange={(value) => patch({ boothArea: value })} type="number" />
              <label className="grid gap-2 text-sm font-black text-booth-ink">
                오픈 면
                <select className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3" value={form.openSides} onChange={(event) => patch({ openSides: event.target.value })}>
                  {openSides.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </StepBlock>
        ) : null}

        {step === 2 ? (
          <StepBlock title="원하는 부스 유형을 선택해주세요.">
            <ChoiceGrid values={boothTypes} selected={form.boothTypes} onToggle={(value) => toggleList("boothTypes", value)} />
          </StepBlock>
        ) : null}

        {step === 3 ? (
          <StepBlock title="예상 예산을 알려주세요.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="최소 예산" value={form.budgetMin} onChange={(value) => patch({ budgetMin: value })} type="number" />
              <Field label="최대 예산" value={form.budgetMax} onChange={(value) => patch({ budgetMax: value })} type="number" />
              <label className="flex items-center gap-3 rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-black text-booth-ink">
                <input checked={form.vatIncluded} onChange={(event) => patch({ vatIncluded: event.target.checked })} type="checkbox" />
                부가세 포함
              </label>
            </div>
          </StepBlock>
        ) : null}

        {step === 4 ? (
          <StepBlock title="부스에 필요한 항목을 선택해주세요.">
            <div className="grid gap-3 md:grid-cols-3">
              {facilityItems.map((item) => (
                <label className="rounded-2xl border border-booth-line bg-slate-50 p-4 text-sm font-black text-booth-ink" key={item}>
                  {item}
                  <input
                    className="mt-3 w-full rounded-xl border border-booth-line px-3 py-2"
                    min={0}
                    onChange={(event) => setFacility(item, Number(event.target.value))}
                    placeholder="수량"
                    type="number"
                    value={form.requiredItems[item] ?? ""}
                  />
                </label>
              ))}
            </div>
          </StepBlock>
        ) : null}

        {step === 5 ? (
          <StepBlock title="원하는 디자인과 요청사항을 알려주세요.">
            <ChoiceGrid values={designStyles} selected={form.designStyles} onToggle={(value) => toggleList("designStyles", value)} />
            <textarea
              className="mt-5 min-h-44 w-full rounded-2xl border border-booth-line bg-slate-50 p-4 text-sm font-bold outline-none focus:border-booth-blue"
              onChange={(event) => patch({ requirements: event.target.value })}
              placeholder="제품 전시대, 상담 테이블, 비교하고 싶은 부스 유형 등을 적어주세요."
              value={form.requirements}
            />
          </StepBlock>
        ) : null}

        {step === 6 ? (
          <StepBlock title="첨부자료 업로드는 준비 중입니다.">
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-sm font-bold leading-7 text-blue-800">
              로고, 배치도, 참고 이미지 업로드는 아직 제공하지 않습니다. 필요한 자료는 요청사항에 텍스트로 적어주세요.
            </div>
          </StepBlock>
        ) : null}

        {step === 7 ? (
          <StepBlock title="견적 요청 내용을 확인해주세요.">
            <SummaryList form={form} exhibitionTitle={selectedExhibition?.title ?? "선택 전"} />
            <label className="mt-5 grid gap-2 text-sm font-black text-booth-ink">
              견적 마감 시간
              <select className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3" value={form.deadlineHours} onChange={(event) => patch({ deadlineHours: event.target.value })}>
                <option value="24">24시간</option>
                <option value="48">48시간</option>
                <option value="72">72시간</option>
              </select>
            </label>
          </StepBlock>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-booth-line pt-5">
          <button className="rounded-xl border border-booth-line px-5 py-3 text-sm font-black text-booth-ink disabled:opacity-40" disabled={step === 0 || isPending} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button">
            이전
          </button>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl border border-booth-line px-5 py-3 text-sm font-black text-booth-ink disabled:opacity-60" disabled={isPending} onClick={() => save("draft")} type="button">
              {isPending ? "저장 중..." : "임시저장"}
            </button>
            {step < 7 ? (
              <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" disabled={isPending} onClick={() => setStep((current) => Math.min(7, current + 1))} type="button">
                다음
              </button>
            ) : (
              <button className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={isPending} onClick={() => save("submit")} type="button">
                {isPending ? "제출 중..." : "무료 견적 요청하기"}
              </button>
            )}
          </div>
        </div>
      </section>

      <aside className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-booth-ink">실시간 요청서 요약</h2>
        <SummaryList form={form} exhibitionTitle={selectedExhibition?.title ?? "선택 전"} compact />
      </aside>
    </div>
  );
}

function StepBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 text-2xl font-black text-booth-ink">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-booth-ink">
      {label}
      <input className="rounded-xl border border-booth-line bg-slate-50 px-4 py-3 font-bold outline-none focus:border-booth-blue" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  );
}

function ChoiceGrid({ values, selected, onToggle }: { values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
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
    ["예산", form.budgetMin || form.budgetMax ? `${form.budgetMin || "0"} ~ ${form.budgetMax || "미정"}원` : "미정"],
    ["필요 시설", Object.keys(form.requiredItems).length ? Object.entries(form.requiredItems).map(([key, value]) => `${key} ${value}`).join(", ") : "선택 전"],
    ["디자인", form.designStyles.join(", ") || "선택 전"]
  ];
  return (
    <dl className={compact ? "mt-4 grid gap-3" : "grid gap-3"}>
      {rows.map(([label, value]) => (
        <div className="rounded-xl bg-slate-50 p-4" key={label}>
          <dt className="text-xs font-black text-booth-muted">{label}</dt>
          <dd className="mt-1 text-sm font-black leading-6 text-booth-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
