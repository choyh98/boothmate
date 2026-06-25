import { getCompanyOrThrow } from "@/lib/quote-requests/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContractorPublicProfile, Quote } from "@/types/quote";

const companyQuoteRequestSelect = `
  id,company_id,exhibition_id,title,booth_count,booth_width,booth_depth,booth_area,open_sides,
  booth_types,budget_min,budget_max,vat_included,required_items,design_styles,requirements,
  deadline,status,selected_quote_id,selected_at,created_at,updated_at,
  exhibitions(id,title,venue,venue_group,start_date,end_date,industry)
`;

const companyQuoteSelect = `
  id,quote_request_id,contractor_id,booth_type,total_price,vat_included,design_cost,material_cost,
  construction_cost,transport_cost,installation_cost,dismantling_cost,electrical_cost,graphic_cost,
  furniture_cost,other_cost,included_items,excluded_items,proposal,first_design_date,revision_count,
  production_days,valid_until,status,submitted_at,viewed_at,selected_at,rejected_at,created_at,updated_at,
  quote_requests!inner(${companyQuoteRequestSelect})
`;

async function attachContractorProfiles(quotes: Quote[]) {
  const contractorIds = Array.from(new Set(quotes.map((quote) => quote.contractor_id)));
  if (contractorIds.length === 0) return quotes;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contractor_public_profiles")
    .select("id,company_name,description,service_regions,booth_types,minimum_budget,verification_status,subscription_status,created_at")
    .in("id", contractorIds);

  if (error) throw error;

  const profileMap = new Map(
    ((data ?? []) as ContractorPublicProfile[]).map((profile) => [profile.id, profile])
  );

  return quotes.map((quote) => ({
    ...quote,
    contractor_profile: profileMap.get(quote.contractor_id) ?? null
  }));
}

export async function listCompanyQuotesForRequest(ownerId: string, quoteRequestId: string) {
  const company = await getCompanyOrThrow(ownerId);
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(companyQuoteSelect)
    .eq("quote_request_id", quoteRequestId)
    .neq("status", "draft")
    .eq("quote_requests.company_id", company.id)
    .order("total_price", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return attachContractorProfiles((data ?? []) as unknown as Quote[]);
}

export async function getCompanyQuote(ownerId: string, quoteId: string) {
  const company = await getCompanyOrThrow(ownerId);
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(companyQuoteSelect)
    .eq("id", quoteId)
    .neq("status", "draft")
    .eq("quote_requests.company_id", company.id)
    .single();

  if (error) throw error;
  const [quote] = await attachContractorProfiles([data as unknown as Quote]);
  return quote;
}

export async function listCompanyQuotesForCompare(
  ownerId: string,
  quoteRequestId: string,
  quoteIds: string[]
) {
  const quotes = await listCompanyQuotesForRequest(ownerId, quoteRequestId);
  if (quoteIds.length === 0) return quotes.slice(0, 4);
  const requestedIds = Array.from(new Set(quoteIds.slice(0, 4)));
  const allowedIds = new Set(requestedIds);
  const filtered = quotes.filter((quote) => allowedIds.has(quote.id)).slice(0, 4);
  if (filtered.length !== requestedIds.length) {
    throw new Error("비교할 수 없는 견적이 포함되어 있습니다.");
  }
  return filtered;
}
