import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates an authenticated Supabase client for use in Next.js Server Components.
 */
export async function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Required for the API but not actively used for fetching
        },
        remove(name: string, options: any) {
          // Not needed
        },
      },
    }
  );
}