"use server";

import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canSubmitQuote,
  getContractorOrThrow,
  getOpenQuoteRequest,
  isRequestOpenForQuotes
} from "@/lib/quotes/queries";
import {
  normalizeDate,
  parseMoney,
  parsePositiveInteger,
  validateQuoteForm
} from "@/lib/quotes/validation";
import type { QuoteFormData, QuoteStatus } from "@/types/quote";

export type SaveQuoteResult = {
  ok: boolean;
  message: string;
  id?: string;
  status?: QuoteStatus;
};

function trimOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function quotePayload(input: QuoteFormData, status: QuoteStatus, submittedAt: string | null) {
  return {
    quote_request_id: input.quoteRequestId,
    booth_type: trimOrNull(input.boothType),
    total_price: parseMoney(input.totalPrice),
    vat_included: input.vatIncluded,
    design_cost: parseMoney(input.designCost),
    material_cost: parseMoney(input.materialCost),
    construction_cost: parseMoney(input.constructionCost),
    transport_cost: parseMoney(input.transportCost),
    installation_cost: parseMoney(input.installationCost),
    dismantling_cost: parseMoney(input.dismantlingCost),
    electrical_cost: parseMoney(input.electricalCost),
    graphic_cost: parseMoney(input.graphicCost),
    furniture_cost: parseMoney(input.furnitureCost),
    other_cost: parseMoney(input.otherCost),
    included_items: trimOrNull(input.includedItems),
    excluded_items: trimOrNull(input.excludedItems),
    proposal: trimOrNull(input.proposal),
    first_design_date: normalizeDate(input.firstDesignDate),
    revision_count: parsePositiveInteger(input.revisionCount),
    production_days: parsePositiveInteger(input.productionDays),
    valid_until: normalizeDate(input.validUntil),
    status,
    submitted_at: submittedAt
  };
}

export async function saveQuoteAction(
  input: QuoteFormData,
  intent: "draft" | "submit"
): Promise<SaveQuoteResult> {
  const context = await getCurrentUserContext();
  if (!context || context.profile.role !== "contractor") {
    return { ok: false, message: "전시업체 계정으로 로그인해주세요." };
  }

  const validationError = validateQuoteForm(input, intent === "submit");
  if (validationError) {
    return { ok: false, message: validationError };
  }

  try {
    const contractor = await getContractorOrThrow(context.userId);
    const request = await getOpenQuoteRequest(input.quoteRequestId);

    if (!isRequestOpenForQuotes(request)) {
      return { ok: false, message: "마감되었거나 모집 중이 아닌 요청에는 견적을 제출할 수 없습니다." };
    }

    if (intent === "submit" && !canSubmitQuote(contractor)) {
      return { ok: false, message: "현재 구독 상태에서는 견적을 제출할 수 없습니다." };
    }

    const supabase = createSupabaseServerClient();
    const { data: existing, error: existingError } = await supabase
      .from("quotes")
      .select("id,status")
      .eq("quote_request_id", input.quoteRequestId)
      .eq("contractor_id", contractor.id)
      .maybeSingle();

    if (existingError) throw existingError;

    const status: QuoteStatus = intent === "submit" ? "submitted" : "draft";
    const submittedAt = intent === "submit" ? new Date().toISOString() : null;
    const payload = {
      ...quotePayload(input, status, submittedAt),
      contractor_id: contractor.id
    };

    if (existing) {
      if (existing.status !== "draft") {
        return { ok: false, message: "이미 최종 제출한 견적은 다시 저장할 수 없습니다.", id: existing.id, status: existing.status as QuoteStatus };
      }

      const { data, error } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", existing.id)
        .eq("contractor_id", contractor.id)
        .select("id,status")
        .single();

      if (error) throw error;

      return {
        ok: true,
        message: status === "draft" ? "견적을 임시저장했습니다." : "견적을 최종 제출했습니다.",
        id: data.id,
        status: data.status as QuoteStatus
      };
    }

    const { data, error } = await supabase
      .from("quotes")
      .insert(payload)
      .select("id,status")
      .single();

    if (error) throw error;

    return {
      ok: true,
      message: status === "draft" ? "견적을 임시저장했습니다." : "견적을 최종 제출했습니다.",
      id: data.id,
      status: data.status as QuoteStatus
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "견적 저장 중 문제가 발생했습니다."
    };
  }
}
