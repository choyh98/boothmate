import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getDevOpenQuoteRequest,
  getDevQuoteRequest,
  isDevQuoteRequestStoreEnabled,
  selectDevQuoteRequestQuote
} from "@/lib/quote-requests/dev-store";
import { getCurrentContractor } from "@/lib/auth/get-current-user";
import type { ContractorPublicProfile } from "@/types/quote";
import type { Quote, QuoteStatus } from "@/types/quote";

export type DevQuotePayload = Omit<
  Quote,
  "id" | "created_at" | "updated_at" | "quote_requests" | "contractor_profile"
>;

const storePath = path.join(process.cwd(), ".next", "dev-quotes.json");

export function isDevQuoteStoreOwner(ownerId: string) {
  return isDevQuoteRequestStoreEnabled() && ownerId.startsWith("dev-");
}

export function isDevQuoteRequestId(quoteRequestId: string) {
  return isDevQuoteRequestStoreEnabled() && quoteRequestId.startsWith("dev-quote-request-");
}

export function isDevQuoteId(quoteId: string) {
  return isDevQuoteRequestStoreEnabled() && quoteId.startsWith("dev-quote-");
}

export async function getDevQuoteForRequest(contractorId: string, quoteRequestId: string) {
  const quotes = await readDevQuotes();
  const quote = quotes.find((item) => item.contractor_id === contractorId && item.quote_request_id === quoteRequestId);
  return quote ? withQuoteRequest(quote) : null;
}

export async function listDevSubmittedQuotes(contractorId: string) {
  const quotes = await readDevQuotes();
  const submittedQuotes = quotes
    .filter((quote) => quote.contractor_id === contractorId && quote.status !== "draft")
    .sort((a, b) => Date.parse(b.submitted_at ?? b.updated_at) - Date.parse(a.submitted_at ?? a.updated_at));

  return Promise.all(submittedQuotes.map(withQuoteRequest));
}

export async function listDevQuotes(contractorId: string) {
  const quotes = await readDevQuotes();
  const ownQuotes = quotes
    .filter((quote) => quote.contractor_id === contractorId)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  return Promise.all(ownQuotes.map(withQuoteRequest));
}

export async function getDevQuote(contractorId: string, quoteId: string) {
  const quotes = await readDevQuotes();
  const quote = quotes.find((item) => item.id === quoteId && item.contractor_id === contractorId);
  if (!quote) throw new Error("저장된 견적을 찾을 수 없습니다.");
  return withQuoteRequest(quote);
}

export async function listDevCompanyQuotesForRequest(companyId: string, quoteRequestId: string) {
  const request = await getDevQuoteRequest(companyId, quoteRequestId);
  const quotes = await readDevQuotes();
  const submittedQuotes = quotes
    .filter((quote) => quote.quote_request_id === quoteRequestId && quote.status !== "draft")
    .sort((a, b) => (a.total_price ?? Number.MAX_SAFE_INTEGER) - (b.total_price ?? Number.MAX_SAFE_INTEGER));

  return Promise.all(submittedQuotes.map((quote) => withContractorProfile({ ...quote, quote_requests: request })));
}

export async function getDevCompanyQuote(companyId: string, quoteId: string) {
  const quotes = await readDevQuotes();
  const quote = quotes.find((item) => item.id === quoteId && item.status !== "draft");
  if (!quote) throw new Error("견적을 찾을 수 없습니다.");

  const request = await getDevQuoteRequest(companyId, quote.quote_request_id);
  return withContractorProfile({ ...quote, quote_requests: request });
}

