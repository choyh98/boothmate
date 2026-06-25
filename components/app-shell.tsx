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
  let logoHref = "/";
  let accountLabel = "로그인";
  let userLabel = "";
  let roleLabel = "";
  let role: UserRole | null = null;

  try {
    const context = await getCurrentUserContext();
    if (context) {
      dashboardPath = getDashboardPath(context.profile.role);
      logoHref = dashboardPath;
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
          ["전시일정", "/exhibitions"],
          ["견적요청", "/company/quote-requests/new"],
          ["전시업체 찾기", "/company/contractors"],
          ["이용방법", "/company/guide"]
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
    <div className="min-h-screen pt-[106px]">
      <header className="site-header fixed left-1/2 top-[18px] z-20 w-[min(1120px,calc(100%-36px))] -translate-x-1/2 rounded-[24px] border border-slate-900/10 bg-white/90 px-3 py-2 shadow-soft backdrop-blur-xl">
        <div className="site-header-inner flex min-h-[58px] flex-wrap items-center justify-between gap-4">
          <Link className="flex items-center" href={logoHref}>
            <Image src="/logo.svg" alt="부스메이트" width={136} height={42} priority />
          </Link>
          {navItems.length ? (
            <nav className="hidden flex-wrap items-center gap-3 lg:flex lg:gap-7">
              {navItems.map(([label, href]) => (
                <Link className="text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:text-booth-blue" href={href} key={href}>
                  {label}
                </Link>
              ))}
            </nav>
          ) : null}
          {navItems.length ? (
            <details className="relative lg:hidden">
              <summary className="list-none rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black text-booth-ink shadow-sm">
                메뉴
              </summary>
              <div className="absolute right-0 top-14 z-30 grid min-w-48 gap-1 rounded-2xl border border-booth-line bg-white p-2 shadow-soft">
                {navItems.map(([label, href]) => (
                  <Link className="rounded-xl px-4 py-3 text-sm font-black text-booth-ink hover:bg-blue-50 hover:text-booth-blue" href={href} key={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
          {role ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="max-w-[180px] truncate text-sm font-black text-booth-ink">{userLabel}</p>
                <p className="text-xs font-black uppercase text-booth-muted">{roleLabel}</p>
              </div>
              <Link
                className="header-login rounded-xl border border-booth-line bg-white px-4 py-3 text-sm font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
                href={dashboardPath}
                title={`${userLabel} · ${roleLabel}`}
              >
                내정보
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
