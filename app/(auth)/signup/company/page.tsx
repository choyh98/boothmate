import { AuthShell } from "@/components/auth/auth-shell";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { getPublicEnvStatus } from "@/lib/config/env";
import { redirectSignedInUser } from "@/lib/auth/require-role";

export default async function CompanySignupPage() {
  const envStatus = getPublicEnvStatus();

  if (envStatus.hasUrl && envStatus.hasAnonKey) {
    await redirectSignedInUser();
  }

  return (
    <AuthShell>
      <AuthCard
        eyebrow="Company Signup"
        title="참여기업 회원가입"
        description="견적 요청을 만들 기업 정보를 입력해주세요. role 값은 company로 저장됩니다."
      >
        <SignupForm configReady={envStatus.hasUrl && envStatus.hasAnonKey} role="company" />
      </AuthCard>
    </AuthShell>
  );
}
