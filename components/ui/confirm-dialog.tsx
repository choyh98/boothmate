"use client";

import { useState } from "react";

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
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-soft">
            <h2 className="text-xl font-black text-booth-ink">{title}</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-booth-muted">{description}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
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
