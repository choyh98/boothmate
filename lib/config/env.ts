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
