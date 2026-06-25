import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { QuoteForm } from "@/components/quotes/quote-form";
import { requireRole } from "@/lib/auth/require-role";
import { getCurrentContractor } from "@/lib/auth/get-current-user";
import { getMyQuoteForRequest, getOpenQuoteRequest } from "@/lib/quotes/queries";
import type { Quote } from "@/types/quote";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

export default async function ContractorQuoteWritePage({ params }: { params: { id: string } }) {
  const context = await requireRole("contractor");
  const contractor = await getCurrentContractor(context.userId);
  let request: QuoteRequest;
  let quote: Quote | null = null;

  if (!contractor) {
    notFound();
  }

  try {
    request = await getOpenQuoteRequest(params.id);
    quote = await getMyQuoteForRequest(context.userId, params.id);
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-5 text-sm font-black text-booth-muted">
          <Link className="text-booth-blue" href={`/contractor/quote-requests/${request.id}`}>
            요청 상세
          </Link>
          <span> / 견적 작성</span>
        </div>
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">Quote</p>
          <h1 className="mt-3 text-4xl font-black text-booth-ink">업체 견적 작성</h1>
          <p className="mt-3 text-base font-semibold text-booth-muted">
            임시저장한 내용은 같은 요청에 자동 복구됩니다.
          </p>
        </div>
        <QuoteForm contractor={contractor} initialQuote={quote} request={request} />
      </main>
    </AppShell>
  );
}
