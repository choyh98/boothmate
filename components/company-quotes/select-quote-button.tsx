"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectQuoteAction } from "@/app/company/quotes/actions";
import { formatCurrency } from "@/lib/format";

type SelectQuoteButtonProps = {
  quoteId: string;
  quoteRequestId: string;
  contractorName: string;
  totalPrice: number | null;
  disabled?: boolean;
  disabledReason?: string;
};

export function SelectQuoteButton({
  quoteId,
  quoteRequestId,
  contractorName,
  totalPrice,
  disabled,
  disabledReason
}: SelectQuoteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function selectQuote() {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await selectQuoteAction(quoteRequestId, quoteId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {disabled && disabledReason ? (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          {disabledReason}
        </p>
      ) : null}
      <button
        className="w-full rounded-xl bg-booth-blue px-5 py-4 text-sm font-black text-white disabled:opacity-60"
        disabled={disabled || isPending}
        onClick={() => setOpen(true)}
        type="button"
      >
        최종 업체 선택
      </button>
      {message ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-5">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-soft">
            <h2 className="text-xl font-black text-booth-ink">최종 업체 선택</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-booth-muted">
              {contractorName}의 {formatCurrency(totalPrice)} 견적을 최종 선택합니다. 선택 후 같은 요청의 다른 견적은 미선정 처리됩니다.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-booth-line px-5 py-3 text-sm font-black text-booth-ink"
                disabled={isPending}
                onClick={() => setOpen(false)}
                type="button"
              >
                취소
              </button>
              <button
                className="rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                disabled={isPending}
                onClick={selectQuote}
                type="button"
              >
                {isPending ? "선택 중..." : "선택 확정"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
