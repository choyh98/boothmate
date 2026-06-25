"use client";

import { useEffect, useId, useRef, useState } from "react";

type ConfirmDialogProps = {
  buttonLabel: string;
  title: string;
  description: string;
  confirmLabel?: string;
  disabled?: boolean;
  children: React.ReactNode;
};

export function ConfirmDialog({
  buttonLabel,
  title,
  description,
  confirmLabel = "확인",
  disabled,
  children
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;

      const dialog = cancelRef.current?.closest('[role="dialog"]');
      const focusable = Array.from(
        dialog?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []
      ).filter((element) => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        className="rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black text-booth-ink shadow-sm disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-5">
          <div
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-soft"
            role="dialog"
          >
            <h2 className="text-xl font-black text-booth-ink" id={titleId}>{title}</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-booth-muted" id={descriptionId}>{description}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelRef}
                className="rounded-xl border border-booth-line px-5 py-3 text-sm font-black text-booth-ink"
                onClick={() => setOpen(false)}
                type="button"
              >
                취소
              </button>
              <div onClick={() => setOpen(false)}>
                {children}
              </div>
            </div>
            <p className="sr-only">{confirmLabel}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
