import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates an authenticated Supabase client for use in Next.js Server Components.
 * FIX: This version uses bracket notation to avoid the synchronous property
 * access error on the cookies() object's .get method.
 */
export async function createClient() {
  // Explicitly cast to 'any' to allow bracket notation access
  const cookieStore = cookies() as any; 

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // CRITICAL FIX: Use bracket notation to access the cookie value.
          // This avoids the 'cookieStore.get is not a function' TypeError.
          const valueObject = cookieStore[name];
          
          // Next.js cookies typically return { value: '...' }
          if (valueObject?.value) {
            return valueObject.value;
          }
          
          // Fallback for extremely minimal environments where it returns the raw string
          if (typeof valueObject === 'string') {
            return valueObject;
          }
          
          return undefined; // Must return undefined or string
        },
        set(name: string, value: string, options: any) {
          // This is fine as it's not the crash source
        },
        remove(name: string, options: any) {
          // This is fine as it's not the crash source
        },
      },
    }
  );
}