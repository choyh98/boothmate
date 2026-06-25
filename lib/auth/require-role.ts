import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { getDashboardPath } from "@/lib/auth/routes";
import type { UserRole } from "@/types/auth";

export async function requireRole(role: UserRole) {
  const context = await getCurrentUserContext();

  if (!context) {
    redirect(`/login?next=${encodeURIComponent(`/${role}/dashboard`)}`);
  }

  if (context.profile.role !== role) {
    redirect("/access-denied");
  }

  return context;
}

export async function redirectSignedInUser() {
  const context = await getCurrentUserContext();

  if (context) {
    redirect(getDashboardPath(context.profile.role));
  }
}
