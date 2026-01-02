import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Declare the client variable outside the conditional blocks
let client: SupabaseClient | any;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ENVIRONMENT ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  
  // Define a minimal stub client to prevent runtime crashes when env vars are missing
  client = {
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          maybeSingle: async () => ({ 
            data: null, 
            error: { message: "Environment Not Set" } 
          }) 
        }) 
      }),
      url: "ENV_ERROR_NOT_SET"
    }),
    url: "ENV_ERROR_NOT_SET"
  } as any;

} else {
  // Define the real client with all necessary options
  client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
          fetch: globalThis.fetch,
          headers: {
              'apikey': supabaseAnonKey, // Explicitly set the API key in the headers
          }
      }
  });
  
  console.log("Supabase Client Initialized. URL:", supabaseUrl);
}

// Single, top-level export (FIXES BUILD ERROR)
export const supabase = client;