import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { TenantDocument } from "@/lib/types";

export default async function TenantDocumentsPage() {
  const cookieStore = cookies();
  const tenantId = cookieStore.get("tenantId")?.value;

  if (!tenantId) {
    redirect("/login/tenant");
  }

  // NOTE: Assuming your 'tenant_documents' table is correctly set up with RLS
  const { data: documents, error } = await supabase
    .from("tenant_documents") // FIXED: Removed <TenantDocument> generic
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    return (
      <div className="min-h-screen space-y-4 px-4 py-4">
        <p className="text-sm text-red-600">
          Error loading documents. Please contact management.
        </p>
        <Link href="/tenant/dashboard" className="text-xs text-zinc-600 underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const documentList = documents || [];

  return (
    <div className="min-h-screen space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <Link
          href="/tenant/dashboard"
          className="text-xs text-zinc-600"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">
          My Documents
        </h1>
        <div className="w-10" />
      </header>

      <section className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        {documentList.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No documents have been uploaded to your profile yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {documentList.map((doc) => (
              <li key={doc.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                <div className="max-w-[70%]">
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-[10px] text-zinc-400">
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
                    View / Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}