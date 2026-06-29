import type { QuoteRequestFormData, RequiredItems } from "@/types/quote-request";

export function emptyQuoteRequestForm(exhibitionId = ""): QuoteRequestFormData {
  return {
    exhibitionId,
    title: "",
    boothCount: "",
    boothWidth: "",
    boothDepth: "",
    boothArea: "",
    openSides: "위치 미정",
    boothTypes: [],
    budgetMin: "",
    budgetMax: "",
    vatIncluded: true,
    requiredItems: {},
    floorColor: "",
    floorColorOther: "",
    designStyles: [],
    requirements: "",
    deadlineHours: "48"
  };
}

export function parseNumber(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value.replaceAll(",", ""));
  return Number.isFinite(numeric) ? numeric : null;
}

export function cleanRequiredItems(items: RequiredItems) {
  return Object.fromEntries(
    Object.entries(items).filter(([, quantity]) => Number.isFinite(quantity) && quantity > 0)
  );
}

export function validateQuoteRequestForm(input: QuoteRequestFormData, submit: boolean) {
  if (!input.exhibitionId) return "참여할 전시회를 선택해주세요.";
  if (!input.title.trim()) return "요청 제목을 입력해주세요.";

  if (submit) {
    if (!input.boothCount) return "부스 수를 입력해주세요.";
    if (!input.boothTypes.length) return "원하는 부스 유형을 하나 이상 선택해주세요.";
    if (!input.budgetMin && !input.budgetMax) return "예산 범위를 입력해주세요.";
    if (!input.requirements.trim()) return "요청사항을 입력해주세요.";
  }

  return null;
}
