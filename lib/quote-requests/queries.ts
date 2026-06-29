import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/auth/get-current-user";
import {
  isDevQuoteRequestOwner,
  getDevQuoteRequest,
  listDevQuoteRequests
} from "@/lib/quote-requests/dev-store";
import type { QuoteRequest } from "@/types/quote-request";

export async function getCompanyOrThrow(ownerId: string) {
  const company = await getCurrentCompany(ownerId);
  if (!company) {
    throw new Error("회사 정보를 찾을 수 없습니다. 참여기업 계정으로 다시 로그인해주세요.");
  }
  if (ownerId.startsWith("dev-") && !isDevQuoteRequestOwner(ownerId)) {
    throw new Error("개발용 빠른 입장 계정은 실제 저장을 할 수 없습니다. Supabase 계정으로 로그인해주세요.");
  }
  return company;
}

export async function listMyQuoteRequests(ownerId: string) {
  const company = await getCompanyOrThrow(ownerId);
  if (isDevQuoteRequestOwner(ownerId)) {
    return listDevQuoteRequests(company.id);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select(`
      id,company_id,exhibition_id,title,booth_count,booth_width,booth_depth,booth_area,open_sides,
      booth_types,budget_min,budget_max,vat_included,required_items,design_styles,requirements,
      deadline,status,selected_quote_id,selected_at,created_at,updated_at,
      exhibitions(id,title,venue,venue_group,start_date,end_date,industry)
    `)
    .eq("company_id", company.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as QuoteRequest[];
}

export async function getMyQuoteRequest(ownerId: string, id: string) {
  const company = await getCompanyOrThrow(ownerId);
  if (isDevQuoteRequestOwner(ownerId)) {
    return getDevQuoteRequest(company.id, id);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select(`
      id,company_id,exhibition_id,title,booth_count,booth_width,booth_depth,booth_area,open_sides,
      booth_types,budget_min,budget_max,vat_included,required_items,design_styles,requirements,
      deadline,status,selected_quote_id,selected_at,created_at,updated_at,
      exhibitions(id,title,venue,venue_group,start_date,end_date,industry)
    `)
    .eq("company_id", company.id)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as QuoteRequest;
}
