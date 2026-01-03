"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Tenant, TenantDocument, Payment } from "@/lib/types";

// ... Types ...
type FullTenantData = Tenant & {
  documents: TenantDocument[];
  room_number: string;
};

type TenantFormState = Omit<
  Tenant,
  "id" | "building_id" | "room_id" | "created_at" | "username" | "password" | "room_number" | "phone" | "rent" | "maintenance" | "advance_paid" | "status"
> & {
  rent: string;
  maintenance: string;
  advance_paid: string;
  room_number: string;
  phone: string;
};

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);

// ... Record Payment Form (No Changes needed here from previous step) ...
function RecordPaymentForm({ tenantId, onSuccess }: { tenantId: string, onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [paymentType, setPaymentType] = useState<string>("rent");
  const [notes, setNotes] = useState("");
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split('T')[0]);
  const [forMonth, setForMonth] = useState(new Date().toISOString().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const paymentMonthDate = forMonth ? `${forMonth}-01` : null;
      const { error: insertError } = await supabase.from("payments").insert({
        tenant_id: tenantId,
        amount: Number(amount),
        method,
        payment_type: paymentType,
        notes: notes || null,
        paid_at: datePaid,
        payment_month: paymentMonthDate,
      });

      if (insertError) throw insertError;
      setAmount(""); setNotes(""); setPaymentType("rent"); setForMonth(new Date().toISOString().slice(0, 7));
      onSuccess();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200 space-y-4">
      <h2 className="text-sm font-bold text-zinc-900">Record Payment</h2>
      <form onSubmit={handleRecordPayment} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-zinc-500">Amount (₹)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" required /></div>
            <div><label className="block text-xs font-medium text-zinc-500">Type</label><select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full rounded border px-3 py-2 text-sm"><option value="rent">Rent (inc. Maint.)</option><option value="deposit">Deposit</option></select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
             <div><label className="block text-xs font-medium text-zinc-500">For Month</label><input type="month" value={forMonth} onChange={e => setForMonth(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" required /></div>
             <div><label className="block text-xs font-medium text-zinc-500">Date Paid</label><input type="date" value={datePaid} onChange={e => setDatePaid(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-zinc-500">Method</label><select value={method} onChange={e => setMethod(e.target.value)} className="w-full rounded border px-3 py-2 text-sm"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank-transfer">Bank Transfer</option><option value="cheque">Cheque</option></select></div>
            <div><label className="block text-xs font-medium text-zinc-500">Notes</label><input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="Optional" /></div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={saving} className="w-full rounded bg-zinc-900 py-2 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50">{saving ? "Recording..." : "Record Payment"}</button>
      </form>
    </div>
  );
}

// --- Main Page Component ---
export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params?.tenantId as string;

  const [tenantData, setTenantData] = useState<FullTenantData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [formData, setFormData] = useState<TenantFormState | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vacating, setVacating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTenantData = useCallback(async () => {
    setLoading(true);
    const [{ data: tenant }, { data: paymentsData }] = await Promise.all([
      supabase.from("tenants").select(`*, documents:tenant_documents(*), room:rooms(room_number)`).eq("id", tenantId).maybeSingle(),
      supabase.from("payments").select("*").eq("tenant_id", tenantId).order("paid_at", { ascending: false }),
    ]);

    if (!tenant) {
      setError("Tenant not found.");
      setLoading(false);
      return;
    }
    
    const initialData = { ...tenant, room_number: (tenant as any).room?.room_number || "N/A", documents: (tenant as any).documents || [] } as unknown as FullTenantData;
    setTenantData(initialData);
    setPayments(paymentsData || []);
    setFormData({
      name: initialData.name, phone: initialData.phone || "", rent: String(initialData.rent || 0), maintenance: String(initialData.maintenance || 0),
      advance_paid: String(initialData.advance_paid || 0), agreement_start: initialData.agreement_start || "", agreement_end: initialData.agreement_end || "",
      room_number: initialData.room_number,
    });
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { if (tenantId) loadTenantData(); }, [tenantId, loadTenantData]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tenants").update({
          name: formData.name, phone: formData.phone || null, rent: Number(formData.rent), maintenance: Number(formData.maintenance),
          advance_paid: Number(formData.advance_paid), agreement_start: formData.agreement_start || null, agreement_end: formData.agreement_end || null,
        }).eq("id", tenantId);
      if (error) throw error;
      setSuccess("Updated successfully!");
      loadTenantData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDeleteTenant = async () => {
    if (!confirm("Are you sure? This will delete the tenant record forever.")) return;
    setDeleting(true);
    try {
        if (tenantData?.room_id) {
            await supabase.from("rooms").update({ is_occupied: false }).eq("id", tenantData.room_id);
        }
        const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
        if (error) throw error;
        router.replace(`/management/buildings/${tenantData?.building_id}`);
    } catch (err: any) {
        setError(err.message);
        setDeleting(false);
    }
  };

  // --- NEW: VACATE TENANT ---
  const handleVacateTenant = async () => {
    if (!confirm("Confirm vacate? This will mark the tenant as moved out and free up the room.")) return;
    setVacating(true);
    try {
        // 1. Unoccupy the room
        if (tenantData?.room_id) {
            await supabase.from("rooms").update({ is_occupied: false }).eq("id", tenantData.room_id);
        }
        // 2. Mark tenant as vacated
        const { error } = await supabase.from("tenants").update({ status: 'vacated' }).eq("id", tenantId);
        
        if (error) throw error;
        
        // Refresh
        await loadTenantData();
        setSuccess("Tenant vacated successfully.");
    } catch (err: any) {
        setError(err.message);
    } finally {
        setVacating(false);
    }
  };

  const getMonthlyStatus = () => {
    if (!tenantData) return { totalPaid: 0, due: 0, status: "pending" };
    const totalDue = (tenantData.rent || 0) + (tenantData.maintenance || 0);
    const targetMonthStr = `${viewMonth}-01`;
    const monthlyPayments = payments.filter(p => {
        if (p.payment_type === 'deposit') return false; 
        if (p.payment_month) return p.payment_month === targetMonthStr;
        const paidDate = new Date(p.paid_at);
        return `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}` === viewMonth;
    });
    const totalPaid = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);
    return { totalPaid, due: totalDue };
  };

  const monthlyStatus = getMonthlyStatus();
  const isVacated = tenantData?.status === 'vacated';

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error && !tenantData) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex items-center justify-between border-b pb-4">
        <Link href={`/management/buildings/${tenantData?.building_id}`} className="text-xs text-zinc-600 underline">← Back to Building</Link>
        <div className="flex items-center gap-3">
             <h1 className="text-xl font-bold text-zinc-900">{tenantData?.name}</h1>
             {isVacated && <span className="bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded text-xs font-bold uppercase">Vacated</span>}
        </div>
      </header>

      {success && <p className="p-3 bg-green-50 text-green-700 text-sm rounded">{success}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
           <form onSubmit={handleUpdate} className="space-y-6">
              <div className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
                <h3 className="text-sm font-bold text-zinc-900 mb-4">Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-zinc-500">Name</label><input className="w-full border rounded px-3 py-2 text-sm" value={formData?.name} onChange={e => setFormData(prev => ({ ...prev!, name: e.target.value }))} /></div>
                  <div><label className="text-xs text-zinc-500">Phone</label><input className="w-full border rounded px-3 py-2 text-sm" value={formData?.phone} onChange={e => setFormData(prev => ({ ...prev!, phone: e.target.value }))} /></div>
                </div>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
                <h3 className="text-sm font-bold text-zinc-900 mb-4">Financials</h3>
                <div className="grid grid-cols-3 gap-4">
                   <div><label className="text-xs text-zinc-500">Rent</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={formData?.rent} onChange={e => setFormData(prev => ({ ...prev!, rent: e.target.value }))} /></div>
                   <div><label className="text-xs text-zinc-500">Maint.</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={formData?.maintenance} onChange={e => setFormData(prev => ({ ...prev!, maintenance: e.target.value }))} /></div>
                   <div><label className="text-xs text-zinc-500">Deposit</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={formData?.advance_paid} onChange={e => setFormData(prev => ({ ...prev!, advance_paid: e.target.value }))} /></div>
                </div>
              </div>
              <button disabled={saving} className="w-full rounded bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50">
                 {saving ? "Saving..." : "Save Changes"}
              </button>
           </form>

           {/* Documents Gallery (Preserved) */}
           <section className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Documents Gallery</h3>
              <Link href={`/management/tenant/${tenantId}/documents`} className="text-xs font-medium text-blue-600 hover:underline">Manage / Upload →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tenantData?.documents.filter(doc => isImage(doc.url)).map(doc => (
                 <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-square block rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 hover:border-zinc-400">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={doc.url} alt={doc.label || "Document"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                   <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100"><p className="text-[10px] text-white truncate text-center">{doc.label}</p></div>
                 </a>
              ))}
              {(!tenantData?.documents || tenantData.documents.length === 0) && <div className="col-span-full py-6 text-center text-sm text-zinc-400 italic">No documents uploaded.</div>}
            </div>
          </section>

           {/* Danger Zone: Vacate & Delete */}
           <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-800">Management Actions</h3>
              
              {!isVacated && (
                  <div className="flex justify-between items-center border-b border-orange-200 pb-4">
                    <div>
                        <h4 className="text-sm font-semibold text-zinc-900">Vacate Tenant</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Marks tenant as moved out. Room becomes vacant.</p>
                    </div>
                    <button onClick={handleVacateTenant} disabled={vacating} className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 text-xs font-bold rounded hover:bg-zinc-50">
                        {vacating ? "..." : "Vacate"}
                    </button>
                  </div>
              )}

              <div className="flex justify-between items-center pt-2">
                 <div>
                    <h4 className="text-sm font-semibold text-red-700">Delete Record</h4>
                    <p className="text-xs text-red-500 mt-0.5">Permanently deletes data (Payments, Docs, etc).</p>
                 </div>
                 <button onClick={handleDeleteTenant} disabled={deleting} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700">
                    {deleting ? "..." : "Delete"}
                 </button>
              </div>
           </div>
        </div>

        {/* Right Column (Status & History) */}
        <div className="space-y-6">
           <div className="rounded-xl bg-zinc-900 p-5 text-white shadow-md">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold">Status Check</h3>
                 <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)} className="text-black text-xs rounded px-2 py-1" />
              </div>
              <div className="space-y-1">
                 <p className="text-xs text-zinc-400">Total Due: <span className="text-white font-mono">₹{monthlyStatus.due.toLocaleString()}</span></p>
                 <p className="text-xs text-zinc-400">Total Paid: <span className="text-white font-mono">₹{monthlyStatus.totalPaid.toLocaleString()}</span></p>
                 <div className={`mt-3 inline-block px-3 py-1 rounded text-xs font-bold ${monthlyStatus.totalPaid >= monthlyStatus.due && monthlyStatus.due > 0 ? "bg-green-500 text-black" : "bg-red-500 text-white"}`}>
                    {monthlyStatus.totalPaid >= monthlyStatus.due && monthlyStatus.due > 0 ? "FULLY PAID" : `PENDING ₹${(monthlyStatus.due - monthlyStatus.totalPaid).toLocaleString()}`}
                 </div>
              </div>
           </div>

           <RecordPaymentForm tenantId={tenantId} onSuccess={loadTenantData} />
           
           <div className="rounded-xl bg-white p-5 shadow-sm border border-zinc-200">
              <h3 className="text-sm font-bold text-zinc-900 mb-3">History</h3>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                 {payments.map(p => (
                    <div key={p.id} className="flex justify-between p-2 border-b border-zinc-50 last:border-0">
                       <div>
                          <p className="text-sm font-bold">₹{p.amount}</p>
                          <p className="text-[10px] text-zinc-400">{new Date(p.paid_at).toLocaleDateString()} • {p.method}</p>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          {p.payment_month && <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded">{p.payment_month}</span>}
                          {p.payment_type === 'deposit' && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Deposit</span>}
                       </div>
                    </div>
                 ))}
                 {payments.length === 0 && <p className="text-xs text-zinc-400 italic">No payments.</p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}