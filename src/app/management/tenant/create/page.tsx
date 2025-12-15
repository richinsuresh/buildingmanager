"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; // FIX: Import the exported 'supabase' constant
import Link from "next/link";

// Using the newly defined types (assuming they were updated in src/lib/types.ts)
type Building = {
  id: string;
  name: string;
  code: string | null;
};

type Room = {
  id: string;
  room_number: string;
};

function generateTenantCredentials(buildingCode: string, roomNumber: string) {
  // Generates a simple, predictable username/password
  const username = `${roomNumber}@${buildingCode}`.toLowerCase();
  const password = `pass@${roomNumber}@${buildingCode}`.toLowerCase();

  return { username, password };
}

export default function CreateTenantPage() {
  const searchParams = useSearchParams();
  const preSelectedBuildingId = searchParams.get("buildingId");
  const preSelectedRoomId = searchParams.get("roomId");

  // FIX: Removed the non-existent function call: const supabase = getSupabaseBrowserClient(); 

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // State linked to form inputs, defaulting to URL params
  const [selectedBuildingId, setSelectedBuildingId] = useState(preSelectedBuildingId || "");
  const [selectedRoomId, setSelectedRoomId] = useState(preSelectedRoomId || "");

  const [name, setName] = useState("");
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
        .select("id, name, code")
        .order("name", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setBuildings((data || []) as Building[]);
      }

      setLoadingBuildings(false);
    };
    loadBuildings();
  }, []);

  // Memoized function to load rooms whenever building changes
  const loadRooms = useCallback(async (currentBuildingId: string) => {
    if (!currentBuildingId) {
        setRooms([]);
        setSelectedRoomId("");
        return;
    }
    setLoadingRooms(true);
    setError("");

    // 1. Get all occupied room IDs in this building
    const { data: occupiedTenants } = await supabase
        .from("tenants")
        .select("room_id")
        .eq("building_id", currentBuildingId);
        
    const occupiedRoomIds = occupiedTenants?.map(t => t.room_id) || [];

    // 2. Get all rooms in this building
    const { data: allRooms, error: roomsError } = await supabase
        .from("rooms")
        .select("id, room_number")
        .eq("building_id", currentBuildingId)
        .order("room_number", { ascending: true });

    if (roomsError) {
        setError(roomsError.message);
        setRooms([]);
    } else {
        // Filter the rooms that are not currently occupied
        const unoccupiedRooms = (allRooms || []).filter(room => !occupiedRoomIds.includes(room.id));
        setRooms(unoccupiedRooms as Room[]);

        // Check if the pre-selected room is available
        const isPreSelectedRoomAvailable = unoccupiedRooms.some(r => r.id === preSelectedRoomId);

        if (preSelectedRoomId && isPreSelectedRoomAvailable) {
            setSelectedRoomId(preSelectedRoomId);
        } else {
            // Reset room selection if the current one is unavailable or no pre-selection
            setSelectedRoomId("");
        }
    }
    setLoadingRooms(false);
}, [preSelectedRoomId]);


  // Effect to run room loading when the selectedBuildingId changes
  useEffect(() => {
    if (selectedBuildingId) {
      loadRooms(selectedBuildingId);
    }
  }, [selectedBuildingId, loadRooms]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      if (!selectedBuildingId || !selectedRoomId || !name.trim() || !monthlyRent || !monthlyMaintenance || !advancePaid) {
        throw new Error("Please fill in all required fields (Building, Room, Name, Financials).");
      }

      // Get building & room data needed for credentials and insertion
      const building = buildings.find((b) => b.id === selectedBuildingId);
      const room = rooms.find((r) => r.id === selectedRoomId);

      if (!building || !room || !building.code) {
        throw new Error("Invalid selection or missing building code.");
      }

      // Generate Credentials
      const { username, password } = generateTenantCredentials(
        building.code, 
        room.room_number
      );

      // Insert tenant
      const { error: insertError } = await supabase
        .from("tenants")
        .insert({
          name: name.trim(),
          phone: phone.trim() || null,
          building_id: selectedBuildingId,
          room_id: selectedRoomId, 
          agreement_start: agreementStart || null,
          agreement_end: agreementEnd || null,
          rent: Number(monthlyRent), 
          maintenance: Number(monthlyMaintenance),
          advance_paid: Number(advancePaid),
          username,
          password,
        })
        .select("id")
        .single();

      if (insertError) {
        // Handle constraint violation if the room was occupied just before this submission
        if (insertError.code === "23505" || insertError.message.includes("is already linked")) {
             throw new Error("This room was just occupied. Please refresh and select another room.");
        }
        throw insertError;
      }
      
      // Update the room's occupied status (Good practice)
      await supabase.from("rooms").update({ is_occupied: true }).eq("id", selectedRoomId);


      setGeneratedUsername(username);
      setGeneratedPassword(password);
      setSuccess("Tenant created successfully.");

      // Reset form fields
      setName("");
      setPhone("");
      setAgreementStart("");
      setAgreementEnd("");
      setMonthlyRent("");
      setMonthlyMaintenance("");
      setAdvancePaid("");
      // Refresh the available rooms list after a successful creation
      loadRooms(selectedBuildingId); 

    } catch (err: any) {
      setError(err.message || "Something went wrong. Check for console errors.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingBuildings) return <p>Loading buildings...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Create New Tenant</h1>
        <div className="flex gap-3">
          <Link href="/management/tenant" className="text-[11px] underline">
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
                // loadRooms will handle resetting selectedRoomId
              }}
            >
              <option value="">Select building</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
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
              disabled={!selectedBuildingId || loadingRooms || rooms.length === 0}
            >
              <option value="">
                {loadingRooms
                  ? "Loading rooms..."
                  : !selectedBuildingId
                  ? "Select building first"
                  : rooms.length === 0
                  ? "No unoccupied rooms available"
                  : "Select room"}
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number} (Unoccupied)
                </option>
              ))}
            </select>
            {selectedBuildingId && rooms.length === 0 && !loadingRooms && (
                 <p className="text-[10px] text-red-500 mt-1">
                    No available rooms. <Link href={`/management/buildings/${selectedBuildingId}/add-room`} className="underline">Add a new room?</Link>
                 </p>
            )}
          </div>

          {/* Tenant name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Tenant name *</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
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
                Monthly rent (₹) *
              </label>
              <input
                type="number"
                className="border rounded-lg px-3 py-2 text-sm"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                min={0}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">
                Monthly maintenance (₹) *
              </label>
              <input
                type="number"
                className="border rounded-lg px-3 py-2 text-sm"
                value={monthlyMaintenance}
                onChange={(e) => setMonthlyMaintenance(e.target.value)}
                min={0}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Advance paid (₹) *</label>
            <input
              type="number"
              className="border rounded-lg px-3 py-2 text-sm"
              value={advancePaid}
              onChange={(e) => setAdvancePaid(e.target.value)}
              min={0}
              required
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
            disabled={saving || !selectedRoomId}
            className="mt-2 rounded-lg px-4 py-2 text-sm font-medium bg-slate-900 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Tenant"}
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