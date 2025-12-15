import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
// IMPORT THE NEWLY CREATED SERVER CLIENT UTILITY
import { createClient } from "@/lib/supabase/server"; 
import type { Tenant, Payment } from "@/lib/types";
import { getPendingAmount } from "@/lib/payments";

// NOTE: We don't need the custom cookie reading helper anymore, 
// as the client initialization handles it.

export default async function TenantDashboardPage() {
  const cookieStore = cookies();
  // Using the resilient bracket access to get the ID from the local cookie store
  const tenantId = (cookieStore as any)["tenantId"]?.value; 

  if (!tenantId) {
    redirect("/login/tenant");
  }
  
  // CRITICAL FIX: Initialize Supabase client authenticated for this request
  const supabase = await createClient();

  try {
    const [{ data: tenant, error: tenantError }, { data: payments, error: paymentsError }] = await Promise.all([
      supabase
        .from("tenants")
        .select("*, room:rooms(room_number)")
        .eq("id", tenantId)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("paid_at", { ascending: false }),
    ]);

    // Check for fetch errors
    if (tenantError || paymentsError) {
        console.error("Supabase Fetch Error (Tenant Dashboard):", tenantError || paymentsError);
        // This is where RLS usually blocks the request. Redirect to prevent the loop.
        redirect("/login/tenant");
    }

    if (!tenant || !tenant.room) {
      console.error("Tenant data or Room data missing for ID:", tenantId);
      redirect("/login/tenant");
    }
    
    // --- Data Processing ---
    const { name, rent, maintenance, advance_paid, agreement_start, agreement_end } = tenant;
    const room_number = tenant.room.room_number;

    const paymentList = payments ?? [];
    const pending = getPendingAmount(
      rent,
      maintenance,
      paymentList
    );
    
    const monthlyTotal = rent + maintenance;

    // --- Render Dashboard ---
    return (
      <div className="min-h-screen space-y-6">
        <header className="mb-4">
          <p className="text-xs text-zinc-500">Welcome</p>
          <h1 className="2xl font-semibold text-zinc-900">
            {name}
          </h1>
          <p className="text-sm text-zinc-500">
            Room {room_number}
          </p>
          <Link 
              href="/"
              onClick={() => {
                  // Client-side logout
                  document.cookie = "tenantId=; path=/; max-age=0";
                  document.cookie = "role=; path=/; max-age=0";
              }}
              className="text-xs text-red-500 underline mt-1 block"
          >
              Logout
          </Link>
        </header>

        {/* --- Pending Amount & Pay Option --- */}
        <section className="rounded-xl bg-white p-5 shadow-lg border border-red-100">
          <p className="text-xs font-semibold uppercase text-red-500 mb-2">
            Current Pending Dues
          </p>
          <p className="text-4xl font-extrabold text-zinc-900">
            ₹{pending.toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Amount pending for the current month. Total due: ₹{monthlyTotal.toLocaleString("en-IN")}
          </p>

          {/* Payment Button: Links to Stripe Checkout API */}
          <form action="/api/payments/initiate" method="POST">
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="amount" value={pending} />
              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-green-600 py-3 text-sm font-bold text-white shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                disabled={pending <= 0}
              >
                {pending > 0 ? `Pay ₹${pending.toLocaleString("en-IN")} Now` : "Paid for this month! Thank you."}
              </button>
          </form>
        </section>

        {/* --- Tenant Details (Profile) --- */}
        <section className="space-y-4">
          {/* Monthly Charges */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">
              Monthly Charges
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-700">Rent:</span>
                <span className="font-medium">₹{rent.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">Maintenance:</span>
                <span className="font-medium">₹{maintenance.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between text-xs text-zinc-500">
              <span>Advance Paid (Deposit):</span>
              <span>₹{advance_paid.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Agreement Details */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">
              Agreement Details
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-700">Start Date:</span>
                <span className="font-medium">{agreement_start || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">End Date:</span>
                <span className="font-medium">{agreement_end || "N/A"}</span>
              </div>
            </div>
          </div>
          
          {/* Link to new documents page */}
          <div className="rounded-xl bg-white p-4 shadow-sm text-center">
              <Link 
                  href="/tenant/documents" 
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 underline"
              >
                  View Agreement and Documents →
              </Link>
          </div>
        </section>

        {/* --- Payment History --- */}
        <section className="space-y-3 pt-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Payment History
          </h2>
          {paymentList.length === 0 ? (
            <p className="text-sm text-zinc-500">No payments found.</p>
          ) : (
            <div className="space-y-2">
              {paymentList.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg bg-white p-3 shadow-sm flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-medium">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(p.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-zinc-100 text-zinc-600">
                    {p.method}
                  </span>
                </div>
              ))}
              {paymentList.length > 5 && (
                   <p className="text-center text-xs text-zinc-500 mt-2">
                      ... and {paymentList.length - 5} more transactions
                  </p>
              )}
            </div>
          )}
        </section>
      </div>
    );
  } catch (e) {
    console.error("Critical error during dashboard fetch/render:", e);
    // Redirect on failure to prevent the loop/blank page
    redirect("/login/tenant");
  }
}