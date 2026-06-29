import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getExhibition } from "@/lib/exhibitions/queries";
import type { QuoteRequest, QuoteRequestStatus } from "@/types/quote-request";

export type DevQuoteRequestPayload = {
  company_id: string;
  exhibition_id: string;
  title: string;
  booth_count: number | null;
  booth_width: number | null;
  booth_depth: number | null;
  booth_area: number | null;
  open_sides: string;
  booth_types: string[];
  budget_min: number | null;
  budget_max: number | null;
  vat_included: boolean;
  required_items: Record<string, number>;
  design_styles: string[];
  requirements: string | null;
  deadline: string | null;
  status: QuoteRequestStatus;
};

const devCompanyOwnerId = "dev-company";
const storePath = path.join(process.cwd(), ".next", "dev-quote-requests.json");

export function isDevQuoteRequestOwner(ownerId: string) {
  return process.env.NODE_ENV !== "production" && ownerId === devCompanyOwnerId;
}

export function isDevQuoteRequestStoreEnabled() {
  return process.env.NODE_ENV !== "production";
}

export async function listDevQuoteRequests(companyId: string) {
  const requests = await readDevQuoteRequests();
  const ownRequests = requests
    .filter((request) => request.company_id === companyId)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  return Promise.all(ownRequests.map(withExhibition));
}

export async function listDevOpenQuoteRequests() {
  if (!isDevQuoteRequestStoreEnabled()) return [];

  const requests = await readDevQuoteRequests();
  const openRequests = requests
    .filter(isOpenQuoteRequest)
    .sort((a, b) => Date.parse(a.deadline ?? "9999-12-31") - Date.parse(b.deadline ?? "9999-12-31"));

  return Promise.all(openRequests.map(withExhibition));
}

export async function getDevQuoteRequest(companyId: string, id: string) {
  const requests = await readDevQuoteRequests();
  const request = requests.find((item) => item.id === id && item.company_id === companyId);
  if (!request) throw new Error("수정할 견적 요청을 찾을 수 없습니다.");
  return withExhibition(request);
}

export async function selectDevQuoteRequestQuote(companyId: string, quoteRequestId: string, quoteId: string) {
  const requests = await readDevQuoteRequests();
  const now = new Date().toISOString();
  const index = requests.findIndex((item) => item.id === quoteRequestId && item.company_id === companyId);

  if (index < 0) {
    throw new Error("견적 요청을 찾을 수 없습니다.");
  }

  requests[index] = {
    ...requests[index],
    selected_quote_id: quoteId,
    selected_at: now,
    status: "selected",
    updated_at: now
  };

  await writeDevQuoteRequests(requests);
  return withExhibition(requests[index]);
}

export async function getDevOpenQuoteRequest(id: string) {
  if (!isDevQuoteRequestStoreEnabled()) throw new Error("개발용 견적 요청 저장소를 사용할 수 없습니다.");

  const requests = await readDevQuoteRequests();
  const request = requests.find((item) => item.id === id && isOpenQuoteRequest(item));
  if (!request) throw new Error("공개 견적 요청을 찾을 수 없습니다.");
  return withExhibition(request);
}

export async function upsertDevQuoteRequest(input: {
  id?: string;
  payload: DevQuoteRequestPayload;
}) {
  const requests = await readDevQuoteRequests();
  const now = new Date().toISOString();

  if (input.id) {
    const index = requests.findIndex(
      (request) => request.id === input.id && request.company_id === input.payload.company_id
    );

    if (index < 0) {
      throw new Error("수정할 견적 요청을 찾을 수 없습니다.");
    }

    if (requests[index].status !== "draft") {
      throw new Error("이미 제출된 요청서는 수정할 수 없습니다.");
    }

    requests[index] = {
      ...requests[index],
      ...input.payload,
      updated_at: now
    };
    await writeDevQuoteRequests(requests);
    return { id: requests[index].id, status: requests[index].status };
  }

  const request: QuoteRequest = {
    ...input.payload,
    id: `dev-quote-request-${randomUUID()}`,
    selected_quote_id: null,
    selected_at: null,
    created_at: now,
    updated_at: now
  };

  requests.push(request);
  await writeDevQuoteRequests(requests);
  return { id: request.id, status: request.status };
}

function isOpenQuoteRequest(request: Pick<QuoteRequest, "status" | "deadline">) {
  return request.status === "open" && (!request.deadline || new Date(request.deadline).getTime() > Date.now());
}

async function readDevQuoteRequests(): Promise<QuoteRequest[]> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuoteRequest[]) : [];
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeDevQuoteRequests(requests: QuoteRequest[]) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(requests, null, 2), "utf8");
}

async function withExhibition(request: QuoteRequest): Promise<QuoteRequest> {
  if (!request.exhibition_id) return { ...request, exhibitions: null };

  try {
    const exhibition = await getExhibition(request.exhibition_id);
    return {
      ...request,
      exhibitions: {
        id: exhibition.id,
        title: exhibition.title,
        venue: exhibition.venue,
        venue_group: exhibition.venue_group,
        region: exhibition.region,
        start_date: exhibition.start_date,
        end_date: exhibition.end_date,
        industry: exhibition.industry,
        status: exhibition.status
      }
    };
  } catch {
    return { ...request, exhibitions: null };
  }
}
