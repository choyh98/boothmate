"use server";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/config/env";
import { getDashboardPath, isUserRole } from "@/lib/auth/routes";
import { validateLogin, validateSignup } from "@/lib/validations/auth";
import type { AuthFormState, SignupRole, UserRole } from "@/types/auth";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function authErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function isDevAuthEnabled() {
  return process.env.NODE_ENV !== "production";
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const validationError = validateLogin({ email, password });

  if (validationError) {
    return { ok: false, message: validationError };
  }

  let redirectTo: string | null = null;

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { ok: false, message: "이메일 또는 비밀번호를 확인해주세요." };
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인 세션을 확인할 수 없습니다." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !isUserRole(profile?.role)) {
      return {
        ok: false,
        message: "프로필 또는 역할 정보가 없습니다. 관리자에게 문의해주세요."
      };
    }

    redirectTo = getDashboardPath(profile.role);
  } catch (error) {
    return {
      ok: false,
      message: authErrorMessage(error, "로그인 중 문제가 발생했습니다.")
    };
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return { ok: false, message: "로그인 처리 중 문제가 발생했습니다." };
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const role = readString(formData, "role") as SignupRole;
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const companyName = readString(formData, "companyName");
  const businessNumber = readString(formData, "businessNumber");
  const industry = readString(formData, "industry");
  const website = readString(formData, "website");
  const description = readString(formData, "description");
  const validationError = validateSignup({
    role,
    email,
    password,
    name,
    phone,
    companyName,
    businessNumber,
    industry,
    website,
    description
  });

  if (validationError) {
    return { ok: false, message: validationError };
  }

  let redirectTo: string | null = null;

  try {
    const supabase = createSupabaseServerClient();
    const origin = headers().get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: origin ? `${origin}/login` : undefined,
        data: {
          role,
          name,
          phone,
          company_name: companyName,
          business_number: businessNumber,
          industry,
          website,
          description
        }
      }
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    if (data.session) redirectTo = getDashboardPath(role);

    if (!redirectTo) {
      return {
        ok: true,
        message:
          "회원가입 요청이 접수되었습니다. Supabase 이메일 인증 설정이 켜져 있다면 메일함에서 인증을 완료한 뒤 로그인해주세요."
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: authErrorMessage(error, "회원가입 중 문제가 발생했습니다.")
    };
  }

  redirect(redirectTo);
}

export async function logoutAction() {
  cookies().delete("boothmate_dev_role");

  const { url, anonKey } = getSupabaseEnv();
  if (url && anonKey) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

export async function devLoginAction(formData: FormData) {
  if (!isDevAuthEnabled()) {
    redirect("/login");
  }

  const role = readString(formData, "role") as UserRole;
  if (!isUserRole(role)) {
    redirect("/login");
  }

  cookies().set("boothmate_dev_role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  redirect(getDashboardPath(role));
}
