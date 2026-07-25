"use client";

import React, { useState } from "react";
import { InventoryItem } from "@/types";
import { AlertTriangle, AlertCircle, ShoppingBag, Copy, Check, ExternalLink } from "lucide-react";

interface Props {
  items: InventoryItem[];
}

export function ShoppingListAlert({ items }: Props) {
  const [copied, setCopied] = useState<boolean>(false);
  const [supplierPhone, setSupplierPhone] = useState<string>("6281234567890");

  const criticalItems = items.filter(i => i.gudangStock === 0 && i.barStock === 0);
  const warningItems = items.filter(i => (i.gudangStock === 0 || i.gudangStock <= i.minGudangStock) && !(i.gudangStock === 0 && i.barStock === 0));

  const calculateOrderQty = (item: InventoryItem, isCritical: boolean) => {
    if (item.unit === "Pcs") return isCritical ? 5 : 3;
    if (item.unit === "Botol") return isCritical ? 6 : 4;
    return isCritical ? 10 : 5;
  };

  const totalEstCost = [
    ...criticalItems.map(i => calculateOrderQty(i, true) * i.pricePerUnit),
    ...warningItems.map(i => calculateOrderQty(i, false) * i.pricePerUnit)
  ].reduce((a, b) => a + b, 0);

  const formatRp = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const buildWAText = () => {
    const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    let text = `🏬 *ORDER SUPLAI BAHAN BAKU KOSE CAFE*\n📅 Tanggal: ${today}\n\n`;
    
    if (criticalItems.length > 0) {
      text += `🚨 *STOK URGENT (HABIS TOTAL):*\n`;
      criticalItems.forEach((i, idx) => {
        text += `${idx + 1}. *${i.name}* (${i.category}) -> Pesan: *${calculateOrderQty(i, true)} ${i.unit}*\n`;
      });
      text += `\n`;
    }

    if (warningItems.length > 0) {
      text += `🟡 *RESTOCK GUDANG (STOK TIPIS/HABIS):*\n`;
      warningItems.forEach((i, idx) => {
        text += `${idx + 1}. *${i.name}* (${i.category}) -> Pesan: *${calculateOrderQty(i, false)} ${i.unit}*\n`;
      });
    }

    text += `\n💰 *Estimasi Total Nilai Order*: ${formatRp(totalEstCost)}\n Mohon informasi ketersediaan dan pengiriman hari ini, Terima Kasih! 🙏☕`;
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildWAText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(buildWAText());
    const cleanPhone = supplierPhone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Banner - Clean */}
      <div className="bg-stone-900/90 border border-stone-800/80 p-6 sm:p-7 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-rose-400 block mb-1">
              Smart Re-Order System
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Daftar Belanja & Alert Stok
            </h2>
            <p className="text-stone-400 text-sm mt-1 max-w-2xl">
              Sistem secara otomatis mendeteksi bahan baku yang ludes di Gudang dan Bar. Langsung salin atau kirim daftar belanja ke supplier via WhatsApp.
            </p>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 px-5 py-4 rounded-2xl shadow-inner shrink-0">
            <span className="text-[11px] text-stone-400 uppercase font-semibold tracking-wider block mb-1">
              Estimasi Anggaran Suplai
            </span>
            <div className="text-2xl font-extrabold text-amber-400">
              {formatRp(totalEstCost)}
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block">
              Untuk {criticalItems.length + warningItems.length} jenis bahan
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Lists of Urgent & Warning items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Critical Items Section */}
          <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Habis Total (0 Gudang & 0 Bar) — {criticalItems.length} Varian</span>
              </h3>
              <span className="bg-rose-500/15 text-rose-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-500/20">
                Prioritas Order
              </span>
            </div>

            {criticalItems.length === 0 ? (
              <p className="text-stone-400 text-xs bg-stone-950 p-4 rounded-xl border border-stone-800/80">
                ✨ Tidak ada bahan baku yang kosong di kedua area sekaligus.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {criticalItems.map((item) => {
                  const recQty = calculateOrderQty(item, true);
                  return (
                    <div key={item.id} className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex items-center justify-between hover:border-stone-700 transition-all">
                      <div>
                        <span className="text-[10px] uppercase text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded mr-1.5 border border-rose-500/20">
                          {item.category}
                        </span>
                        <h4 className="text-base font-bold text-white mt-1.5">{item.name}</h4>
                        <span className="text-xs text-stone-500 block mt-0.5">
                          Est: {formatRp(item.pricePerUnit)} /{item.unit}
                        </span>
                      </div>
                      <div className="text-right pl-3 border-l border-stone-800">
                        <span className="text-[11px] text-stone-500 block font-medium">Saran Order:</span>
                        <span className="text-lg font-black text-rose-400">
                          {recQty} <span className="text-xs font-normal text-stone-400">{item.unit}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warning Items Section */}
          <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>Gudang Kosong / Tipis — {warningItems.length} Varian</span>
              </h3>
              <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-500/20">
                Persiapan Stok
              </span>
            </div>

            <p className="text-stone-400 text-xs mb-4">
              Bahan baku berikut masih tersedia di area Barista, namun persediaan di gudang utama sudah habis atau tipis ({'<='} 2).
            </p>

            {warningItems.length === 0 ? (
              <p className="text-stone-400 text-xs bg-stone-950 p-4 rounded-xl border border-stone-800/80">
                Semua stok gudang dalam kondisi aman.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {warningItems.map((item) => {
                  const recQty = calculateOrderQty(item, false);
                  return (
                    <div key={item.id} className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex items-center justify-between hover:border-stone-700 transition-all">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {item.category}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            Gudang: <strong className="text-white">{item.gudangStock}</strong> · Bar: <strong className="text-white">{item.barStock}</strong>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{item.name}</h4>
                      </div>
                      <div className="text-right shrink-0 pl-3 border-l border-stone-800">
                        <span className="text-[10px] text-stone-500 block">Saran Beli:</span>
                        <span className="text-sm font-extrabold text-amber-400">
                          {recQty} {item.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Export to WhatsApp & Supplier Contact */}
        <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base mb-1.5">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <span>Ekspor Daftar Belanja</span>
            </div>
            <p className="text-stone-400 text-xs mb-4">
              Kirim daftar belanja siap pakai langsung via WhatsApp atau salin teks ke clipboard.
            </p>

            {/* Preview Box */}
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-[11px] text-stone-300 max-h-[340px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {buildWAText()}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-800">
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Nomor WhatsApp Supplier / Roaster
              </label>
              <input
                type="text"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="6281234567890"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleCopy}
                className="w-full py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-stone-700 active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Tersalin ke Clipboard! ✅" : "Salin Teks Daftar Belanja"}</span>
              </button>

              <button
                onClick={handleSendWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <ExternalLink className="w-4 h-4 text-stone-950" />
                <span>Kirim via WhatsApp Sekarang 🚀</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
