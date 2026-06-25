import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Exhibition } from "@/types/exhibition";

export type ExhibitionFilters = {
  query?: string;
  venueGroup?: string;
  region?: string;
  industry?: string;
  sort?: "deadline" | "dateAsc" | "dateDesc" | "name";
};

export type ExhibitionFilterOptions = {
  venueGroups: string[];
  regions: string[];
  industries: string[];
};

const publicStatuses = ["active", "scheduled"];

export async function listExhibitions(filters: ExhibitionFilters = {}) {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("exhibitions")
    .select("id,source_id,title,venue,venue_group,region,start_date,end_date,industry,organizer,homepage_url,source,status")
    .in("status", publicStatuses);

  if (filters.query) {
    const keyword = filters.query.trim();
    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,venue.ilike.%${keyword}%,venue_group.ilike.%${keyword}%,region.ilike.%${keyword}%,industry.ilike.%${keyword}%`);
    }
  }

  if (filters.venueGroup && filters.venueGroup !== "all") {
    query = query.eq("venue_group", filters.venueGroup);
  }

  if (filters.region && filters.region !== "all") {
    query = query.eq("region", filters.region);
  }

  if (filters.industry && filters.industry !== "all") {
    query = query.eq("industry", filters.industry);
  }

  if (filters.sort === "dateDesc") {
    query = query.order("start_date", { ascending: false, nullsFirst: false });
  } else if (filters.sort === "name") {
    query = query.order("title", { ascending: true });
  } else if (filters.sort === "deadline") {
    query = query.order("end_date", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("start_date", { ascending: true, nullsFirst: false });
  }

  const { data, error } = await query.limit(120);
  if (error) throw error;
  return (data ?? []) as Exhibition[];
}

export async function getExhibitionFilterOptions(): Promise<ExhibitionFilterOptions> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exhibitions")
    .select("venue_group,region,industry,status")
    .in("status", publicStatuses)
    .order("venue_group", { ascending: true });

  if (error) throw error;

  const rows = data ?? [];
  return {
    venueGroups: uniqueValues(rows.map((row) => row.venue_group)),
    regions: uniqueValues(rows.map((row) => row.region)),
    industries: uniqueValues(rows.map((row) => row.industry))
  };
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

export async function getExhibition(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exhibitions")
    .select("id,source_id,title,venue,venue_group,region,start_date,end_date,installation_date,dismantling_date,industry,organizer,homepage_url,source,status,created_at,updated_at")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Exhibition;
}
