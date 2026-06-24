import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Exhibition } from "@/types/exhibition";

export type ExhibitionFilters = {
  query?: string;
  venueGroup?: string;
  sort?: "deadline" | "dateAsc" | "dateDesc" | "name";
};

export async function listExhibitions(filters: ExhibitionFilters = {}) {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("exhibitions")
    .select("id,source_id,title,venue,venue_group,region,start_date,end_date,industry,organizer,homepage_url,source,status")
    .eq("status", "scheduled");

  if (filters.query) {
    const keyword = filters.query.trim();
    query = query.or(`title.ilike.%${keyword}%,venue.ilike.%${keyword}%,industry.ilike.%${keyword}%`);
  }

  if (filters.venueGroup && filters.venueGroup !== "all") {
    query = query.eq("venue_group", filters.venueGroup);
  }

  if (filters.sort === "dateDesc") {
    query = query.order("start_date", { ascending: false, nullsFirst: false });
  } else if (filters.sort === "name") {
    query = query.order("title", { ascending: true });
  } else {
    query = query.order("start_date", { ascending: true, nullsFirst: false });
  }

  const { data, error } = await query.limit(120);
  if (error) throw error;
  return (data ?? []) as Exhibition[];
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
