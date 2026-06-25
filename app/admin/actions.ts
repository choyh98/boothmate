"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdminAction() {
  const context = await getCurrentUserContext();
  if (!context || context.profile.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return context;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value: string) {
  return value || null;
}

const exhibitionStatuses = ["active", "inactive", "cancelled"];
const verificationStatuses = ["pending", "approved", "rejected"];
const subscriptionStatuses = ["trial", "active", "inactive", "expired", "suspended", "cancelled"];

function isAllowed(value: string, allowed: string[]) {
  return allowed.includes(value);
}

export async function createExhibitionAction(formData: FormData) {
  await requireAdminAction();
  const supabase = createSupabaseServerClient();
  const title = readString(formData, "title");
  const venue = readString(formData, "venue");
  const startDate = readString(formData, "start_date");
  const status = readString(formData, "status") || "active";

  if (!title) redirect("/admin/exhibitions?error=title");
  if (!isAllowed(status, exhibitionStatuses)) redirect("/admin/exhibitions?error=status");

  let duplicateQuery = supabase
    .from("exhibitions")
    .select("id")
    .eq("title", title);

  duplicateQuery = venue ? duplicateQuery.eq("venue", venue) : duplicateQuery.is("venue", null);
  duplicateQuery = startDate ? duplicateQuery.eq("start_date", startDate) : duplicateQuery.is("start_date", null);

  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();

  if (duplicateError) redirect("/admin/exhibitions?error=save");
  if (duplicate) redirect("/admin/exhibitions?error=duplicate");

  const { error } = await supabase.from("exhibitions").insert({
    source_id: emptyToNull(readString(formData, "source_id")),
    title,
    venue: emptyToNull(venue),
    venue_group: emptyToNull(readString(formData, "venue_group")),
    region: emptyToNull(readString(formData, "region")),
    start_date: emptyToNull(startDate),
    end_date: emptyToNull(readString(formData, "end_date")),
    industry: emptyToNull(readString(formData, "industry")),
    organizer: emptyToNull(readString(formData, "organizer")),
    homepage_url: emptyToNull(readString(formData, "homepage_url")),
    source: emptyToNull(readString(formData, "source")),
    last_checked_at: emptyToNull(readString(formData, "last_checked_at")),
    status
  });

  if (error) redirect("/admin/exhibitions?error=save");
  revalidatePath("/admin/exhibitions");
  redirect("/admin/exhibitions?success=created");
}

export async function updateExhibitionAction(formData: FormData) {
  await requireAdminAction();
  const supabase = createSupabaseServerClient();
  const id = readString(formData, "id");
  const title = readString(formData, "title");
  const status = readString(formData, "status") || "active";
  if (!id || !title) redirect("/admin/exhibitions?error=title");
  if (!isAllowed(status, exhibitionStatuses)) redirect("/admin/exhibitions?error=status");

  const { error } = await supabase
    .from("exhibitions")
    .update({
      title,
      venue: emptyToNull(readString(formData, "venue")),
      venue_group: emptyToNull(readString(formData, "venue_group")),
      region: emptyToNull(readString(formData, "region")),
      start_date: emptyToNull(readString(formData, "start_date")),
      end_date: emptyToNull(readString(formData, "end_date")),
      industry: emptyToNull(readString(formData, "industry")),
      organizer: emptyToNull(readString(formData, "organizer")),
      homepage_url: emptyToNull(readString(formData, "homepage_url")),
      source: emptyToNull(readString(formData, "source")),
      last_checked_at: emptyToNull(readString(formData, "last_checked_at")),
      status
    })
    .eq("id", id);

  if (error) redirect("/admin/exhibitions?error=save");
  revalidatePath("/admin/exhibitions");
  redirect("/admin/exhibitions?success=updated");
}

export async function updateContractorStatusAction(formData: FormData) {
  await requireAdminAction();
  const supabase = createSupabaseServerClient();
  const id = readString(formData, "id");
  const verificationStatus = readString(formData, "verification_status");
  const subscriptionStatus = readString(formData, "subscription_status");
  if (!id) redirect("/admin/contractors?error=missing");
  if (!isAllowed(verificationStatus, verificationStatuses) || !isAllowed(subscriptionStatus, subscriptionStatuses)) {
    redirect(`/admin/contractors?contractorId=${id}&error=status`);
  }

  const { error } = await supabase
    .from("contractors")
    .update({
      verification_status: verificationStatus,
      subscription_status: subscriptionStatus
    })
    .eq("id", id);

  if (error) redirect("/admin/contractors?error=save");
  revalidatePath("/admin/contractors");
  redirect(`/admin/contractors?contractorId=${id}&success=updated`);
}
