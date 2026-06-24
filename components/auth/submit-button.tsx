"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  pendingText: string;
  children: React.ReactNode;
};

export function SubmitButton({ pendingText, children }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-6 w-full rounded-xl bg-booth-blue px-5 py-4 text-base font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingText : children}
    </button>
  );
}
