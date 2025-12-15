"use client";

import { useEffect, useState, FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import Link from "next/link";

type Building = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  room_number: string;
};

function generateTenantCredentials(buildingName: string, roomNumber: string) {
  const buildingPart = buildingName.replace(/\s+/g, "").toLowerCase(); // "Berry Spa" -> "berryspa"
  const roomPart = roomNumber.toLowerCase(); // "101"

  const username = `${buildingPart}_${roomPart}`; // e.g. "berryspa_101"
  const password = `${roomPart}@${buildingPart.slice(0, 3) || "123"}`; // e.g. "101@ber"

  return { username, password };
}

export default function CreateTenantPage() {
  const supabase = getSupabaseBrowserClient();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreementStart, setAgreementStart] = useState("");
  const [agreementEnd, setAgreementEnd] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [monthlyMaintenance, setMonthlyMaintenance] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  // Load buildings on mount
  useEffect(() => {
    const loadBuildings = async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setBuildings((data || []) as Building[]);
      }

      setLoadingBuildings(false);
    };

    loadBuildings();
  }, [supabase]);

  // Load rooms whenever building changes
  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedBuildingId) {
        setRooms([]);
        return;
      }
      setLoadingRooms(true);
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_number")
        .eq("building_id", selectedBuildingId)
        .order("room_number", { ascending: true });

      if (error) {
        setError(error.message);
        setRooms([]);
      } else {
        setRooms((data || []) as Room[]);
      }
      setLoadingRooms(false);
    };

    loadRooms();
  }, [selectedBuildingId, supabase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      if (!selectedBuildingId) {
        throw new Error("Please select a building.");
      }
      if (!selectedRoomId) {
        throw new Error("Please select a room.");
      }
      if (!fullName.trim()) {
        throw new Error("Please enter tenant name.");
      }

      // Get building + room to use in username generation
      const building = buildings.find((b) => b.id === selectedBuildingId);
      const room = rooms.find((r) => r.id === selectedRoomId);

      if (!building || !room) {
        throw new Error("Invalid building or room selection.");
      }

      const { username, password } = generateTenantCredentials(
        building.name,
        room.room_number
      );

      // Insert tenant
      const { data, error: insertError } = await supabase
        .from("tenants")
        .insert({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          building_id: selectedBuildingId,
          room_id: selectedRoomId,
          agreement_start: agreementStart || null,
          agreement_end: agreementEnd || null,
          monthly_rent: monthlyRent ? Number(monthlyRent) : null,
          monthly_maintenance: monthlyMaintenance
            ? Number(monthlyMaintenance)
            : null,
          advance_paid: advancePaid ? Number(advancePaid) : null,
          username,
          password,
        })
        .select("id")
        .single();

      if (insertError) {
        // In case username already exists, tweak generator later
        throw insertError;
      }

      setGeneratedUsername(username);
      setGeneratedPassword(password);
      setSuccess("Tenant created successfully.");

      // Optional: reset main form but keep building/room
      setFullName("");
      setPhone("");
      setAgreementStart("");
      setAgreementEnd("");
      setMonthlyRent("");
      setMonthlyMaintenance("");
      setAdvancePaid("");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingBuildings) return <p>Loading...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Create tenant</h1>
        <div className="flex gap-3">
          <Link href="/management/tenants" className="text-[11px] underline">
            All tenants
          </Link>
          <Link href="/management/dashboard" className="text-[11px] underline">
            Dashboard
          </Link>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-3 text-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Building */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Building *</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedRoomId("");
                setRooms([]);
              }}
            >
              <option value="">Select building</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Room *</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              disabled={!selectedBuildingId || loadingRooms}
            >
              <option value="">
                {loadingRooms
                  ? "Loading rooms..."
                  : !selectedBuildingId
                  ? "Select building first"
                  : "Select room"}
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number}
                </option>
              ))}
            </select>
          </div>

          {/* Tenant name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Tenant name *</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Phone</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>

          {/* Agreement dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">
                Agreement start date
              </label>
              <input
                type="date"
                className="border rounded-lg px-3 py-2 text-sm"
                value={agreementStart}
                onChange={(e) => setAgreementStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">
                Agreement end date
              </label>
              <input
                type="date"
                className="border rounded-lg px-3 py-2 text-sm"
                value={agreementEnd}
                onChange={(e) => setAgreementEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Money fields */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">
                Monthly rent (₹)
              </label>
              <input
                type="number"
                className="border rounded-lg px-3 py-2 text-sm"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                min={0}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">
                Monthly maintenance (₹)
              </label>
              <input
                type="number"
                className="border rounded-lg px-3 py-2 text-sm"
                value={monthlyMaintenance}
                onChange={(e) => setMonthlyMaintenance(e.target.value)}
                min={0}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Advance paid (₹)</label>
            <input
              type="number"
              className="border rounded-lg px-3 py-2 text-sm"
              value={advancePaid}
              onChange={(e) => setAdvancePaid(e.target.value)}
              min={0}
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-600 mt-1">{error}</p>
          )}
          {success && (
            <p className="text-[11px] text-green-600 mt-1">{success}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 rounded-lg px-4 py-2 text-sm font-medium bg-slate-900 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create tenant"}
          </button>
        </form>
      </section>

      {/* Generated credentials */}
      {generatedUsername && generatedPassword && (
        <section className="bg-white rounded-xl shadow-sm p-3 text-sm">
          <h2 className="font-semibold mb-2">Login details</h2>
          <p className="text-xs text-slate-500 mb-2">
            Share these with the tenant so they can log in.
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Username</span>
              <span className="font-mono text-xs">{generatedUsername}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Password</span>
              <span className="font-mono text-xs">{generatedPassword}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
