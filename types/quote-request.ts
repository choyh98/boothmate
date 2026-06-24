import type { Exhibition } from "@/types/exhibition";

export type QuoteRequestStatus =
  | "draft"
  | "open"
  | "reviewing"
  | "selected"
  | "closed"
  | "cancelled";

export type RequiredItems = Record<string, number>;

export type QuoteRequest = {
  id: string;
  company_id: string;
  exhibition_id: string | null;
  title: string;
  booth_count: number | null;
  booth_width: number | null;
  booth_depth: number | null;
  booth_area: number | null;
  open_sides: string | null;
  booth_types: string[];
  budget_min: number | null;
  budget_max: number | null;
  vat_included: boolean;
  required_items: RequiredItems;
  design_styles: string[];
  requirements: string | null;
  deadline: string | null;
  status: QuoteRequestStatus;
  selected_quote_id: string | null;
  created_at: string;
  updated_at: string;
  exhibitions?: Pick<Exhibition, "id" | "title" | "venue" | "venue_group" | "start_date" | "end_date" | "industry"> | null;
};

export type QuoteRequestFormData = {
  id?: string;
  exhibitionId: string;
  title: string;
  boothCount: string;
  boothWidth: string;
  boothDepth: string;
  boothArea: string;
  openSides: string;
  boothTypes: string[];
  budgetMin: string;
  budgetMax: string;
  vatIncluded: boolean;
  requiredItems: RequiredItems;
  designStyles: string[];
  requirements: string;
  deadlineHours: string;
};

export const quoteRequestStatuses: QuoteRequestStatus[] = [
  "draft",
  "open",
  "reviewing",
  "selected",
  "closed",
  "cancelled"
];
