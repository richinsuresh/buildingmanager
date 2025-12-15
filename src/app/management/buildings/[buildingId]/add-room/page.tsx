"use client";

import { FormEvent, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AddRoomPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [roomNumber, setRoomNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: insertError } = await supabase.from("rooms").insert([
      {
        building_id: buildingId,
        room_number: roomNumber.trim(),
        is_occupied: false,
      },
    ]);

    if (insertError) {
      console.error(insertError);
      // Handle unique constraint error if room number already exists in this building
      if (insertError.code === "23505") { 
          setError(`Room number '${roomNumber}' already exists in this building.`);
      } else {
          setError("Could not create room. Please try again.");
      }
      setLoading(false);
      return;
    }

    // Success – go back to the building detail page
    router.replace(`/management/buildings/${buildingId}`);
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link
          href={`/management/buildings/${buildingId}`}
          className="text-xs text-zinc-600"
        >
          ← Back to Building
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">
          Add New Room/Unit
        </h1>
        <div className="w-10" />
      </header>

      {/* Room Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Room Number (e.g., A-101, 2B)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Room Number"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !roomNumber.trim()}
          className="w-full rounded bg-zinc-900 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Create Room"}
        </button>
      </form>
    </div>
  );
}