import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContractorPublicProfile } from "@/types/quote";

export type ContractorFilters = {
  query?: string;
  region?: string;
  boothType?: string;
};

export type ContractorFilterOptions = {
  regions: string[];
  boothTypes: string[];
};

export async function listPublicContractors(filters: ContractorFilters = {}) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contractor_public_profiles")
    .select("id,company_name,description,service_regions,booth_types,minimum_budget,verification_status,subscription_status,created_at")
    .order("company_name", { ascending: true })
    .limit(120);

  if (error) throw error;

  const keyword = filters.query?.trim().toLowerCase();
  return ((data ?? []) as ContractorPublicProfile[]).filter((contractor) => {
    const matchesKeyword = keyword
      ? [
          contractor.company_name,
          contractor.description,
          contractor.service_regions.join(" "),
          contractor.booth_types.join(" ")
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      : true;
    const matchesRegion =
      !filters.region || filters.region === "all" || contractor.service_regions.includes(filters.region);
    const matchesBoothType =
      !filters.boothType || filters.boothType === "all" || contractor.booth_types.includes(filters.boothType);

    return matchesKeyword && matchesRegion && matchesBoothType;
  });
}

export async function getContractorFilterOptions(): Promise<ContractorFilterOptions> {
  const contractors = await listPublicContractors();
  return {
    regions: uniqueValues(contractors.flatMap((contractor) => contractor.service_regions)),
    boothTypes: uniqueValues(contractors.flatMap((contractor) => contractor.booth_types))
  };
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ko")
  );
}
