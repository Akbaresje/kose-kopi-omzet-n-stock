"use client";

import React from "react";
import { TabType, ActiveRole } from "@/types";
import { TrendingUp, Package, Coffee, AlertTriangle, FileText, Inbox, Truck } from "lucide-react";

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  role: ActiveRole;
  pendingOrdersCount: number;
  criticalItemsCount: number;
  poOrderedCount: number;
}

export function DashboardTabs({ activeTab, onTabChange, role, pendingOrdersCount, criticalItemsCount, poOrderedCount }: Props) {
  const tabs = [
    {
      id: "OMZET" as TabType,
      label: "Monitoring Omzet",
      icon: <TrendingUp className="w-4 h-4" />,
      badge: null,
      highlight: role === "ADMIN",
    },
    {
      id: "BAR" as TabType,
      label: "Stok Bar (Eceran)",
      icon: <Coffee className="w-4 h-4" />,
      badge: null,
      highlight: role === "BARISTA",
    },
    {
      id: "GUDANG" as TabType,
      label: "Stok Gudang (Grosir)",
      icon: <Package className="w-4 h-4" />,
      badge: null,
      highlight: role === "ADMIN",
    },
    {
      id: "ORDERS" as TabType,
      label: "Permintaan Stok",
      icon: <Inbox className="w-4 h-4" />,
      badge: pendingOrdersCount > 0 ? (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
          {pendingOrdersCount}
        </span>
      ) : null,
      highlight: false,
    },
    {
      id: "PURCHASE_ORDERS" as TabType,
      label: "Order Supplier",
      icon: <Truck className="w-4 h-4" />,
      badge: poOrderedCount > 0 ? (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
          {poOrderedCount}
        </span>
      ) : null,
      highlight: false,
    },
    {
      id: "SHOPPING_LIST" as TabType,
      label: "Daftar Belanja",
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      badge: criticalItemsCount > 0 ? (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-stone-950">
          {criticalItemsCount} Habis
        </span>
      ) : null,
      highlight: false,
    },
    {
      id: "LOGS" as TabType,
      label: "Riwayat Log",
      icon: <FileText className="w-4 h-4" />,
      badge: null,
      highlight: false,
    }
  ];

  return (
    <nav className="w-full mb-8">
      <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none border-b border-stone-800/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap relative ${
                isActive
                  ? "bg-stone-800 text-white shadow-sm border border-stone-700/80"
                  : "text-stone-400 hover:bg-stone-900/60 hover:text-stone-200"
              }`}
            >
              <span className={`transition-colors ${isActive ? "text-amber-400" : "text-stone-500"}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && <span className="ml-1">{tab.badge}</span>}
              
              {tab.highlight && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-2 right-2" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
