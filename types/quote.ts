import type { QuoteRequest } from "@/types/quote-request";

export type QuoteStatus =
  | "draft"
  | "submitted"
  | "viewed"
  | "shortlisted"
  | "selected"
  | "rejected"
  | "withdrawn";

export type Quote = {
  id: string;
  quote_request_id: string;
  contractor_id: string;
  booth_type: string | null;
  total_price: number | null;
  vat_included: boolean;
  design_cost: number | null;
  material_cost: number | null;
  construction_cost: number | null;
  transport_cost: number | null;
  installation_cost: number | null;
  dismantling_cost: number | null;
  electrical_cost: number | null;
  graphic_cost: number | null;
  furniture_cost: number | null;
  other_cost: number | null;
  included_items: string | null;
  excluded_items: string | null;
  proposal: string | null;
  first_design_date: string | null;
  revision_count: number | null;
  production_days: number | null;
  valid_until: string | null;
  status: QuoteStatus;
  submitted_at: string | null;
  viewed_at?: string | null;
  selected_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
  quote_requests?: QuoteRequest | null;
  contractor_profile?: ContractorPublicProfile | null;
};

export type ContractorPublicProfile = {
  id: string;
  company_name: string;
  description: string | null;
  service_regions: string[];
  booth_types: string[];
  minimum_budget: number | null;
  verification_status: string;
  subscription_status: string;
  created_at: string;
};

export type QuoteFormData = {
  id?: string;
  quoteRequestId: string;
  boothType: string;
  totalPrice: string;
  vatIncluded: boolean;
  designCost: string;
  materialCost: string;
  constructionCost: string;
  transportCost: string;
  installationCost: string;
  dismantlingCost: string;
  electricalCost: string;
  graphicCost: string;
  furnitureCost: string;
  otherCost: string;
  includedItems: string;
  excludedItems: string;
  proposal: string;
  firstDesignDate: string;
  revisionCount: string;
  productionDays: string;
  validUntil: string;
};

export const submittedQuoteStatuses: QuoteStatus[] = [
  "submitted",
  "viewed",
  "shortlisted",
  "selected",
  "rejected",
  "withdrawn"
];
