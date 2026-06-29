import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isUserRole } from "@/lib/auth/routes";
import type { Company, Contractor, Profile } from "@/types/auth";

export type CurrentUserContext = {
  userId: string;
  email: string | null;
  profile: Profile;
};

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const devRole = cookies().get("boothmate_dev_role")?.value;

  if (process.env.NODE_ENV !== "production" && isUserRole(devRole)) {
    return {
      userId: `dev-${devRole}`,
      email: `${devRole}@dev.local`,
      profile: {
        id: `dev-${devRole}`,
        email: `${devRole}@dev.local`,
        name:
          devRole === "company"
            ? "개발용 참여기업"
            : devRole === "contractor"
              ? "개발용 전시업체"
              : "개발용 관리자",
        phone: null,
        role: devRole
      }
    };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,name,phone,role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !isUserRole(profile.role)) {
    throw new Error("프로필 정보가 없거나 역할 정보가 올바르지 않습니다.");
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email ?? null,
    profile: profile as Profile
  };
}

export async function getCurrentCompany(ownerId: string): Promise<Company | null> {
  if (ownerId === "dev-company") {
    return {
      id: "dev-company-record",
      owner_id: ownerId,
      company_name: "부스메이트 테스트 기업",
      business_number: null,
      industry: "전시/마케팅",
      website: null,
      verification_status: "pending"
    };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id,owner_id,company_name,business_number,industry,website,verification_status")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as Company;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email,name,role")
    .eq("id", ownerId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.role !== "company") return null;

  const fallbackCompanyName = profile.name ?? profile.email ?? "참여기업";
  const { data: createdCompany, error: createError } = await supabase
    .from("companies")
    .insert({
      owner_id: ownerId,
      company_name: fallbackCompanyName
    })
    .select("id,owner_id,company_name,business_number,industry,website,verification_status")
    .single();

  if (createError) throw createError;
  return createdCompany as Company;
}

export async function getCurrentContractor(ownerId: string): Promise<Contractor | null> {
  if (ownerId === "dev-contractor") {
    return {
      id: "dev-contractor-record",
      owner_id: ownerId,
      company_name: "부스메이트 테스트 시공사",
      business_number: null,
      description: "로컬 개발 확인용 업체 계정입니다.",
      service_regions: ["수도권"],
      booth_types: ["목공부스", "시스템부스"],
      minimum_budget: 5000000,
      verification_status: "pending",
      subscription_status: "active",
      subscription_expires_at: null
    };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contractors")
    .select("id,owner_id,company_name,business_number,description,service_regions,booth_types,minimum_budget,verification_status,subscription_status,subscription_expires_at")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as Contractor;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email,name,role")
    .eq("id", ownerId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.role !== "contractor") return null;

  const fallbackCompanyName = profile.name ?? profile.email ?? "전시업체";
  const { data: createdContractor, error: createError } = await supabase
    .from("contractors")
    .insert({
      owner_id: ownerId,
      company_name: fallbackCompanyName
    })
    .select("id,owner_id,company_name,business_number,description,service_regions,booth_types,minimum_budget,verification_status,subscription_status,subscription_expires_at")
    .single();

  if (createError) throw createError;
  return createdContractor as Contractor;
}
