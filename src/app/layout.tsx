import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Building Manager",
  description: "Manage buildings, tenants and rent from your phone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900">
        {/* Normal responsive page: centered content, max width */}
        <div className="min-h-screen max-w-5xl mx-auto px-4 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
