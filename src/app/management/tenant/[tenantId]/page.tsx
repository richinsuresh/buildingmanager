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
  "id" | "building_id" | "room_id" | "created_at" | "username" | "password" | "room_number" | "phone" | "rent" | "maintenance" | "advance_paid"
> & {
  rent: string;
  maintenance: string;
  advance_paid: string;
  room_number: string;
  phone: string;
};

// --- Helper: Check if URL is an image ---
const isImage = (url: string) => {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
};

// --- Record Payment Form Component ---
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

      if (insertError) throw insertError;

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
    <div className="rounded-xl bg-white p-4 shadow-sm space-y-4 border border-zinc-200">
      <h2 className="text-sm font-semibold text-zinc-700">Record Manual Payment</h2>
      <form onSubmit={handleRecordPayment} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">Amount Paid (₹) *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Payment Method *</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            required
          >
            <option value="cash">Cash</option>
            <option value="bank-transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="upi">UPI</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Date Paid</label>
          <input
            type="date"
            value={datePaid}
            onChange={(e) => setDatePaid(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Notes</label>
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
          className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
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

  const loadTenantData = useCallback(async () => {
    setLoading(true);
    setError("");
    
    const [
      { data: tenant, error: tenantError },
      { data: paymentsData, error: paymentsError }
    ] = await Promise.all([
      supabase
        .from("tenants")
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
      room_number: (tenant as any).room?.room_number || "N/A",
      documents: (tenant as any).documents || [],
    } as unknown as FullTenantData;
    
    setTenantData(initialData);
    setPayments(paymentsData || []);

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
    if (tenantId) loadTenantData();
  }, [tenantId, loadTenantData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

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

      if (updateError) throw updateError;

      setSuccess("Tenant details updated successfully!");
      loadTenantData(); 

    } catch (err: any) {
      setError(err.message || "Failed to update details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading tenant details...</div>;

  if (error && !tenantData) return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-red-500">{error}</p>
      <Link href="/management/dashboard" className="inline-block text-xs text-zinc-500 underline">
        ← Back to dashboard
      </Link>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/management/buildings/${tenantData?.building_id}`}
          className="text-xs text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Building
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">
          Edit {tenantData?.name}
        </h1>
        <div className="w-10" />
      </header>

      {error && <p className="text-sm text-red-600 rounded p-3 bg-red-50">{error}</p>}
      {success && <p className="text-sm text-green-600 rounded p-3 bg-green-50">{success}</p>}
      
      {/* 3-Column Layout: Form | Docs & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Tenant Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Read-Only Credentials */}
          <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex gap-6 text-sm">
             <div>
                <span className="block text-xs text-zinc-400 uppercase font-bold">Room</span>
                <span className="font-semibold text-zinc-900">{tenantData?.room_number}</span>
             </div>
             <div>
                <span className="block text-xs text-zinc-400 uppercase font-bold">Username</span>
                <span className="font-mono">{tenantData?.username}</span>
             </div>
             <div>
                <span className="block text-xs text-zinc-400 uppercase font-bold">Password</span>
                <span className="font-mono">{tenantData?.password}</span>
             </div>
          </section>

          {formData && (
            <form onSubmit={handleUpdate} className="space-y-6">
              {/* Profile Card */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
                <h3 className="text-sm font-semibold text-zinc-700 mb-4">Personal Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Financials Card */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
                <h3 className="text-sm font-semibold text-zinc-700 mb-4">Contract Terms</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Monthly Rent (₹)</label>
                    <input
                      type="number"
                      name="rent"
                      value={formData.rent}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Maintenance (₹)</label>
                    <input
                      type="number"
                      name="maintenance"
                      value={formData.maintenance}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Deposit (₹)</label>
                    <input
                      type="number"
                      name="advance_paid"
                      value={formData.advance_paid}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">Start Date</label>
                    <input
                      type="date"
                      name="agreement_start"
                      value={formData.agreement_start || ""}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500">End Date</label>
                    <input
                      type="date"
                      name="agreement_end"
                      value={formData.agreement_end || ""}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save All Changes"}
              </button>
            </form>
          )}

          {/* --- NEW: Image Preview Grid --- */}
          <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-700">Documents Gallery</h3>
              <Link
                href={`/management/tenant/${tenantId}/documents`}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Manage / Upload →
              </Link>
            </div>
            
            {/* Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tenantData?.documents.filter(doc => isImage(doc.url)).map(doc => (
                 <a 
                   key={doc.id}
                   href={doc.url}
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="group relative aspect-square block rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 hover:border-zinc-400 transition-colors"
                 >
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img 
                      src={doc.url} 
                      alt={doc.label} 
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                   />
                   <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate text-center">{doc.label}</p>
                   </div>
                 </a>
              ))}
              
              {/* Non-Image Documents Fallback */}
              {tenantData?.documents.filter(doc => !isImage(doc.url)).map(doc => (
                 <a 
                   key={doc.id}
                   href={doc.url}
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex flex-col items-center justify-center p-4 aspect-square rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-white hover:shadow-sm transition-all text-center"
                 >
                   <svg className="w-8 h-8 text-zinc-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                   <span className="text-[10px] font-medium text-zinc-600 line-clamp-2">{doc.label}</span>
                   <span className="text-[9px] text-zinc-400 mt-1 uppercase tracking-wider">
                     {doc.file_name?.split('.').pop() || 'FILE'}
                   </span>
                 </a>
              ))}

              {/* Empty State */}
              {(!tenantData?.documents || tenantData.documents.length === 0) && (
                 <div className="col-span-full py-6 text-center text-sm text-zinc-400 italic">
                    No documents uploaded.
                 </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Payments & History */}
        <div className="space-y-6">
           <RecordPaymentForm tenantId={tenantId} onSuccess={loadTenantData} />
           
           {/* Payment History List */}
           <div className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-semibold text-zinc-700">Payment History</h3>
                 <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full text-zinc-500">{payments.length}</span>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                 {payments.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-4">No payments recorded.</p>
                 ) : (
                    payments.map(p => (
                      <div key={p.id} className="p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 hover:bg-white transition-colors">
                         <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-zinc-900">₹{p.amount.toLocaleString()}</span>
                            <span className="text-[10px] uppercase font-bold text-zinc-500 bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                               {p.method}
                            </span>
                         </div>
                         <div className="flex justify-between items-end">
                            <span className="text-[11px] text-zinc-500">{new Date(p.paid_at).toLocaleDateString()}</span>
                            {p.notes && <span className="text-[10px] text-zinc-400 italic truncate max-w-[100px]">{p.notes}</span>}
                         </div>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}