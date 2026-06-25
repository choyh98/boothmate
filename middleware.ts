import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import {
  getDashboardPath,
  getRequiredRoleFromPath,
  isUserRole
} from "@/lib/auth/routes";

const authPaths = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiredRole = getRequiredRoleFromPath(pathname);
  const isRootPath = pathname === "/";
  const isAuthPath = authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const devRole = request.cookies.get("boothmate_dev_role")?.value;
  const safeDevRole =
    process.env.NODE_ENV !== "production" && isUserRole(devRole) ? devRole : null;

  if (safeDevRole) {
    if (isAuthPath || isRootPath) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = getDashboardPath(safeDevRole);
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }

    if (requiredRole && requiredRole !== safeDevRole) {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/access-denied";
      deniedUrl.search = "";
      return NextResponse.redirect(deniedUrl);
    }

    return response;
  }

  if (!supabase) {
    if (requiredRole) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "supabase_config");
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    if (requiredRole) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = isUserRole(profile?.role) ? profile.role : null;

  if ((isAuthPath || isRootPath) && role) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = getDashboardPath(role);
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (requiredRole) {
    if (!role) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "profile");
      return NextResponse.redirect(loginUrl);
    }

    if (role !== requiredRole) {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/access-denied";
      deniedUrl.search = "";
      return NextResponse.redirect(deniedUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/signup/:path*", "/company/:path*", "/contractor/:path*", "/admin/:path*"]
};
