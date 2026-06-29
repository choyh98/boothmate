"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanyQuote } from "@/lib/company-quotes/queries";
import { isDevQuoteRequestOwner } from "@/lib/quote-requests/dev-store";
import { getCompanyOrThrow } from "@/lib/quote-requests/queries";
import {
  markDevCompanyQuoteViewed,
  selectDevCompanyQuote
} from "@/lib/quotes/dev-store";

export type SelectQuoteResult = {
  ok: boolean;
  message: string;
  quoteId?: string;
  quoteRequestId?: string;
};

export async function markQuoteViewedAction(quoteId: string) {
  const context = await getCurrentUserContext();
  if (!context || context.profile.role !== "company") {
    return { ok: false, message: "참여기업 계정으로 로그인해주세요." };
  }

  try {
    if (isDevQuoteRequestOwner(context.userId)) {
      const company = await getCompanyOrThrow(context.userId);
      await markDevCompanyQuoteViewed(company.id, quoteId);
      return { ok: true, message: "견적을 열람했습니다." };
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("mark_quote_viewed", {
      target_quote_id: quoteId
    });

    if (error) throw error;
    return { ok: true, message: "견적을 열람했습니다." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "견적 열람 상태를 저장하지 못했습니다."
    };
  }
}

export async function selectQuoteAction(
  quoteRequestId: string,
  quoteId: string
): Promise<SelectQuoteResult> {
  const context = await getCurrentUserContext();
  if (!context || context.profile.role !== "company") {
    return { ok: false, message: "참여기업 계정으로 로그인해주세요." };
  }

  try {
    await getCompanyQuote(context.userId, quoteId);

    if (isDevQuoteRequestOwner(context.userId)) {
      const company = await getCompanyOrThrow(context.userId);
      await selectDevCompanyQuote(company.id, quoteRequestId, quoteId);

      revalidatePath(`/company/quote-requests/${quoteRequestId}`);
      revalidatePath(`/company/quote-requests/${quoteRequestId}/quotes`);
      revalidatePath(`/company/quote-requests/${quoteRequestId}/compare`);
      revalidatePath(`/company/quotes/${quoteId}`);

      return {
        ok: true,
        message: "최종 업체를 선택했습니다.",
        quoteId,
        quoteRequestId
      };
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("select_quote_for_request", {
      target_quote_request_id: quoteRequestId,
      target_quote_id: quoteId
    });

    if (error) throw error;

    revalidatePath(`/company/quote-requests/${quoteRequestId}`);
    revalidatePath(`/company/quote-requests/${quoteRequestId}/quotes`);
    revalidatePath(`/company/quote-requests/${quoteRequestId}/compare`);
    revalidatePath(`/company/quotes/${quoteId}`);

    return {
      ok: true,
      message: "최종 업체를 선택했습니다.",
      quoteId,
      quoteRequestId
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "업체 선택 중 문제가 발생했습니다."
    };
  }
}
