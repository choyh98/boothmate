import Image from "next/image";
import Link from "next/link";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { getDashboardPath } from "@/lib/auth/routes";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  let dashboardPath = "/login";
  let accountLabel = "로그인";

  try {
    const context = await getCurrentUserContext();
    if (context) {
      dashboardPath = getDashboardPath(context.profile.role);
      accountLabel = "대시보드";
    }
  } catch {
    dashboardPath = "/login";
  }

  return (
    <div className="min-h-screen">
      <header className="site-header sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="site-header-inner mx-auto flex h-[88px] max-w-6xl items-center justify-between px-5 md:px-8">
          <Link className="flex items-center" href="/">
            <Image src="/logo.svg" alt="부스메이트" width={136} height={42} priority />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              className="header-login rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
              href={dashboardPath}
            >
              {accountLabel}
            </Link>
            <Link
              className="header-signup rounded-xl bg-booth-blue px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700"
              href="/signup"
            >
              회원가입
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
