"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Tenant, TenantDocument, Payment } from "@/lib/types";

// --- Types ---
type FullTenantData = Tenant & {
  documents: TenantDocument[];
  room_number: string;
};

type TenantFormState = Omit<
  Tenant,
  "id" | "building_id" | "created_at" | "username" | "password" | "room_number" | "phone"
> & {
  rent: string;
  maintenance: string;
  advance_paid: string;
  room_number: string;
  phone: string; // Add phone to state
};

// --- Record Payment Form Component (No change) ---
function RecordPaymentForm({ tenantId, onSuccess }: { tenantId: string, onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [notes, setNotes] = useState("");
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      setError("Amount must be greater than zero.");
      setSaving(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from("payments").insert({
        tenant_id: tenantId,
        amount: paymentAmount,
        method: method,
        notes: notes || null,
        paid_at: datePaid,
      });

      if (insertError) {
        throw insertError;
      }

      setAmount("");
      setNotes("");
      setMethod("cash");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-zinc-700">Record Manual Payment</h2>
      <form onSubmit={handleRecordPayment} className="space-y-3">
        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Amount Paid (₹) *
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            min="1"
            required
          />
        </div>
        
        {/* Payment Method */}
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Payment Method *
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            required
          >
            <option value="cash">Cash</option>
            <option value="bank-transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Date Paid */}
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Date Paid
          </label>
          <input
            type="date"
            value={datePaid}
            onChange={(e) => setDatePaid(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Notes (e.g. for which month)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            rows={2}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        
        <button
          type="submit"
          disabled={saving || !amount}
          className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-400 disabled:opacity-50 transition-colors"
        >
          {saving ? "Recording..." : "Record Payment"}
        </button>
      </form>
    </div>
  );
}


// --- Main Tenant Detail Page Component ---
export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;

  const [tenantData, setTenantData] = useState<FullTenantData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [formData, setFormData] = useState<TenantFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  // Function to load data from Supabase
  const loadTenantData = useCallback(async () => {
    setLoading(true);
    setError("");
    
    // NOTE: Query structure depends on your Supabase RLS and table relationships
    const [
      { data: tenant, error: tenantError },
      { data: paymentsData, error: paymentsError }
    ] = await Promise.all([
      supabase
        .from("tenants")
        // Fetch room_number via join and documents via join
        .select(`*, documents:tenant_documents(*), room:rooms(room_number)`)
        .eq("id", tenantId)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("paid_at", { ascending: false }),
    ]);

    if (tenantError || paymentsError) {
      console.error("Fetch Error:", tenantError || paymentsError);
      setError("Could not load tenant data or payments.");
      setLoading(false);
      return;
    }

    if (!tenant) {
      setError("Tenant not found.");
      setLoading(false);
      return;
    }
    
    const initialData: FullTenantData = {
      ...tenant,
      room_number: tenant.room?.room_number || "N/A",
      documents: tenant.documents || [],
    } as unknown as FullTenantData;
    
    setTenantData(initialData);
    setPayments(paymentsData || []);

    // Initialize form state
    setFormData({
      name: initialData.name,
      phone: initialData.phone || "",
      rent: String(initialData.rent || 0),
      maintenance: String(initialData.maintenance || 0),
      advance_paid: String(initialData.advance_paid || 0),
      agreement_start: initialData.agreement_start || "",
      agreement_end: initialData.agreement_end || "",
      room_number: initialData.room_number,
    });

    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      loadTenantData();
    }
  }, [tenantId, loadTenantData]);


  // Handle input changes (from the editable form)
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  // Handle form submission (Update Tenant Details)
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("tenants")
        .update({
          name: formData.name,
          phone: formData.phone || null,
          rent: Number(formData.rent) || 0,
          maintenance: Number(formData.maintenance) || 0,
          advance_paid: Number(formData.advance_paid) || 0,
          agreement_start: formData.agreement_start || null,
          agreement_end: formData.agreement_end || null,
        })
        .eq("id", tenantId);

      if (updateError) {
        throw updateError;
      }

      setSuccess("Tenant details updated successfully!");
      loadTenantData(); 

    } catch (err: any) {
      setError(
        err.message || "Failed to update details. Check console for errors."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-zinc-500">Loading tenant details...</p>
      </div>
    );
  }

  if (error && !tenantData) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-500">{error}</p>
        <Link
          href="/management/dashboard"
          className="inline-block text-xs text-zinc-500 underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/management/buildings/${tenantData?.building_id}`}
          className="text-xs text-zinc-600"
        >
          ← Back to Building
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">
          Edit {tenantData?.name}
        </h1>
        <div className="w-10" />
      </header>

      {/* Status Messages */}
      {error && (
        <p className="text-sm text-red-600 rounded p-2 bg-red-50">
          Error: {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 rounded p-2 bg-green-50">
          {success}
        </p>
      )}
      
      {/* Read-only Credentials & Room Info */}
      <section className="rounded-xl bg-white p-4 shadow-sm border border-zinc-200 space-y-2">
        <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">
          Tenant Login & Room
        </p>
        <p className="text-sm">
          <span className="font-medium">Room No:</span> {tenantData?.room_number}
        </p>
        <p className="text-sm">
          <span className="font-medium">Username:</span>{" "}
          <span className="font-mono bg-zinc-100 p-1 rounded text-xs">{tenantData?.username}</span>
        </p>
        <p className="text-sm">
          <span className="font-medium">Password:</span>{" "}
          <span className="font-mono bg-zinc-100 p-1 rounded text-xs">{tenantData?.password}</span>
        </p>
      </section>

      {/* Editable Details Form */}
      {formData && (
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Tenant Info */}
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-zinc-700">Tenant Profile</p>
            <div>
              <label className="block text-xs font-medium text-zinc-500">
                Tenant Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500">
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Financials (Rent, Maintenance, Advance) */}
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-zinc-700">
              Financial Details (All Editable)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500">
                  Monthly Rent (₹)
                </label>
                <input
                  type="number"
                  name="rent"
                  value={formData.rent}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">
                  Monthly Maintenance (₹)
                </label>
                <input
                  type="number"
                  name="maintenance"
                  value={formData.maintenance}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  min="0"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500">
                Advance Paid (Deposit) (₹)
              </label>
              <input
                type="number"
                name="advance_paid"
                value={formData.advance_paid}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                min="0"
                required
              />
            </div>
          </div>
          
          {/* Agreement Dates */}
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-zinc-700">
              Agreement Dates (Editable)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500">
                  Start Date
                </label>
                <input
                  type="date"
                  name="agreement_start"
                  value={formData.agreement_start || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">
                  End Date
                </label>
                <input
                  type="date"
                  name="agreement_end"
                  value={formData.agreement_end || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </div>
          
          {/* Submit Button for Tenant Details */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving Changes..." : "Save All Changes"}
          </button>
        </form>
      )}

      {/* --- Document Management Link (UPDATED) --- */}
      <section className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-zinc-700">Documents</p>
        <p className="text-xs text-zinc-500">
          {tenantData?.documents.length === 0 
            ? "No documents uploaded yet. "
            : `${tenantData?.documents.length} document(s) uploaded. `
          }
          Manage agreements, ID proof, etc.
        </p>
        <Link
          href={`/management/tenant/${tenantId}/documents`}
          className="mt-3 w-full flex items-center justify-center rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Manage Documents ({tenantData?.documents.length || 0})
        </Link>
      </section>
      
      {/* Payment History (No change) */}
      <section className="space-y-3 pt-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          Payment History
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-500">No payments found yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
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
                <div className="text-right">
                    <span className="text-xs rounded-full px-2 py-0.5 bg-zinc-100 text-zinc-600">
                      {p.method}
                    </span>
                    {p.notes && (
                         <p className="text-[10px] text-zinc-400 mt-0.5 italic">
                            {p.notes}
                        </p>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}