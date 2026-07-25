"use client";

import React, { useState } from "react";
import { ActivityLog } from "@/types";
import { Clock, RefreshCw, CheckCircle, Package, Edit3, DollarSign, ShieldAlert, PackageMinus, Truck, ClipboardCheck } from "lucide-react";

interface Props {
  logs: ActivityLog[];
  onRefresh: () => void;
}

export function ActivityLogsView({ logs, onRefresh }: Props) {
  const [resetting, setResetting] = useState<boolean>(false);

  const getIcon = (type: string) => {
    switch (type) {
      case "PO_CREATE":
        return <Truck className="w-4 h-4 text-amber-400" />;
      case "PO_RECEIVE":
        return <ClipboardCheck className="w-4 h-4 text-emerald-400" />;
      case "USAGE":
        return <PackageMinus className="w-4 h-4 text-rose-400" />;
      case "TRANSFER":
        return <Package className="w-4 h-4 text-emerald-400" />;
      case "ORDER_CREATE":
        return <Clock className="w-4 h-4 text-amber-400" />;
      case "MANUAL_EDIT":
        return <Edit3 className="w-4 h-4 text-blue-400" />;
      case "OMZET_ADD":
        return <DollarSign className="w-4 h-4 text-amber-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-stone-400" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "PO_CREATE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PO_RECEIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "USAGE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "TRANSFER":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "ORDER_CREATE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "MANUAL_EDIT":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "OMZET_ADD":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-stone-800 text-stone-300 border-stone-700";
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm("⚠️ Apakah Anda yakin ingin mereset database kembali ke stok bawaan awal? Semua percobaan pesanan dan perubahan opname akan dikembalikan.")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_DB", payload: {} })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("🔄 " + data.message);
        onRefresh();
      } else {
        alert("Gagal mereset: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Error connection.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Banner - Clean */}
      <div className="bg-stone-900/90 border border-stone-800/80 p-6 sm:p-7 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 block mb-1">
            Audit Trail
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
            Riwayat Aktivitas Sistem
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Rekam jejak permintaan bahan baku dari bar, persetujuan gudang, dan pencatatan kasir.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRefresh}
            className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-all border border-stone-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleResetDatabase}
            disabled={resetting}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            title="Kembalikan stok persis seperti daftar KOSE awal"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{resetting ? "Mereset..." : "Reset Data Bawaan"}</span>
          </button>
        </div>
      </div>

      {/* Timeline List - Clean UI */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-6 shadow-sm">
        {logs.length === 0 ? (
          <p className="text-stone-400 text-center py-10 text-xs">Belum ada aktivitas yang terekam di dalam sistem.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              let dateStr = log.timestamp;
              try {
                dateStr = new Date(log.timestamp).toLocaleString("id-ID", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                });
              } catch {
                // Keep default
              }

              return (
                <div
                  key={log.id}
                  className="p-4 bg-stone-950/80 border border-stone-800/80 rounded-xl flex items-start gap-4 hover:border-stone-700 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <h4 className="font-bold text-white text-sm truncate">{log.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getBadgeColor(log.type)}`}>
                        {log.type}
                      </span>
                    </div>
                    <p className="text-stone-300 text-xs leading-relaxed">{log.description}</p>
                    <span className="text-[11px] text-stone-500 block mt-2 font-medium">
                      🕒 {dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
