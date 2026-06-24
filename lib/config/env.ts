export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  };
}

export function getPublicEnvStatus() {
  const env = getSupabaseEnv();

  return {
    hasUrl: Boolean(env.url),
    hasAnonKey: Boolean(env.anonKey)
  };
}

export function assertSupabaseEnv() {
  const env = getSupabaseEnv();

  if (!env.url || !env.anonKey) {
    throw new Error(
      "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해주세요."
    );
  }

  return env;
}
