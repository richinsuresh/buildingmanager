// src/lib/supabaseClient.ts

import { createClient } from "@supabase/supabase-js";

// Ensure your environment variables are configured correctly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
  );
}

// Export the basic, unauthenticated client for Client Components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);