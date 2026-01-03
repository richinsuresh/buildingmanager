"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type QuickPaymentProps = {
  buildings: any[];
  tenants: any[]; 
};

export default function QuickPaymentModal({ buildings, tenants }: QuickPaymentProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [amount, setAmount] = useState("");
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split("T")[0]);
  // Default to current month (YYYY-MM format for input type="month")
  const [forMonth, setForMonth] = useState(new Date().toISOString().slice(0, 7));
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredTenants = tenants.filter(t => t.building_id === selectedBuildingId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!selectedTenantId || !amount) {
        throw new Error("Please select a tenant and enter an amount.");
      }

      // Append -01 to make it a valid date for the DB (YYYY-MM-01)
      const paymentMonthDate = forMonth ? `${forMonth}-01` : null;

      const { error: insertError } = await supabase.from("payments").insert({
        tenant_id: selectedTenantId,
        amount: Number(amount),
        method: method,
        paid_at: datePaid,
        payment_month: paymentMonthDate, // <--- Saving the month
        notes: notes || null,
      });

      if (insertError) throw insertError;

      setSuccess("Payment recorded successfully!");
      setAmount("");
      setNotes("");
      setMethod("cash");
      setSelectedTenantId("");
      // Reset to current month
      setForMonth(new Date().toISOString().slice(0, 7));
      
      router.refresh();

      setTimeout(() => {
        setSuccess("");
        setIsOpen(false);
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 transition-colors"
      >
        + Record Payment
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl ring-1 ring-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Record Payment</h2>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>

            {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
            {success && <p className="mb-4 rounded bg-green-50 p-2 text-sm text-green-600">{success}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Building Select */}
              <div>
                <label className="block text-xs font-medium text-zinc-500">Building</label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => {
                    setSelectedBuildingId(e.target.value);
                    setSelectedTenantId("");
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a Building</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              {/* Tenant Select */}
              <div>
                <label className="block text-xs font-medium text-zinc-500">Room / Tenant</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  disabled={!selectedBuildingId}
                  required
                >
                  <option value="">Select Tenant</option>
                  {filteredTenants.length === 0 && selectedBuildingId ? (
                    <option disabled>No tenants here</option>
                  ) : (
                    filteredTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.room?.room_number ? `Room ${t.room.room_number}` : "No Room"} - {t.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="0.00"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500">Paid On</label>
                  <input
                    type="date"
                    value={datePaid}
                    onChange={(e) => setDatePaid(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Month Selection (NEW) */}
              <div>
                  <label className="block text-xs font-medium text-zinc-500">Paying Rent For Month</label>
                  <input
                    type="month"
                    value={forMonth}
                    onChange={(e) => setForMonth(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    required
                  />
              </div>

              {/* Method & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-500">Notes</label>
                    <input 
                        type="text" 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedTenantId}
                className="mt-2 w-full rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Recording..." : "Confirm Payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}