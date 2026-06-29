import { AppShell } from "@/components/app-shell";
import { InlineNotice } from "@/components/ui/state";
import { QuoteRequestWizard } from "@/components/quote-requests/quote-request-wizard";
import { listExhibitions } from "@/lib/exhibitions/queries";
import { getMyQuoteRequest } from "@/lib/quote-requests/queries";
import { requireRole } from "@/lib/auth/require-role";
import type { Exhibition } from "@/types/exhibition";
import type { QuoteRequest } from "@/types/quote-request";

export const dynamic = "force-dynamic";

type NewQuoteRequestPageProps = {
  searchParams?: {
    exhibitionId?: string;
    draftId?: string;
  };
};

export default async function NewQuoteRequestPage({ searchParams }: NewQuoteRequestPageProps) {
  const context = await requireRole("company");
  let exhibitions: Exhibition[] = [];
  let initialRequest: QuoteRequest | null = null;
  let errorMessage = "";

  try {
    exhibitions = await listExhibitions({ sort: "dateAsc" });
    if (searchParams?.draftId) {
      initialRequest = await getMyQuoteRequest(context.userId, searchParams.draftId);
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "견적 요청 화면을 불러오지 못했습니다.";
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-8">
          <p className="text-sm font-black text-booth-blue">견적 요청 작성</p>
          <h1 className="mt-3 text-4xl font-black text-booth-ink">전시부스 견적 요청</h1>
          <p className="mt-3 text-base font-semibold text-booth-muted">
            작성 내용은 임시저장하면 Supabase에 draft 상태로 보관됩니다.
          </p>
        </div>

        {errorMessage ? (
          <InlineNotice
            title="견적 요청 화면을 준비하지 못했습니다."
            description={errorMessage}
            actionHref="/company/dashboard"
            actionLabel="대시보드로 이동"
          />
        ) : (
          <QuoteRequestWizard
            exhibitions={exhibitions}
            initialExhibitionId={searchParams?.exhibitionId}
            initialRequest={initialRequest}
          />
        )}
      </main>
    </AppShell>
  );
}
