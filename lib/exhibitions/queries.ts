import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Exhibition } from "@/types/exhibition";

export type ExhibitionFilters = {
  query?: string;
  venueGroup?: string;
  region?: string;
  industry?: string;
  status?: ExhibitionStatusFilter;
  startFrom?: string;
  startTo?: string;
  sort?: "deadline" | "dateAsc" | "dateDesc" | "name";
  page?: number;
  pageSize?: number;
};

export type ExhibitionFilterOptions = {
  venueGroups: string[];
  regions: string[];
  industries: string[];
};

export type ExhibitionUiStatus = "upcoming" | "ongoing" | "ended" | "cancelled";
export type ExhibitionStatusFilter = ExhibitionUiStatus | "all" | "current";

export type ExhibitionListResult = {
  items: Exhibition[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const publicDbStatuses = ["active"];
const cancelledDbStatus = "cancelled";
const defaultPageSize = 20;

export async function listExhibitionsPage(filters: ExhibitionFilters = {}): Promise<ExhibitionListResult> {
  const supabase = createSupabaseServerClient();
  const page = normalizePositiveInt(filters.page, 1);
  const pageSize = Math.min(normalizePositiveInt(filters.pageSize, defaultPageSize), 60);
  const today = getTodayIsoDate();
  const status = filters.status ?? "current";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("exhibitions")
    .select("id,source_id,title,venue,venue_group,region,start_date,end_date,industry,organizer,homepage_url,source,status", { count: "exact" });

  if (status === "cancelled") {
    query = query.eq("status", cancelledDbStatus);
  } else if (status === "ended") {
    query = query.in("status", publicDbStatuses).lt("end_date", today);
  } else {
    query = query.in("status", publicDbStatuses);

    if (status === "ongoing") {
      query = query.lte("start_date", today).or(`end_date.is.null,end_date.gte.${today}`);
    } else if (status === "upcoming") {
      query = query.or(`start_date.is.null,start_date.gt.${today}`);
    } else if (status === "current") {
      query = query.or(`end_date.is.null,end_date.gte.${today}`);
    }
  }

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

  if (filters.startFrom) {
    query = query.gte("start_date", filters.startFrom);
  }

  if (filters.startTo) {
    query = query.lte("start_date", filters.startTo);
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

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const total = count ?? 0;
  return {
    items: (data ?? []) as Exhibition[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function listExhibitions(filters: ExhibitionFilters = {}) {
  const result = await listExhibitionsPage({ ...filters, page: 1, pageSize: filters.pageSize ?? 120 });
  return result.items;
}

export async function getExhibitionFilterOptions(): Promise<ExhibitionFilterOptions> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exhibitions")
    .select("venue_group,region,industry,status")
    .in("status", [...publicDbStatuses, cancelledDbStatus])
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

export function getExhibitionDisplayStatus(exhibition: Pick<Exhibition, "status" | "start_date" | "end_date">): ExhibitionUiStatus {
  if (exhibition.status === cancelledDbStatus) return "cancelled";

  const today = parseDateOnly(getTodayIsoDate()) ?? startOfDay(new Date());
  const start = parseDateOnly(exhibition.start_date);
  const end = parseDateOnly(exhibition.end_date) ?? start;

  if (end && end < today) return "ended";
  if (start && start <= today && (!end || end >= today)) return "ongoing";
  return "upcoming";
}

export function getExhibitionDDay(exhibition: Pick<Exhibition, "status" | "start_date" | "end_date">) {
  const displayStatus = getExhibitionDisplayStatus(exhibition);
  if (displayStatus === "cancelled") return "취소";
  if (displayStatus === "ended") return "종료";
  if (displayStatus === "ongoing") return "진행 중";
  if (!exhibition.start_date) return "일정 미정";

  const start = parseDateOnly(exhibition.start_date);
  if (!start) return "일정 미정";
  const today = parseDateOnly(getTodayIsoDate()) ?? startOfDay(new Date());
  const diff = Math.ceil((start.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "D-DAY";
  return `D-${Math.max(diff, 0)}`;
}

export function canRequestQuoteForExhibition(exhibition: Pick<Exhibition, "status" | "start_date" | "end_date">) {
  const displayStatus = getExhibitionDisplayStatus(exhibition);
  return exhibition.status === "active" && displayStatus !== "ended" && displayStatus !== "cancelled";
}

export function normalizeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getTodayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function parseDateOnly(date: string | null | undefined) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizePositiveInt(value: number | undefined, fallback: number) {
  if (!value || Number.isNaN(value) || value < 1) return fallback;
  return Math.floor(value);
}
