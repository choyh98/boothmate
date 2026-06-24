import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { assertSupabaseEnv } from "@/lib/config/env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function createSupabaseServerClient() {
  const { url, anonKey } = assertSupabaseEnv();

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Components cannot always write cookies. Middleware/auth routes will handle updates.
          }
        });
      }
    }
  });
}
