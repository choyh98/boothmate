import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { getDashboardPath } from "@/lib/auth/routes";
import type { UserRole } from "@/types/auth";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  let dashboardPath = "/login";
  let accountLabel = "로그인";
  let userLabel = "";
  let roleLabel = "";
  let role: UserRole | null = null;

  try {
    const context = await getCurrentUserContext();
    if (context) {
      dashboardPath = getDashboardPath(context.profile.role);
      accountLabel = "대시보드";
      userLabel = context.profile.name ?? context.email ?? "사용자";
      roleLabel = context.profile.role;
      role = context.profile.role;
    }
  } catch {
    dashboardPath = "/login";
  }

  const navItems =
    role === "company"
      ? [
          ["대시보드", "/company/dashboard"],
          ["새 견적 요청", "/company/quote-requests/new"],
          ["내 견적 요청", "/company/quote-requests"]
        ]
      : role === "contractor"
        ? [
            ["대시보드", "/contractor/dashboard"],
            ["공개 요청", "/contractor/quote-requests"],
            ["제출한 견적", "/contractor/quotes"]
          ]
        : role === "admin"
          ? [
              ["대시보드", "/admin/dashboard"],
              ["전시회", "/admin/exhibitions"],
              ["전시업체", "/admin/contractors"],
              ["사용자", "/admin/users"],
              ["견적 요청", "/admin/quote-requests"],
              ["제출 견적", "/admin/quotes"]
            ]
          : [];

  return (
    <div className="min-h-screen">
      <header className="site-header sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="site-header-inner mx-auto flex min-h-[88px] max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link className="flex items-center" href="/">
            <Image src="/logo.svg" alt="부스메이트" width={136} height={42} priority />
          </Link>
          {navItems.length ? (
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map(([label, href]) => (
                <Link className="rounded-xl px-3 py-2 text-sm font-black text-booth-muted transition hover:bg-blue-50 hover:text-booth-blue" href={href} key={href}>
                  {label}
                </Link>
              ))}
            </nav>
          ) : null}
          {role ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-black text-booth-ink">{userLabel}</p>
                <p className="text-xs font-bold text-booth-muted">{roleLabel}</p>
              </div>
              <Link
                className="header-login rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
                href={dashboardPath}
              >
                {accountLabel}
              </Link>
              <LogoutButton />
            </div>
          ) : (
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
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
