"use client";

import { useEffect, useState } from "react";
// FIX: Import the exported 'supabase' constant instead of the non-existent function
import { supabase } from "@/lib/supabaseClient"; 
import Link from "next/link";

type TenantRow = {
  id: string;
  monthly_rent: number | null;
  monthly_maintenance: number | null;
  advance_paid: number | null;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
  building: {
    name: string | null;
  } | null;
  room: {
    room_number: string | null;
  } | null;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      // FIX: Use the directly imported 'supabase' constant
      // const supabase = getSupabaseBrowserClient(); 

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "management") {
        setError("You are not allowed to view this page.");
        setLoading(false);
        return;
      }

      // NOTE: relation names (profiles, buildings, rooms) rely on FK names in Supabase.
      // If you get an error, check the relation names in Supabase UI.
      const { data, error: tenantsError } = await supabase
        .from("tenants")
        .select(
          `
          id,
          monthly_rent,
          monthly_maintenance,
          advance_paid,
          profile:profiles(full_name, phone),
          building:buildings(name),
          room:rooms(room_number)
        `
        )
        .order("created_at", { ascending: false });

      if (tenantsError) {
        setError(tenantsError.message);
      } else {
        setTenants((data || []) as TenantRow[]);
      }

      setLoading(false);
    };

    load();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error && tenants.length === 0) {
    return <p className="text-sm text-red-600 mt-4">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tenants</h1>
        <Link href="/management/dashboard" className="text-[11px] underline">
          Back to dashboard
        </Link>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-3">
        <div className="flex flex-col gap-2">
          {tenants.length === 0 && (
            <p className="text-xs text-slate-500">
              No tenants found. Add tenants and link them to rooms.
            </p>
          )}

          {tenants.map((t) => (
            <Link
              href={`/management/tenant/${t.id}`}
              key={t.id}
              className="border rounded-lg px-3 py-2 text-sm flex flex-col gap-1"
            >
              <div className="flex justify-between">
                <span className="font-medium">
                  {t.profile?.full_name || "Unnamed tenant"}
                </span>
                <span className="text-xs text-slate-500">
                  Room {t.room?.room_number || "-"}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {t.building?.name || "No building"} • {t.profile?.phone || "-"}
              </span>
              <span className="text-[11px] text-slate-500">
                Rent ₹{t.monthly_rent ?? 0} • Maint ₹{t.monthly_maintenance ?? 0}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}