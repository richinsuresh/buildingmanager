"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { TenantDocument } from "@/lib/types";

const STORAGE_BUCKET = "tenant-docs";

export default function TenantDocumentsPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;

  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // --- Preview State ---
  const [previewDoc, setPreviewDoc] = useState<TenantDocument | null>(null);

  // --- Fetch Logic ---
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("tenant_documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchDocuments();
    }
  }, [tenantId, fetchDocuments]);

  // --- Upload Logic ---
  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !tenantId) return;

    setUploading(true);
    setError("");

    try {
      // Sanitize file name
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${tenantId}/${Date.now()}_${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (!publicUrlData.publicUrl) throw new Error("Failed to get public URL.");

      const { error: insertError } = await supabase
        .from("tenant_documents")
        .insert({
          tenant_id: tenantId,
          url: publicUrlData.publicUrl,
          file_name: file.name, 
          label: label || file.name,
        });

      if (insertError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        throw insertError;
      }

      setLabel("");
      setFile(null);
      await fetchDocuments();
      
    } catch (err: any) {
      setError(err.message || "File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // --- Delete Logic ---
  const handleDelete = async (doc: TenantDocument) => {
    if (!confirm(`Are you sure you want to delete: ${doc.label}?`)) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("tenant_documents")
        .delete()
        .eq("id", doc.id);

      if (deleteError) throw deleteError;
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper to check file type ---
  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    return 'other';
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/management/tenant/${tenantId}`}
          className="text-xs text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Tenant
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">
          Manage Documents
        </h1>
        <div className="w-10" />
      </header>

      {error && <p className="text-sm text-red-600 rounded p-2 bg-red-50">Error: {error}</p>}

      {/* Upload Form */}
      <section className="rounded-xl bg-white p-4 shadow-sm border border-zinc-200">
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Upload Document</h2>
        <form onSubmit={handleUpload} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="e.g. Lease Agreement"
            />
          </div>
          <div className="flex-1">
             <label className="block text-xs font-medium text-zinc-500 mb-1">File</label>
             <input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-sm text-zinc-500 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
              required
            />
          </div>
          <button
            type="submit"
            disabled={uploading || !file}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {uploading ? "..." : "Upload"}
          </button>
        </form>
      </section>

      {/* Document List */}
      <section className="rounded-xl bg-white p-4 shadow-sm border border-zinc-200">
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Stored Documents</h2>
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No documents found.</p>
        ) : (
          <ul className="space-y-0 divide-y divide-zinc-100">
            {documents.map((doc) => (
              <li key={doc.id} className="flex justify-between items-center py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{doc.label}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --- PREVIEW MODAL --- */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-4 py-3 bg-zinc-50">
              <h3 className="text-sm font-semibold text-zinc-900">{previewDoc.label}</h3>
              <div className="flex gap-2">
                 <a 
                   href={previewDoc.url} 
                   download 
                   target="_blank"
                   className="text-xs bg-zinc-200 hover:bg-zinc-300 px-3 py-1 rounded-md text-zinc-800"
                 >
                   Download
                 </a>
                 <button
                   onClick={() => setPreviewDoc(null)}
                   className="text-xs bg-zinc-800 hover:bg-zinc-900 px-3 py-1 rounded-md text-white"
                 >
                   Close
                 </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto bg-zinc-100 p-4 flex items-center justify-center">
               {getFileType(previewDoc.url) === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={previewDoc.url} 
                    alt={previewDoc.label || "Document Preview"} // FIX: Added fallback string
                    className="max-w-full max-h-[80vh] object-contain shadow-lg rounded-md" 
                  />
               ) : getFileType(previewDoc.url) === 'pdf' ? (
                  <iframe 
                    src={previewDoc.url} 
                    className="w-full h-[70vh] rounded-md shadow-sm border border-zinc-200" 
                    title="Document Preview"
                  />
               ) : (
                  <div className="text-center">
                    <p className="text-zinc-500 mb-2">Preview not available for this file type.</p>
                    <a href={previewDoc.url} target="_blank" className="text-blue-600 underline text-sm">Download to view</a>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}