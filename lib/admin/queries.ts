import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminMetrics = {
  company_count: number;
  contractor_count: number;
  verified_contractor_count: number;
  active_subscription_contractor_count: number;
  open_quote_request_count: number;
  submitted_quote_count: number;
  selected_quote_request_count: number;
};

export async function getAdminMetrics() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_admin_dashboard_metrics");
  if (error) throw error;
  return ((Array.isArray(data) ? data[0] : data) ?? {
    company_count: 0,
    contractor_count: 0,
    verified_contractor_count: 0,
    active_subscription_contractor_count: 0,
    open_quote_request_count: 0,
    submitted_quote_count: 0,
    selected_quote_request_count: 0
  }) as AdminMetrics;
}

export async function listAdminExhibitions(filters: { query?: string; status?: string }) {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("exhibitions")
    .select("id,source_id,title,venue,venue_group,region,start_date,end_date,industry,organizer,homepage_url,source,status,last_checked_at,created_at,updated_at")
    .order("start_date", { ascending: false, nullsFirst: false });

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.query) query = query.ilike("title", `%${filters.query}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAdminContractors(filters: { verification?: string; subscription?: string }) {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("contractors")
    .select("id,owner_id,company_name,business_number,description,service_regions,booth_types,minimum_budget,verification_status,subscription_status,subscription_expires_at,created_at,updated_at,profiles(id,email,name,phone,role)")
    .order("created_at", { ascending: false });

  if (filters.verification && filters.verification !== "all") query = query.eq("verification_status", filters.verification);
  if (filters.subscription && filters.subscription !== "all") query = query.eq("subscription_status", filters.subscription);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAdminContractor(id?: string) {
  if (!id) return null;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contractors")
    .select("id,owner_id,company_name,business_number,description,service_regions,booth_types,minimum_budget,verification_status,subscription_status,subscription_expires_at,created_at,updated_at,profiles(id,email,name,phone,role)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAdminUsers() {
  const supabase = createSupabaseServerClient();
  const [{ data: profiles, error: profilesError }, { data: companies, error: companiesError }, { data: contractors, error: contractorsError }] =
    await Promise.all([
      supabase.from("profiles").select("id,email,name,role,created_at").order("created_at", { ascending: false }),
      supabase.from("companies").select("id,owner_id,company_name"),
      supabase.from("contractors").select("id,owner_id,company_name")
    ]);

  if (profilesError) throw profilesError;
  if (companiesError) throw companiesError;
  if (contractorsError) throw contractorsError;

  const companyMap = new Map((companies ?? []).map((item) => [item.owner_id, item]));
  const contractorMap = new Map((contractors ?? []).map((item) => [item.owner_id, item]));

  return (profiles ?? []).map((profile) => ({
    ...profile,
    company: companyMap.get(profile.id) ?? null,
    contractor: contractorMap.get(profile.id) ?? null
  }));
}

export async function listAdminQuoteRequests() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_quote_request_overview")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAdminQuotes() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(`
      id,quote_request_id,contractor_id,total_price,status,submitted_at,viewed_at,selected_at,rejected_at,created_at,
      quote_requests(id,title,companies(company_name),exhibitions(title)),
      contractors(id,company_name)
    `)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
