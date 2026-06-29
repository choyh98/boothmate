import type { Quote, QuoteFormData } from "@/types/quote";

export function emptyQuoteForm(quoteRequestId: string): QuoteFormData {
  return {
    quoteRequestId,
    boothType: "",
    totalPrice: "",
    vatIncluded: true,
    designCost: "",
    materialCost: "",
    constructionCost: "",
    transportCost: "",
    installationCost: "",
    dismantlingCost: "",
    electricalCost: "",
    graphicCost: "",
    furnitureCost: "",
    otherCost: "",
    includedItems: "",
    excludedItems: "",
    proposal: "",
    firstDesignDate: "",
    revisionCount: "",
    productionDays: "",
    validUntil: ""
  };
}

export function quoteToForm(quote: Quote): QuoteFormData {
  return {
    id: quote.id,
    quoteRequestId: quote.quote_request_id,
    boothType: quote.booth_type ?? "",
    totalPrice: quote.total_price ? String(quote.total_price) : "",
    vatIncluded: quote.vat_included,
    designCost: quote.design_cost ? String(quote.design_cost) : "",
    materialCost: quote.material_cost ? String(quote.material_cost) : "",
    constructionCost: quote.construction_cost ? String(quote.construction_cost) : "",
    transportCost: quote.transport_cost ? String(quote.transport_cost) : "",
    installationCost: quote.installation_cost ? String(quote.installation_cost) : "",
    dismantlingCost: quote.dismantling_cost ? String(quote.dismantling_cost) : "",
    electricalCost: quote.electrical_cost ? String(quote.electrical_cost) : "",
    graphicCost: quote.graphic_cost ? String(quote.graphic_cost) : "",
    furnitureCost: quote.furniture_cost ? String(quote.furniture_cost) : "",
    otherCost: quote.other_cost ? String(quote.other_cost) : "",
    includedItems: quote.included_items ?? "",
    excludedItems: quote.excluded_items ?? "",
    proposal: quote.proposal ?? "",
    firstDesignDate: quote.first_design_date ?? "",
    revisionCount: quote.revision_count ? String(quote.revision_count) : "",
    productionDays: quote.production_days ? String(quote.production_days) : "",
    validUntil: quote.valid_until ?? ""
  };
}

export function parseMoney(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value.replaceAll(",", ""));
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric);
}

export function parsePositiveInteger(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value.replaceAll(",", ""));
  if (!Number.isInteger(numeric) || numeric < 0) return null;
  return numeric;
}

export function normalizeDate(value: string) {
  return value.trim() || null;
}

export function validateQuoteForm(input: QuoteFormData, submit: boolean) {
  if (!input.quoteRequestId) return "견적 요청 정보가 없습니다.";

  if (!submit) return null;

  if (!input.boothType.trim()) return "제안할 부스 유형을 입력해주세요.";
  if (!input.totalPrice.trim()) return "총 견적 금액을 입력해주세요.";
  if (parseMoney(input.totalPrice) === null) return "총 견적 금액을 올바르게 입력해주세요.";
  if (!input.proposal.trim()) return "제안 내용을 입력해주세요.";
  if (!input.firstDesignDate) return "1차 디자인 제공일을 선택해주세요.";
  if (!input.revisionCount.trim()) return "수정 가능 횟수를 입력해주세요.";
  if (parsePositiveInteger(input.revisionCount) === null) return "수정 가능 횟수를 올바르게 입력해주세요.";
  if (!input.validUntil) return "견적 유효기간을 선택해주세요.";

  return null;
}
