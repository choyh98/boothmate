import { getCurrentContractor } from "@/lib/auth/get-current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getDevOpenQuoteRequest,
  isDevQuoteRequestStoreEnabled,
  listDevOpenQuoteRequests
} from "@/lib/quote-requests/dev-store";
import {
  getDevQuote,
  getDevQuoteForRequest,
  isDevQuoteId,
  isDevQuoteRequestId,
  isDevQuoteStoreOwner,
  listDevQuotes,
  listDevSubmittedQuotes
} from "@/lib/quotes/dev-store";
import type { Contractor } from "@/types/auth";
import type { Quote } from "@/types/quote";
import type { QuoteRequest } from "@/types/quote-request";

const quoteRequestSelect = `
  id,company_id,exhibition_id,title,booth_count,booth_width,booth_depth,booth_area,open_sides,
  booth_types,budget_min,budget_max,vat_included,required_items,design_styles,requirements,
  deadline,status,selected_quote_id,selected_at,created_at,updated_at,
  exhibitions(id,title,venue,venue_group,region,start_date,end_date,industry,status)
`;

const quoteSelect = `
  id,quote_request_id,contractor_id,booth_type,total_price,vat_included,design_cost,material_cost,
  construction_cost,transport_cost,installation_cost,dismantling_cost,electrical_cost,graphic_cost,
  furniture_cost,other_cost,included_items,excluded_items,proposal,first_design_date,revision_count,
  production_days,valid_until,status,submitted_at,viewed_at,selected_at,rejected_at,created_at,updated_at,
  quote_requests(${quoteRequestSelect})
`;

export const allowedQuoteSubscriptionStatuses = ["active", "trial"];

export function canSubmitQuote(contractor: Contractor | null) {
  return Boolean(contractor && allowedQuoteSubscriptionStatuses.includes(contractor.subscription_status));
}

export async function getContractorOrThrow(ownerId: string) {
  const contractor = await getCurrentContractor(ownerId);
  if (!contractor) {
    throw new Error("업체 정보를 찾을 수 없습니다. 전시업체 계정으로 다시 로그인해주세요.");
  }
  if (ownerId.startsWith("dev-")) {
    return contractor;
  }
  return contractor;
}

export function isRequestOpenForQuotes(request: Pick<QuoteRequest, "status" | "deadline">) {
  return request.status === "open" && (!request.deadline || new Date(request.deadline).getTime() > Date.now());
}

export async function listOpenQuoteRequests() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select(quoteRequestSelect)
    .eq("status", "open")
    .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
    .order("deadline", { ascending: true, nullsFirst: false });

  if (error) throw error;
  const supabaseRequests = ((data ?? []) as unknown as QuoteRequest[]).filter(
    (request) => request.exhibitions?.status !== "cancelled"
  );
  const devRequests = await listDevOpenQuoteRequests();
  return [...supabaseRequests, ...devRequests.filter((request) => request.exhibitions?.status !== "cancelled")];
}

export async function getOpenQuoteRequest(id: string) {
  if (isDevQuoteRequestStoreEnabled() && id.startsWith("dev-quote-request-")) {
    return getDevOpenQuoteRequest(id);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select(quoteRequestSelect)
    .eq("id", id)
    .eq("status", "open")
    .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
    .single();

  if (error) throw error;
  return data as unknown as QuoteRequest;
}

export async function getMyQuoteForRequest(ownerId: string, quoteRequestId: string) {
  const contractor = await getContractorOrThrow(ownerId);
  if (isDevQuoteRequestId(quoteRequestId)) {
    return getDevQuoteForRequest(contractor.id, quoteRequestId);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(quoteSelect)
    .eq("quote_request_id", quoteRequestId)
    .eq("contractor_id", contractor.id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as Quote | null;
}

export async function listMySubmittedQuotes(ownerId: string) {
  const contractor = await getContractorOrThrow(ownerId);
  if (isDevQuoteStoreOwner(ownerId)) {
    return listDevSubmittedQuotes(contractor.id);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(quoteSelect)
    .eq("contractor_id", contractor.id)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as Quote[];
}

export async function listMyQuotes(ownerId: string) {
  const contractor = await getContractorOrThrow(ownerId);
  if (isDevQuoteStoreOwner(ownerId)) {
    return listDevQuotes(contractor.id);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(quoteSelect)
    .eq("contractor_id", contractor.id)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as Quote[];
}

export async function getMyQuote(ownerId: string, quoteId: string) {
  const contractor = await getContractorOrThrow(ownerId);
  if (isDevQuoteId(quoteId)) {
    return getDevQuote(contractor.id, quoteId);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(quoteSelect)
    .eq("id", quoteId)
    .eq("contractor_id", contractor.id)
    .single();

  if (error) throw error;
  return data as unknown as Quote;
}
