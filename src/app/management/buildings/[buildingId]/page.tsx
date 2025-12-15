import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Building, Tenant } from "@/lib/types";

type Props = {
  params: { buildingId: string };
};

export default async function BuildingDetailPage({ params }: Props) {
  const buildingId = params.buildingId;

  // Get building
  const { data: buildingRows } = await supabase
    .from<Building>("buildings")
    .select("*")
    .eq("id", buildingId);

  const building = buildingRows?.[0] ?? null;

  if (!building) {
    return (
      <div className="min-h-screen px-4 py-6">
        <p className="text-sm text-red-600">Building not found.</p>
        <Link
          href="/management/dashboard"
          className="mt-2 inline-block text-xs text-zinc-600 underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  // Get tenants for this building
  const { data: tenants } = await supabase
    .from<Tenant>("tenants")
    .select("*")
    .eq("building_id", buildingId)
    .order("room_number", { ascending: true });

  const tenantList = tenants ?? [];
  const tenantCount = tenantList.length;
  const totalMonthly =
    tenantList.reduce(
      (sum, t) => sum + (t.rent ?? 0) + (t.maintenance ?? 0),
      0
    ) ?? 0;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-1">
            <Link
              href="/management/dashboard"
              className="underline hover:text-zinc-700"
            >
              ← Back to dashboard
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {building.name}
          </h1>
          {building.address && (
            <p className="mt-1 text-sm text-zinc-600">{building.address}</p>
          )}
        </div>

        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-700">
          {building.code}
        </span>
      </header>

      {/* Stats for this building */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Tenants</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">
            {tenantCount}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Monthly rent + maint.</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            ₹{totalMonthly.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm flex items-center justify-center">
          <Link
            href={`/management/buildings/${buildingId}/add-tenant`}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
          >
            + Add Tenant
          </Link>
        </div>
      </section>

      {/* Tenants list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Tenants</p>
          {tenantCount > 0 && (
            <p className="text-xs text-zinc-500">
              {tenantCount} tenant{tenantCount !== 1 && "s"}
            </p>
          )}
        </div>

        {tenantList.length === 0 && (
          <p className="text-xs text-zinc-500">
            No tenants yet for this building. Click &ldquo;Add Tenant&rdquo; to
            create one.
          </p>
        )}

        <div className="space-y-3">
          {tenantList.map((t) => (
            <div
              key={t.id}
              className="rounded-xl bg-white p-4 shadow-sm flex items-start justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {t.name}
                </p>
                <p className="text-xs text-zinc-500">
                  Room {t.room_number}
                </p>
                <p className="text-xs text-zinc-500">
                  Rent: ₹{t.rent.toLocaleString()} • Maintenance: ₹
                  {t.maintenance.toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Advance: ₹{t.advance_paid.toLocaleString()}
                </p>
                {t.agreement_start && t.agreement_end && (
                  <p className="text-[11px] text-zinc-400">
                    {t.agreement_start} → {t.agreement_end}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 mb-1">Login</p>
                <p className="text-[11px] font-mono text-zinc-700">
                  {t.username}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  (auto-generated)
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
