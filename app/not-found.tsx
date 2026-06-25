import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFoundPage() {
  return (
    <AppShell>
      <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-5 py-16 text-center md:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">404</p>
          <h1 className="mt-3 text-4xl font-black text-booth-ink">페이지를 찾을 수 없습니다.</h1>
          <p className="mt-3 text-base font-semibold text-booth-muted">
            주소가 바뀌었거나 접근할 수 없는 화면입니다.
          </p>
          <Link className="mt-6 inline-flex rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" href="/">
            홈으로 이동
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
