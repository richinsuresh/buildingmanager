import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Building, Tenant } from "@/lib/types";

export default async function ManagementDashboardPage() {
  // Load buildings + tenants from Supabase
  const [{ data: buildings }, { data: tenants }] = await Promise.all([
    supabase
      .from("buildings") // FIXED: Removed <Building> generic
      .select("*")
      .order("name", { ascending: true }),
    supabase.from("tenants").select("*"), // FIXED: Removed <Tenant> generic
  ]);

  const buildingCount = buildings?.length ?? 0;
  const tenantCount = tenants?.length ?? 0;

  const totalMonthlyRent =
    tenants?.reduce(
      (sum, t: any) => sum + (t.rent ?? 0) + (t.maintenance ?? 0),
      0
    ) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Management</h1>
          <p className="text-sm text-zinc-500">
            Overview of all your buildings & tenants
          </p>
        </div>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
          Admin
        </span>
      </header>

      {/* Stats row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Buildings</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {buildingCount}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Tenants</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {tenantCount}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Monthly due*</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            ₹{totalMonthlyRent.toLocaleString()}
          </p>
        </div>
      </section>

      {/* Buildings list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Buildings</p>
          <Link
            href="/management/buildings/create"
            className="text-xs text-zinc-600 underline"
          >
            + Add building
          </Link>
        </div>

        {(buildings ?? []).map((b: any) => (
          <Link
            key={b.id}
            href={`/management/buildings/${b.id}`}
            className="block rounded-xl bg-white p-4 shadow-sm hover:bg-zinc-50"
          >
            <div className="flex items-center justify-between">
              <div className="max-w-[70%]">
                <p className="text-sm font-semibold text-zinc-900">
                  {b.name}
                </p>
                {b.address && (
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-1">
                    {b.address}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-700">
                {b.code}
              </span>
            </div>
          </Link>
        ))}

        {buildingCount === 0 && (
          <p className="mt-2 text-center text-xs text-zinc-500">
            No buildings yet. Tap &ldquo;+ Add building&rdquo; to create one.
          </p>
        )}
      </section>

      <p className="text-[10px] text-zinc-400">
        *Monthly due is total rent + maintenance for all tenants.
      </p>
    </div>
  );
}