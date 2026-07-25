import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "KOSE Cafe — Monitoring Omzet & Stok Bahan Baku",
  description:
    "Dashboard operasional KOSE Cafe: monitoring omzet bulanan, stok gudang grosir, stok bar eceran, permintaan restock barista, dan order supplier.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0c0a09",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-stone-950 text-stone-100 antialiased">{children}</body>
    </html>
  );
}
