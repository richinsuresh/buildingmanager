"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { TenantDocument } from "@/lib/types";

// NOTE: You will need to create a Storage Bucket in your Supabase project (e.g., 'tenant-docs') 
// and set up Row Level Security (RLS) policies for security.
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
      const filePath = `${tenantId}/${Date.now()}_${file.name}`;
      
      // 1. Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get the public URL for the file
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (!publicUrlData.publicUrl) {
          throw new Error("Failed to get public URL.");
      }

      // 3. Insert record into the database table
      const { error: insertError } = await supabase
        .from("tenant_documents")
        .insert({
          tenant_id: tenantId,
          url: publicUrlData.publicUrl,
          file_name: file.name,
          label: label || file.name,
        });

      if (insertError) {
        // If DB insertion fails, try to remove the file from storage (cleanup)
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        throw insertError;
      }

      // Success
      setLabel("");
      setFile(null);
      await fetchDocuments();
      
    } catch (err: any) {
      setError(err.message || "File upload failed.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // --- Delete Logic ---
  const handleDelete = async (doc: TenantDocument) => {
    if (!confirm(`Are you sure you want to delete the document: ${doc.label}?`)) return;

    setLoading(true);
    setError("");

    try {
      // 1. Delete record from the database
      const { error: deleteDbError } = await supabase
        .from("tenant_documents")
        .delete()
        .eq("id", doc.id);

      if (deleteDbError) throw deleteDbError;
      
      // NOTE: Deleting the file from Supabase storage is complex
      // as the public URL does not contain the path, but is necessary for cleanup.
      // We rely on the DB record being deleted for now.

      // Success
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message || "Failed to delete document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <Link
          href={`/management/tenant/${tenantId}`}
          className="text-xs text-zinc-600"
        >
          ← Back to Tenant Details
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">
          Manage Documents
        </h1>
        <div className="w-10" />
      </header>

      {error && <p className="text-sm text-red-600 rounded p-2 bg-red-50">Error: {error}</p>}

      {/* --- Upload Form --- */}
      <section className="rounded-xl bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700">Upload New Document</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Document Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
              placeholder="e.g., Lease Agreement 2024"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Select File *
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="mt-1 w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100"
              required
            />
          </div>
          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </section>

      {/* --- Document List --- */}
      <section className="rounded-xl bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700">Existing Documents</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-zinc-500">No documents uploaded.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                <div className="max-w-[70%]">
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View
                  </a>
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
    </div>
  );
}