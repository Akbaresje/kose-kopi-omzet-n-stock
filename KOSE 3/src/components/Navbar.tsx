"use client";

import React from "react";
import { ActiveRole } from "@/types";
import { Coffee, Crown, Bell, Flame } from "lucide-react";

interface Props {
  role: ActiveRole;
  onRoleChange: (newRole: ActiveRole) => void;
  zeroCount: number;
  pendingOrdersCount: number;
  onSelectTab: (tab: any) => void;
}

export function Navbar({ role, onRoleChange, zeroCount, pendingOrdersCount, onSelectTab }: Props) {
  return (
    <header className="sticky top-0 z-30 w-full bg-stone-950/90 backdrop-blur-md border-b border-stone-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => onSelectTab("OMZET")}>
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <Coffee className="w-5 h-5 text-stone-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-serif tracking-tight text-white">
                KOSE
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                Cafe
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden sm:block">
              System Dashboard & Monitoring
            </p>
          </div>
        </div>

        {/* Right Side: Alerts & Mode Switcher */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Alerts */}
          <div className="hidden md:flex items-center gap-2">
            {pendingOrdersCount > 0 && (
              <button
                onClick={() => onSelectTab("ORDERS")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all"
                title="Ada pesanan menunggu persetujuan gudang"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{pendingOrdersCount} Pending</span>
              </button>
            )}

            {zeroCount > 0 && (
              <button
                onClick={() => onSelectTab("SHOPPING_LIST")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all"
                title="Ada bahan baku yang habis dan perlu dipesan ke supplier"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{zeroCount} Habis (Order Supplier)</span>
              </button>
            )}
          </div>

          {/* Role Switcher Pill */}
          <div className="bg-stone-900 border border-stone-800/80 p-1 rounded-xl flex items-center">
            <button
              onClick={() => onRoleChange("ADMIN")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                role === "ADMIN"
                  ? "bg-stone-800 text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Crown className={`w-3.5 h-3.5 ${role === "ADMIN" ? "text-amber-400" : "text-stone-500"}`} />
              <span className="whitespace-nowrap">Admin / Owner</span>
            </button>

            <button
              onClick={() => onRoleChange("BARISTA")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                role === "BARISTA"
                  ? "bg-stone-800 text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Coffee className={`w-3.5 h-3.5 ${role === "BARISTA" ? "text-amber-400" : "text-stone-500"}`} />
              <span className="whitespace-nowrap">Barista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Role Indicator Bar */}
      <div className="w-full py-1.5 px-4 text-center text-[11px] font-medium bg-stone-900/60 border-t border-stone-800/60 text-stone-400">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5">
          {role === "ADMIN" ? (
            <span>👑 <strong>Akses Admin/Owner Aktif</strong>: Kelola stok gudang grosir, persetujuan restock bar, dan analisis omzet harian.</span>
          ) : (
            <span>☕ <strong>Akses Barista Aktif</strong>: Memantau stok eceran bar & mengajukan pesanan restock bahan baku ke gudang dengan mudah.</span>
          )}
        </div>
      </div>
    </header>
  );
}
