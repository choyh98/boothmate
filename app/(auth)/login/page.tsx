import { AuthShell } from "@/components/auth/auth-shell";
import { AuthCard } from "@/components/auth/auth-card";
import { DevLoginPanel } from "@/components/auth/dev-login-panel";
import { LoginForm } from "@/components/auth/login-form";
import { getPublicEnvStatus } from "@/lib/config/env";
import { redirectSignedInUser } from "@/lib/auth/require-role";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    next?: string;
  };
};

function pageMessage(error?: string) {
  if (error === "supabase_config") {
    return "Supabase 환경변수가 설정되어야 보호된 페이지를 사용할 수 있습니다.";
  }
  if (error === "profile") {
    return "프로필 정보가 없거나 역할 정보가 올바르지 않습니다. 다시 로그인하거나 관리자에게 문의해주세요.";
  }
  return undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const envStatus = getPublicEnvStatus();

  if (envStatus.hasUrl && envStatus.hasAnonKey) {
    await redirectSignedInUser();
  }

  return (
    <AuthShell>
      <AuthCard
        eyebrow="Login"
        title="부스메이트 로그인"
        description="이메일과 비밀번호로 로그인하면 역할에 맞는 대시보드로 이동합니다."
      >
        <LoginForm
          configReady={envStatus.hasUrl && envStatus.hasAnonKey}
          nextPath={searchParams?.next}
          pageMessage={pageMessage(searchParams?.error)}
        />
        <DevLoginPanel nextPath={searchParams?.next} />
      </AuthCard>
    </AuthShell>
  );
}
