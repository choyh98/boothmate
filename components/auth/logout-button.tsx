"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clearAuthSessionAction } from "@/app/(auth)/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleLogout() {
    setMessage("");
    startTransition(async () => {
      try {
        try {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
        } catch {
          // The server action below still clears server-side auth cookies and dev auth state.
        }

        const result = await clearAuthSessionAction();
        if (!result.ok) {
          setMessage(result.message || "로그아웃 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
          return;
        }

        router.replace("/");
        router.refresh();
      } catch {
        setMessage("로그아웃 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className="relative">
      <button
        aria-busy={isPending}
        className="rounded-xl border border-booth-line bg-white px-4 py-2 text-sm font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={isPending}
        onClick={handleLogout}
        type="button"
      >
        {isPending ? "로그아웃 중..." : "로그아웃"}
      </button>
      {message ? (
        <p className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700 shadow-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
