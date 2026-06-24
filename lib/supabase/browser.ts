"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnv } from "@/lib/config/env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = assertSupabaseEnv();

  return createBrowserClient(url, anonKey);
}
