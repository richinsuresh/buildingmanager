"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { tenants } from "@/lib/payments";

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  const tenant = tenants.find((t) => t.id === tenantId);

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-4 dark:bg-black">
        <p className="text-sm text-red-500">Tenant not found.</p>
        <Link
          href="/management/dashboard"
          className="mt-2 inline-block text-xs text-zinc-500 underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-4 dark:bg-black">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {tenant.name}
        </h1>
        <p className="text-xs text-zinc-500">
          {tenant.buildingName} • Room {tenant.roomNumber}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          Username: {tenant.username} • Password: {tenant.password}
        </p>
      </header>

      <section className="space-y-4">
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-950">
          <p className="text-xs font-semibold text-zinc-500 mb-2">
            Rent details
          </p>
          <div className="space-y-2 text-sm">
            <p>Rent: ₹{tenant.rent.toLocaleString()}</p>
            <p>Maintenance: ₹{tenant.maintenance.toLocaleString()}</p>
            <p>Advance paid: ₹{tenant.advancePaid.toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-950">
          <p className="text-xs font-semibold text-zinc-500 mb-2">
            Agreement
          </p>
          <div className="space-y-1 text-sm">
            <p>Start: {tenant.agreementStart}</p>
            <p>End: {tenant.agreementEnd}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-950">
          <p className="text-xs font-semibold text-zinc-500 mb-2">
            Documents
          </p>
          {tenant.docs.length === 0 ? (
            <p className="text-xs text-zinc-500">No documents uploaded yet.</p>
          ) : (
            <ul className="list-disc pl-4 text-xs text-zinc-600">
              {tenant.docs.map((d, i) => (
                <li key={i}>
                  <a
                    href={d}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Document {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <button className="mt-3 w-full rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            Upload / manage docs
          </button>
        </div>

        <Link
          href={`/management/buildings/${tenant.buildingId}`}
          className="mt-4 block text-center text-xs text-zinc-500 underline"
        >
          ← Back to building
        </Link>
      </section>
    </div>
  );
}
