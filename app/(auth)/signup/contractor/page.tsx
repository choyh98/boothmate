import { AuthShell } from "@/components/auth/auth-shell";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { getPublicEnvStatus } from "@/lib/config/env";
import { redirectSignedInUser } from "@/lib/auth/require-role";

export default async function ContractorSignupPage() {
  const envStatus = getPublicEnvStatus();

  if (envStatus.hasUrl && envStatus.hasAnonKey) {
    await redirectSignedInUser();
  }

  return (
    <AuthShell>
      <AuthCard
        eyebrow="Contractor Signup"
        title="전시업체 회원가입"
        description="부스 제작/시공 업체 정보를 입력해주세요. role 값은 contractor로 저장됩니다."
      >
        <SignupForm configReady={envStatus.hasUrl && envStatus.hasAnonKey} role="contractor" />
      </AuthCard>
    </AuthShell>
  );
}
