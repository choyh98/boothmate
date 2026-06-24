import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/config/env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function createSupabaseMiddlewareClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  if (!url || !anonKey) {
    return { supabase: null, response };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response = NextResponse.next({ request });
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  return { supabase, response };
}
