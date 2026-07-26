"use client";

import React, { useState } from "react";
import { InventoryItem, ActiveRole } from "@/types";
import { 
  Search, ShoppingCart, Plus, Minus, Send, Edit3, Sparkles, Box, Check, Coffee, PackageMinus 
} from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  viewMode: "GUDANG" | "BAR";
  items: InventoryItem[];
  role: ActiveRole;
  onRefresh: () => void;
  onOpenNewItemModal: () => void;
  onSwitchToOrders: () => void;
}

export function InventoryView({ viewMode, items, role, onRefresh, onOpenNewItemModal, onSwitchToOrders }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Barista Order Cart
  const [orderCart, setOrderCart] = useState<Record<number, { itemId: number; name: string; qty: number; unit: string }>>({});
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [isQuickOrdering, setIsQuickOrdering] = useState<boolean>(false);

  // Barista "Pakai Bahan" (pemakaian cepat) state
  const [usingItemId, setUsingItemId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "warn" } | null>(null);

  // Modal Update Stok Bar (Barista)
  const [barEditItem, setBarEditItem] = useState<InventoryItem | null>(null);
  const [barEditQty, setBarEditQty] = useState<number>(0);
  const [barEditNotes, setBarEditNotes] = useState<string>("");
  const [isSavingBarEdit, setIsSavingBarEdit] = useState<boolean>(false);

  // Stop Opname & Atur Harga (Admin - Gudang)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editGudangQty, setEditGudangQty] = useState<number>(0);
  const [editBarQty, setEditBarQty] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const showToast = (msg: string, type: "ok" | "warn" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    const matchCategory = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const currentStock = viewMode === "GUDANG" ? item.gudangStock : item.barStock;
    const minThreshold = viewMode === "GUDANG" ? item.minGudangStock : item.minBarStock;
    
    let itemStatus = "AMAN";
    if (currentStock === 0) itemStatus = "HABIS";
    else if (currentStock <= minThreshold) itemStatus = "TIPIS";

    const matchStatus = 
      selectedStatus === "ALL" || 
      (selectedStatus === "HABIS" && itemStatus === "HABIS") ||
      (selectedStatus === "TIPIS" && itemStatus === "TIPIS") ||
      (selectedStatus === "AMAN" && itemStatus === "AMAN");

    return matchCategory && matchSearch && matchStatus;
  });

  // Statistik Ringkas
  const totalItemsCount = items.length;
  const zeroCount = items.filter(i => (viewMode === "GUDANG" ? i.gudangStock : i.barStock) === 0).length;
  const tipisCount = items.filter(i => {
    const st = viewMode === "GUDANG" ? i.gudangStock : i.barStock;
    const min = viewMode === "GUDANG" ? i.minGudangStock : i.minBarStock;
    return st > 0 && st <= min;
  }).length;
  const amanCount = totalItemsCount - zeroCount - tipisCount;

  const totalWarehouseValue = items.reduce((acc, curr) => acc + (curr.gudangStock * curr.pricePerUnit), 0);
  const formatRp = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  // === BARISTA: PAKAI BAHAN (kurangi stok bar secara instan) ===
  const handleUseStock = async (item: InventoryItem, qty: number = 1) => {
    setUsingItemId(item.id);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "USE_STOCK",
          payload: { itemId: item.id, qty, usedBy: role === "BARISTA" ? "Barista (Shift Aktif)" : "Admin", reason: "Terpakai untuk operasional bar" }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        onRefresh();
        if (data.isEmpty) {
          showToast(`⚠️ ${item.name} sekarang HABIS di Bar! Segera order ke Gudang.`, "warn");
        } else {
          showToast(`✅ ${data.message}`, "ok");
        }
      } else {
        showToast(`⚠️ ${data.message}`, "warn");
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan pemakaian. Coba lagi.", "warn");
    } finally {
      setUsingItemId(null);
    }
  };

  // === BARISTA: Simpan Update Stok Bar (angka pasti) ===
  const handleSaveBarStock = async () => {
    if (!barEditItem) return;
    setIsSavingBarEdit(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_BAR_STOCK",
          payload: {
            itemId: barEditItem.id,
            barStock: barEditQty,
            updatedBy: role === "BARISTA" ? "Barista (Shift Aktif)" : "Admin / Owner",
            notes: barEditNotes
          }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setBarEditItem(null);
        setBarEditNotes("");
        onRefresh();
        if (data.isEmpty) {
          showToast(`⚠️ ${barEditItem.name} kini HABIS di Bar! Ajukan order ke Gudang.`, "warn");
        } else {
          showToast(`✅ ${data.message}`, "ok");
        }
      } else {
        showToast(`⚠️ ${data.message}`, "warn");
      }
    } catch (e) {
      console.error(e);
      showToast("Terjadi kesalahan koneksi.", "warn");
    } finally {
      setIsSavingBarEdit(false);
    }
  };

  const startBarEdit = (item: InventoryItem) => {
    setBarEditItem(item);
    setBarEditQty(item.barStock);
    setBarEditNotes("");
  };

  // Cart Helpers
  const addToCart = (item: InventoryItem) => {
    setOrderCart(prev => ({
      ...prev,
      [item.id]: {
        itemId: item.id,
        name: item.name,
        qty: (prev[item.id]?.qty || 0) + 1,
        unit: item.unit
      }
    }));
  };

  const removeFromCart = (itemId: number) => {
    setOrderCart(prev => {
      const next = { ...prev };
      if (next[itemId]?.qty > 1) {
        next[itemId].qty -= 1;
      } else {
        delete next[itemId];
      }
      return next;
    });
  };

  const cartArray = Object.values(orderCart);

  const handleSubmitOrder = async () => {
    if (cartArray.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_ORDER",
          payload: {
            items: cartArray.map(c => ({ itemId: c.itemId, itemName: c.name, requestedQty: c.qty, unit: c.unit })),
            notes: orderNotes || "Request restock rutin dari Barista ke Gudang",
            requestedBy: role === "BARISTA" ? "Barista (Shift Aktif)" : "Admin/Owner (Via Bar Tab)"
          }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        setOrderCart({});
        setOrderNotes("");
        onRefresh();
        showToast(`🎉 ${data.message}`, "ok");
      } else {
        showToast("Gagal: " + data.message, "warn");
      }
    } catch (e) {
      console.error(e);
      showToast("Terjadi kesalahan sistem saat mengirim order.", "warn");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleQuickOrderHabis = async () => {
    setIsQuickOrdering(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "QUICK_ORDER_HABIS", payload: {} })
      });
      const data = await res.json();
      if (data.status === "success") {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        onRefresh();
        showToast(`⚡ ${data.message}`, "ok");
        onSwitchToOrders();
      } else {
        showToast(data.message, "warn");
      }
    } catch (e) {
      console.error(e);
      showToast("Terjadi kesalahan saat mengeksekusi Order Cepat.", "warn");
    } finally {
      setIsQuickOrdering(false);
    }
  };

  // Admin Stop Opname & Update Harga
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADJUST_STOCK",
          payload: {
            itemId: editingItem.id,
            gudangStock: editGudangQty,
            barStock: editBarQty,
            pricePerUnit: editPrice,
            notes: editNotes || undefined
          }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setEditingItem(null);
        onRefresh();
        showToast(`✅ ${data.message}`, "ok");
      } else {
        showToast("Error: " + data.message, "warn");
      }
    } catch (e) {
      console.error(e);
      showToast("Terjadi kesalahan koneksi.", "warn");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditGudangQty(item.gudangStock);
    setEditBarQty(item.barStock);
    setEditPrice(item.pricePerUnit);
    setEditNotes("");
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "KOPI": return "☕";
      case "POWDER": return "🍫";
      case "CUP": return "🥤";
      case "SIRUP": return "🧪";
      default: return "📦";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-28">
      {/* Header Banner */}
      <div className="bg-stone-900/90 border border-stone-800/80 p-6 sm:p-7 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 block mb-1">
              {viewMode === "GUDANG" ? "Gudang Utama (Grosir)" : "Meja Bar (Eceran Barista)"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              {viewMode === "GUDANG" ? "Daftar Stok Grosir di Gudang" : "Persediaan Bahan Baku di Bar"}
            </h2>
            <p className="text-stone-400 text-sm mt-1 max-w-2xl">
              {viewMode === "GUDANG" 
                ? "Pusat penyimpanan grosir. Stok gudang otomatis terpotong saat menyetujui pesanan dari Barista."
                : "Barista dapat langsung update stok sendiri kapan saja. Tekan tombol \"Pakai\" tiap kali bahan terpakai, atau tekan \"Ubah\" untuk mengoreksi jumlah stok yang sebenarnya."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center shrink-0">
            {viewMode === "GUDANG" && (
              <div className="bg-stone-950/80 border border-stone-800 px-4 py-3 rounded-xl">
                <span className="text-[11px] text-stone-400 uppercase tracking-wider block">Valuasi Stok Grosir</span>
                <span className="text-lg font-extrabold text-white flex items-center gap-1 mt-0.5">
                  {formatRp(totalWarehouseValue)}
                </span>
              </div>
            )}
            
            {viewMode === "BAR" && (
              <button
                onClick={handleQuickOrderHabis}
                disabled={isQuickOrdering || zeroCount === 0}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold px-5 py-3.5 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                title="Satu klik pesan semua bahan yang habis di bar"
              >
                <Sparkles className="w-4 h-4 text-stone-950" />
                <span>Order Cepat Semua Habis ({zeroCount})</span>
              </button>
            )}

            {viewMode === "GUDANG" && role === "ADMIN" && (
              <button
                onClick={onOpenNewItemModal}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold px-4 py-3.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Bahan</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Bar khusus Barista */}
        {viewMode === "BAR" && (
          <div className="mt-5 pt-5 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5 bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/60">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <PackageMinus className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">1. Habis Terpakai?</span>
                <span className="text-[11px] text-stone-400">Tekan tombol <strong className="text-rose-300">Pakai</strong> di kartu bahan untuk mengurangi stok secara langsung.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/60">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">2. Jumlah Tak Sesuai?</span>
                <span className="text-[11px] text-stone-400">Tekan <strong className="text-blue-300">Ubah</strong> untuk memasukkan angka stok fisik yang sebenarnya.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/60">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">3. Stok Menipis?</span>
                <span className="text-[11px] text-stone-400">Tekan <strong className="text-amber-300">Order</strong> untuk meminta kiriman bahan dari Gudang.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-stone-900/80 border border-stone-800/80 p-3.5 sm:p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "Semua Bahan", icon: "🏬" },
            { id: "KOPI", label: "Kopi", icon: "☕" },
            { id: "POWDER", label: "Powder", icon: "🍫" },
            { id: "CUP", label: "Cup & Kemasan", icon: "🥤" },
            { id: "SIRUP", label: "Sirup", icon: "🧪" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-stone-800 text-white font-bold shadow-sm"
                  : "text-stone-400 hover:bg-stone-800/50 hover:text-stone-200"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama varian..."
              className="w-full pl-9 pr-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-stone-950 border border-stone-800 text-stone-300 text-xs px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Semua Status ({totalItemsCount})</option>
            <option value="AMAN">🟢 Aman ({amanCount})</option>
            <option value="TIPIS">🟡 Tipis ({tipisCount})</option>
            <option value="HABIS">🔴 Habis ({zeroCount})</option>
          </select>
        </div>
      </div>

      {/* Inventory Cards */}
      {filteredItems.length === 0 ? (
        <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-12 text-center text-stone-400 my-6">
          <Box className="w-12 h-12 mx-auto mb-3 text-stone-600 stroke-1" />
          <h3 className="text-base font-bold text-white mb-1">Bahan Baku Tidak Ditemukan</h3>
          <p className="text-xs max-w-xs mx-auto text-stone-500">
            Coba ganti kata kunci pencarian atau reset filter di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const currentStock = viewMode === "GUDANG" ? item.gudangStock : item.barStock;
            const otherStock = viewMode === "GUDANG" ? item.barStock : item.gudangStock;
            const minThreshold = viewMode === "GUDANG" ? item.minGudangStock : item.minBarStock;

            let statusBadge = { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Aman" };
            if (currentStock === 0) {
              statusBadge = { bg: "bg-rose-500/15 text-rose-400 border-rose-500/30", label: "Habis" };
            } else if (currentStock <= minThreshold) {
              statusBadge = { bg: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Tipis" };
            }

            const cartQty = orderCart[item.id]?.qty || 0;
            const isUsing = usingItemId === item.id;

            return (
              <div
                key={item.id}
                className="bg-stone-900/90 border border-stone-800/80 rounded-2xl p-5 hover:border-stone-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-stone-400 font-medium">
                      <span>{getCategoryIcon(item.category)}</span>
                      <span>{item.category}</span>
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors mb-4">
                    {item.name}
                  </h4>

                  <div className="p-3.5 bg-stone-950/80 rounded-xl border border-stone-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-stone-500 uppercase font-semibold block">
                        Stok {viewMode === "GUDANG" ? "Gudang" : "Bar"}
                      </span>
                      <div className={`text-2xl font-black mt-0.5 transition-colors ${isUsing ? "text-amber-400 animate-pulse" : "text-white"}`}>
                        {currentStock} <span className="text-xs font-normal text-stone-400">{item.unit}</span>
                      </div>
                    </div>
                    <div className="text-right pl-3 border-l border-stone-800/80">
                      <span className="text-[11px] text-stone-500 block">
                        Di {viewMode === "GUDANG" ? "Bar" : "Gudang"}:
                      </span>
                      <span className="text-sm font-bold text-stone-300">
                        {otherStock} {item.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3.5 border-t border-stone-800/80">
                  {viewMode === "BAR" ? (
                    <div className="space-y-2">
                      {/* BARIS 1: Barista Update Stok Sendiri (Pakai & Ubah) */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUseStock(item, 1)}
                          disabled={item.barStock === 0 || isUsing}
                          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border active:scale-95 ${
                            item.barStock > 0
                              ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                              : "bg-stone-950 text-stone-600 border-stone-800 cursor-not-allowed"
                          }`}
                          title="Kurangi 1 stok karena bahan sudah terpakai di bar"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>{isUsing ? "Menyimpan..." : `Pakai 1 ${item.unit}`}</span>
                        </button>

                        <button
                          onClick={() => startBarEdit(item)}
                          className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                          title="Ubah / koreksi jumlah stok di bar"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Ubah</span>
                        </button>
                      </div>

                      {/* BARIS 2: Order ke Gudang */}
                      {cartQty > 0 ? (
                        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-1">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-9 h-9 rounded-lg bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center font-bold text-base transition-colors"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-amber-400 text-xs px-2">
                            Order: {cartQty} {item.unit}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-9 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center font-bold text-base transition-colors"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          disabled={item.gudangStock === 0}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                            item.gudangStock > 0
                              ? "bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-stone-700"
                              : "bg-stone-950 text-stone-600 border border-stone-800 cursor-not-allowed"
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {item.gudangStock > 0 ? "Order ke Gudang" : "Gudang Juga Kosong"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-2 text-xs">
                      <div className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl">
                        <span className="text-amber-300 font-extrabold text-sm">{formatRp(item.pricePerUnit)}</span>
                        <span className="text-[11px] text-stone-400 font-normal"> /{item.unit}</span>
                      </div>
                      <button
                        onClick={() => startEdit(item)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 font-bold rounded-xl text-xs transition-all border border-stone-700 active:scale-95 shadow-sm shrink-0"
                        title="Atur harga beli saat ini dan hitungan stok fisik"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Atur Stok & Harga</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-xl shadow-2xl border text-xs font-bold max-w-md text-center animate-fadeIn ${
          toast.type === "ok"
            ? "bg-stone-900 border-emerald-500/40 text-emerald-300"
            : "bg-stone-900 border-amber-500/50 text-amber-300"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* FLOATING CART BANNER */}
      {viewMode === "BAR" && cartArray.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-4xl bg-stone-900 border border-amber-500/50 p-4 sm:p-5 rounded-2xl shadow-2xl z-40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slideUp">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 font-bold shadow-sm shrink-0">
              <ShoppingCart className="w-6 h-6 text-stone-950" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">
                Siap Kirim Order ke Gudang ({cartArray.length} jenis bahan)
              </h4>
              <p className="text-stone-400 text-xs truncate max-w-xs mt-0.5">
                {cartArray.map(i => `${i.name} (${i.qty})`).join(", ")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Catatan untuk gudang..."
              className="bg-stone-950 border border-stone-800 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 w-full sm:w-48 transition-colors"
            />
            <button
              onClick={() => setOrderCart({})}
              className="px-3 py-2 text-stone-400 hover:text-white text-xs font-semibold whitespace-nowrap"
            >
              Batal
            </button>
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmittingOrder}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold px-6 py-3 rounded-xl shadow-sm transition-all flex items-center gap-2 text-xs whitespace-nowrap active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-stone-950" />
              <span>{isSubmittingOrder ? "Mengirim..." : "Kirim Order"}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: BARISTA UPDATE STOK BAR */}
      {barEditItem && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <Coffee className="w-5 h-5 text-amber-500" />
                  <span>Update Stok Bar</span>
                </h3>
                <span className="text-xs text-stone-400 mt-0.5 inline-block">
                  {barEditItem.name} • {barEditItem.category} • Satuan {barEditItem.unit}
                </span>
              </div>
              <button
                onClick={() => setBarEditItem(null)}
                className="w-8 h-8 rounded-lg bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Big Stepper Control */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block text-center mb-3">
                Jumlah Stok Tersisa di Bar Sekarang
              </span>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setBarEditQty(Math.max(0, barEditQty - 1))}
                  className="w-14 h-14 rounded-2xl bg-stone-800 hover:bg-rose-500/20 hover:text-rose-300 text-white flex items-center justify-center text-2xl font-bold transition-all active:scale-90 border border-stone-700"
                >
                  −
                </button>

                <div className="text-center min-w-[110px]">
                  <input
                    type="number"
                    min="0"
                    value={barEditQty}
                    onChange={(e) => setBarEditQty(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-transparent text-center text-5xl font-black text-white focus:outline-none"
                  />
                  <span className="text-xs text-stone-400 font-medium">{barEditItem.unit}</span>
                </div>

                <button
                  onClick={() => setBarEditQty(barEditQty + 1)}
                  className="w-14 h-14 rounded-2xl bg-stone-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-white flex items-center justify-center text-2xl font-bold transition-all active:scale-90 border border-stone-700"
                >
                  +
                </button>
              </div>

              {/* Quick Deduction Chips */}
              <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
                <span className="text-[11px] text-stone-500 font-medium mr-1">Cepat pakai:</span>
                {[1, 2, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBarEditQty(Math.max(0, barEditQty - n))}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-rose-500/20 border border-stone-800 text-rose-300 text-xs font-bold transition-all"
                  >
                    −{n}
                  </button>
                ))}
                <button
                  onClick={() => setBarEditQty(0)}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all"
                >
                  Habis (0)
                </button>
              </div>

              <p className="text-center text-[11px] text-stone-500 mt-4 pt-3 border-t border-stone-800/80">
                Stok tercatat sebelumnya: <strong className="text-stone-300">{barEditItem.barStock} {barEditItem.unit}</strong>
                {barEditQty !== barEditItem.barStock && (
                  <span className={`ml-1.5 font-bold ${barEditQty < barEditItem.barStock ? "text-rose-400" : "text-emerald-400"}`}>
                    ({barEditQty > barEditItem.barStock ? "+" : ""}{barEditQty - barEditItem.barStock})
                  </span>
                )}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
                Catatan Pemakaian (Opsional)
              </label>
              <input
                type="text"
                value={barEditNotes}
                onChange={(e) => setBarEditNotes(e.target.value)}
                placeholder="Contoh: Terpakai untuk 20 gelas es kopi susu"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setBarEditItem(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBarStock}
                disabled={isSavingBarEdit}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold transition-all shadow-sm active:scale-95 flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-stone-950" />
                <span>{isSavingBarEdit ? "Menyimpan..." : "Simpan Stok Bar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN ATUR STOK & HARGA GUDANG */}
      {editingItem && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <Edit3 className="w-5 h-5 text-amber-500" />
                  <span>Atur Stok & Harga</span>
                </h3>
                <span className="text-xs text-amber-400 mt-0.5 inline-block font-semibold">
                  {editingItem.name} · {editingItem.category} · /{editingItem.unit}
                </span>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-lg bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
                  🏢 Stok di Gudang (Grosir)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editGudangQty}
                    onChange={(e) => setEditGudangQty(Number(e.target.value))}
                    className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <span className="text-sm font-medium text-stone-400">{editingItem.unit}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
                  ☕ Stok di Area Bar (Eceran)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editBarQty}
                    onChange={(e) => setEditBarQty(Number(e.target.value))}
                    className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <span className="text-sm font-medium text-stone-400">{editingItem.unit}</span>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1.5 flex items-center gap-1.5">
                  💰 Harga Beli per Unit (Rp / {editingItem.unit})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-lg">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-amber-500/30 rounded-xl pl-12 pr-4 py-3 text-amber-300 font-bold text-lg focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                {editPrice !== editingItem.pricePerUnit && (
                  <p className="text-[11px] text-amber-400/80 mt-2 font-medium flex items-center gap-1">
                    ⚡ Harga berubah dari <strong>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(editingItem.pricePerUnit)}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
                  📝 Catatan Perubahan (Opsional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Contoh: Penyesuaian setelah hitung fisik mingguan..."
                  rows={2}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                ></textarea>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold transition-all shadow-sm active:scale-95"
              >
                {isSavingEdit ? "Menyimpan..." : "Simpan Stok & Harga"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
