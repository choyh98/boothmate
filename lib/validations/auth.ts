import type { SignupRole } from "@/types/auth";

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  role: SignupRole;
  email: string;
  password: string;
  name?: string;
  phone?: string;
  companyName?: string;
  businessNumber?: string;
  industry?: string;
  website?: string;
  description?: string;
};

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

export function validateLogin(input: LoginInput): string | null {
  if (!validateEmail(input.email)) return "이메일 형식이 올바르지 않습니다.";
  if (!input.password) return "비밀번호를 입력해주세요.";
  return null;
}

export function validateSignup(input: SignupInput): string | null {
  if (input.role !== "company" && input.role !== "contractor") {
    return "회원 유형이 올바르지 않습니다.";
  }
  if (!validateEmail(input.email)) return "이메일 형식이 올바르지 않습니다.";
  if (!validatePassword(input.password)) return "비밀번호는 8자 이상이어야 합니다.";
  return null;
}
