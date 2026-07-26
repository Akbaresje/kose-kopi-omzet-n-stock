"use client";

import React, { useState, useEffect } from "react";
import { ActiveRole, TabType, InventoryItem, RestockOrder, OmzetRecord, ActivityLog, PurchaseOrder } from "@/types";
import { Navbar } from "@/components/Navbar";
import { DashboardTabs } from "@/components/DashboardTabs";
import { OmzetMonitoring } from "@/components/OmzetMonitoring";
import { InventoryView } from "@/components/InventoryView";
import { OrderManagement } from "@/components/OrderManagement";
import { PurchaseOrderView } from "@/components/PurchaseOrderView";
import { ShoppingListAlert } from "@/components/ShoppingListAlert";
import { ActivityLogsView } from "@/components/ActivityLogsView";
import { AddOmzetModal, AddNewItemModal } from "@/components/Modals";
import { Coffee, RefreshCw } from "lucide-react";

export default function Home() {
  const [role, setRole] = useState<ActiveRole>("ADMIN");
  const [activeTab, setActiveTab] = useState<TabType>("OMZET");
  
  // Data State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<RestockOrder[]>([]);
  const [purchaseOrdersList, setPurchaseOrdersList] = useState<PurchaseOrder[]>([]);
  const [omzet, setOmzet] = useState<OmzetRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(75000000);

  // Modals
  const [isAddOmzetOpen, setIsAddOmzetOpen] = useState<boolean>(false);
  const [isAddNewItemOpen, setIsAddNewItemOpen] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      if (data.status === "success") {
        setItems(data.items || []);
        setOrders(data.orders || []);
        setPurchaseOrdersList(data.purchaseOrders || []);
        setOmzet(data.omzet || []);
        setLogs(data.logs || []);
        setSettings(data.settings || {});
        if (data.settings?.MONTHLY_OMZET_TARGET) {
          setMonthlyTarget(Number(data.settings.MONTHLY_OMZET_TARGET));
        }
      } else {
        setError(data.message || "Gagal memuat data dari database");
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError("Koneksi server gagal. Memastikan PostgreSQL siap...");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateTarget = (newTarget: number) => {
    setMonthlyTarget(newTarget);
  };

  const handleRoleChange = (newRole: ActiveRole) => {
    setRole(newRole);
    if (newRole === "BARISTA") {
      setActiveTab("BAR");
    } else if (newRole === "ADMIN" && activeTab === "BAR") {
      setActiveTab("OMZET");
    }
  };

  const zeroCount = items.filter(i => i.gudangStock === 0 || i.barStock === 0).length;
  const criticalCount = items.filter(i => i.gudangStock === 0 && i.barStock === 0).length;
  const pendingOrdersCount = orders.filter(o => o.status === "PENDING").length;
  const poOrderedCount = purchaseOrdersList.filter(po => po.status === "ORDERED" || po.status === "PARTIAL").length;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      
      <Navbar 
        role={role} 
        onRoleChange={handleRoleChange}
        zeroCount={criticalCount}
        pendingOrdersCount={pendingOrdersCount}
        onSelectTab={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        
        <DashboardTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          role={role}
          pendingOrdersCount={pendingOrdersCount}
          criticalItemsCount={criticalCount}
          poOrderedCount={poOrderedCount}
        />

        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3 text-stone-400">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center shadow-sm animate-pulse">
              <Coffee className="w-6 h-6 text-amber-500" />
            </div>
            <div className="text-center">
              <p className="font-bold text-white text-sm">Memuat Data KOSE Cafe...</p>
              <p className="text-xs text-stone-500 mt-0.5">Sinkronisasi stok gudang dan bar eceran</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-rose-950/30 border border-rose-900/60 p-8 rounded-2xl text-center max-w-md mx-auto my-12 space-y-4">
            <p className="font-bold text-rose-300 text-base">Gagal Memuat Data</p>
            <p className="text-stone-400 text-xs">{error}</p>
            <button
              onClick={fetchData}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 mx-auto transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Coba Lagi</span>
            </button>
          </div>
        ) : (
          <div className="mt-2">
            {activeTab === "OMZET" && (
              <OmzetMonitoring 
                omzetRecords={omzet} 
                role={role} 
                monthlyTarget={monthlyTarget}
                onOpenAddModal={() => setIsAddOmzetOpen(true)}
                onUpdateTarget={handleUpdateTarget}
              />
            )}

            {activeTab === "GUDANG" && (
              <InventoryView 
                viewMode="GUDANG"
                items={items}
                role={role}
                onRefresh={fetchData}
                onOpenNewItemModal={() => setIsAddNewItemOpen(true)}
                onSwitchToOrders={() => setActiveTab("ORDERS")}
              />
            )}

            {activeTab === "BAR" && (
              <InventoryView 
                viewMode="BAR"
                items={items}
                role={role}
                onRefresh={fetchData}
                onOpenNewItemModal={() => setIsAddNewItemOpen(true)}
                onSwitchToOrders={() => setActiveTab("ORDERS")}
              />
            )}

            {activeTab === "ORDERS" && (
              <OrderManagement 
                orders={orders}
                role={role}
                onRefresh={fetchData}
              />
            )}

            {activeTab === "PURCHASE_ORDERS" && (
              <PurchaseOrderView
                purchaseOrders={purchaseOrdersList}
                items={items}
                onRefresh={fetchData}
              />
            )}

            {activeTab === "SHOPPING_LIST" && (
              <ShoppingListAlert 
                items={items}
              />
            )}

            {activeTab === "LOGS" && (
              <ActivityLogsView 
                logs={logs}
                onRefresh={fetchData}
              />
            )}
          </div>
        )}
      </main>

      <footer className="w-full bg-stone-900/60 border-t border-stone-800/80 py-8 px-4 sm:px-6 mt-16 text-stone-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center text-stone-950 font-black text-[10px]">☕</span>
            <span className="font-bold text-stone-300">KOSE Cafe Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-stone-400 hover:text-stone-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronisasi Data</span>
            </button>
            <span>•</span>
            <span className="text-stone-400">
              Clean & Easy to Use System
            </span>
          </div>
        </div>
      </footer>

      <AddOmzetModal 
        isOpen={isAddOmzetOpen}
        onClose={() => setIsAddOmzetOpen(false)}
        onSuccess={fetchData}
      />

      <AddNewItemModal 
        isOpen={isAddNewItemOpen}
        onClose={() => setIsAddNewItemOpen(false)}
        onSuccess={fetchData}
      />

    </div>
  );
}
