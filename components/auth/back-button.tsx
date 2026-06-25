"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-xl border border-booth-line bg-white px-4 text-sm font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
      onClick={goBack}
      type="button"
    >
      ← 뒤로가기
    </button>
  );
}