export async function markDevCompanyQuoteViewed(companyId: string, quoteId: string) {
  const quotes = await readDevQuotes();
  const now = new Date().toISOString();
  const index = quotes.findIndex((quote) => quote.id === quoteId && quote.status !== "draft");

  if (index < 0) throw new Error("견적을 찾을 수 없습니다.");
  await getDevQuoteRequest(companyId, quotes[index].quote_request_id);

  quotes[index] = {
    ...quotes[index],
    status: quotes[index].status === "submitted" ? "viewed" : quotes[index].status,
    viewed_at: quotes[index].viewed_at ?? now,
    updated_at: now
  };

  await writeDevQuotes(quotes);
  return withContractorProfile({ ...quotes[index], quote_requests: await getDevQuoteRequest(companyId, quotes[index].quote_request_id) });
}

export async function selectDevCompanyQuote(companyId: string, quoteRequestId: string, quoteId: string) {
  const quotes = await readDevQuotes();
  const now = new Date().toISOString();
  const selectedIndex = quotes.findIndex(
    (quote) => quote.id === quoteId && quote.quote_request_id === quoteRequestId && quote.status !== "draft"
  );

  if (selectedIndex < 0) throw new Error("선택할 견적을 찾을 수 없습니다.");
  await getDevQuoteRequest(companyId, quoteRequestId);

  for (const quote of quotes) {
    if (quote.quote_request_id !== quoteRequestId || quote.status === "draft") continue;

    if (quote.id === quoteId) {
      quote.status = "selected";
      quote.selected_at = now;
      quote.rejected_at = null;
    } else {
      quote.status = "rejected";
      quote.rejected_at = now;
      quote.selected_at = null;
    }

    quote.updated_at = now;
  }

  await writeDevQuotes(quotes);
  await selectDevQuoteRequestQuote(companyId, quoteRequestId, quoteId);
  return { quoteId, quoteRequestId };
}

export async function upsertDevQuote(input: {
  payload: DevQuotePayload;
}) {
  const quotes = await readDevQuotes();
  const now = new Date().toISOString();
  const existingIndex = quotes.findIndex(
    (quote) => quote.quote_request_id === input.payload.quote_request_id && quote.contractor_id === input.payload.contractor_id
  );

  if (existingIndex >= 0) {
    if (quotes[existingIndex].status !== "draft") {
      throw new Error("이미 최종 제출한 견적은 다시 저장할 수 없습니다.");
    }

    quotes[existingIndex] = {
      ...quotes[existingIndex],
      ...input.payload,
      updated_at: now
    };
    await writeDevQuotes(quotes);
    return { id: quotes[existingIndex].id, status: quotes[existingIndex].status as QuoteStatus };
  }

  const quote: Quote = {
    ...input.payload,
    id: `dev-quote-${randomUUID()}`,
    viewed_at: null,
    selected_at: null,
    rejected_at: null,
    created_at: now,
    updated_at: now
  };

  quotes.push(quote);
  await writeDevQuotes(quotes);
  return { id: quote.id, status: quote.status };
}

async function readDevQuotes(): Promise<Quote[]> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Quote[]) : [];
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeDevQuotes(quotes: Quote[]) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(quotes, null, 2), "utf8");
}

async function withQuoteRequest(quote: Quote): Promise<Quote> {
  try {
    return {
      ...quote,
      quote_requests: await getDevOpenQuoteRequest(quote.quote_request_id)
    };
  } catch {
    return { ...quote, quote_requests: null };
  }
}

async function withContractorProfile(quote: Quote): Promise<Quote> {
  return {
    ...quote,
    contractor_profile: await getDevContractorProfile(quote.contractor_id)
  };
}

async function getDevContractorProfile(contractorId: string): Promise<ContractorPublicProfile | null> {
  if (contractorId === "dev-contractor-record") {
    const contractor = await getCurrentContractor("dev-contractor");
    if (!contractor) return null;

    return {
      id: contractor.id,
      company_name: contractor.company_name,
      description: contractor.description,
      service_regions: contractor.service_regions,
      booth_types: contractor.booth_types,
      minimum_budget: contractor.minimum_budget,
      verification_status: contractor.verification_status,
      subscription_status: contractor.subscription_status,
      created_at: new Date(0).toISOString()
    };
  }

  return null;
}
