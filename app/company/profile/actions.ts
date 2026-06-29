"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthFormState } from "@/types/auth";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value: string) {
  return value ? value : null;
}

export async function updateCompanyProfileAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const context = await getCurrentUserContext();
  if (!context || context.profile.role !== "company") {
    return { ok: false, message: "참여기업 계정으로 로그인해주세요." };
  }

  if (context.userId.startsWith("dev-")) {
    return { ok: false, message: "개발용 빠른 입장 계정은 프로필을 저장하지 않습니다. Supabase 계정으로 확인해주세요." };
  }

  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const companyName = readString(formData, "companyName");
  const businessNumber = readString(formData, "businessNumber");
  const industry = readString(formData, "industry");
  const website = readString(formData, "website");

  if (!companyName) {
    return { ok: false, message: "회사명을 입력해주세요." };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: emptyToNull(name),
        phone: emptyToNull(phone)
      })
      .eq("id", context.userId);

    if (profileError) throw profileError;

    const { error: companyError } = await supabase
      .from("companies")
      .upsert({
        owner_id: context.userId,
        company_name: companyName,
        business_number: emptyToNull(businessNumber),
        industry: emptyToNull(industry),
        website: emptyToNull(website)
      }, { onConflict: "owner_id" });

    if (companyError) throw companyError;

    revalidatePath("/company/profile");
    revalidatePath("/company/dashboard");
    revalidatePath("/company/quote-requests");

    return { ok: true, message: "프로필을 저장했습니다." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "프로필 저장 중 문제가 발생했습니다."
    };
  }
}
