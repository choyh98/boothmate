"use server";

import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanyOrThrow } from "@/lib/quote-requests/queries";
import {
  cleanRequiredItems,
  parseNumber,
  validateQuoteRequestForm
} from "@/lib/quote-requests/validation";
import type { QuoteRequestFormData, QuoteRequestStatus } from "@/types/quote-request";

export type SaveQuoteRequestResult = {
  ok: boolean;
  message: string;
  id?: string;
  status?: QuoteRequestStatus;
};

function deadlineFromHours(hours: string) {
  const parsed = Number(hours);
  const safeHours = Number.isFinite(parsed) && parsed > 0 ? parsed : 48;
  return new Date(Date.now() + safeHours * 60 * 60 * 1000).toISOString();
}

export async function saveQuoteRequestAction(
  input: QuoteRequestFormData,
  intent: "draft" | "submit"
): Promise<SaveQuoteRequestResult> {
  const context = await getCurrentUserContext();
  if (!context || context.profile.role !== "company") {
    return { ok: false, message: "참여기업 계정으로 로그인해주세요." };
  }

  const validationError = validateQuoteRequestForm(input, intent === "submit");
  if (validationError) {
    return { ok: false, message: validationError };
  }

  try {
    const company = await getCompanyOrThrow(context.userId);
    const supabase = createSupabaseServerClient();
    const status: QuoteRequestStatus = intent === "submit" ? "open" : "draft";
    const payload = {
      company_id: company.id,
      exhibition_id: input.exhibitionId,
      title: input.title.trim(),
      booth_count: parseNumber(input.boothCount),
      booth_width: parseNumber(input.boothWidth),
      booth_depth: parseNumber(input.boothDepth),
      booth_area: parseNumber(input.boothArea),
      open_sides: input.openSides || "위치 미정",
      booth_types: input.boothTypes,
      budget_min: parseNumber(input.budgetMin),
      budget_max: parseNumber(input.budgetMax),
      vat_included: input.vatIncluded,
      required_items: cleanRequiredItems(input.requiredItems),
      design_styles: input.designStyles,
      requirements: input.requirements.trim() || null,
      deadline: intent === "submit" ? deadlineFromHours(input.deadlineHours) : null,
      status
    };

    if (input.id) {
      const { data: existing, error: existingError } = await supabase
        .from("quote_requests")
        .select("id,status")
        .eq("id", input.id)
        .eq("company_id", company.id)
        .single();

      if (existingError || !existing) {
        return { ok: false, message: "수정할 견적 요청을 찾을 수 없습니다." };
      }

      if (existing.status !== "draft") {
        return { ok: false, message: "이미 제출된 요청서는 수정할 수 없습니다." };
      }

      const { data, error } = await supabase
        .from("quote_requests")
        .update(payload)
        .eq("id", input.id)
        .eq("company_id", company.id)
        .select("id,status")
        .single();

      if (error) throw error;

      return {
        ok: true,
        message: status === "draft" ? "임시저장했습니다." : "견적 요청을 제출했습니다.",
        id: data.id,
        status: data.status
      };
    }

    const { data, error } = await supabase
      .from("quote_requests")
      .insert(payload)
      .select("id,status")
      .single();

    if (error) throw error;

    return {
      ok: true,
      message: status === "draft" ? "임시저장했습니다." : "견적 요청을 제출했습니다.",
      id: data.id,
      status: data.status
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "저장 중 문제가 발생했습니다."
    };
  }
}

export async function continueDraftAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/company/quote-requests");
  redirect(`/company/quote-requests/new?draftId=${id}`);
}
