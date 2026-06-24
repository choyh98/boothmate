import type { UserRole } from "@/types/auth";

export const roleDashboardPath: Record<UserRole, string> = {
  company: "/company/dashboard",
  contractor: "/contractor/dashboard",
  admin: "/admin/dashboard"
};

export function getDashboardPath(role: UserRole) {
  return roleDashboardPath[role];
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "company" || value === "contractor" || value === "admin";
}

export function getRequiredRoleFromPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/company")) return "company";
  if (pathname.startsWith("/contractor")) return "contractor";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}
