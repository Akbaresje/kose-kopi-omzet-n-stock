"use client";

import React, { useState } from "react";
import { PurchaseOrder, InventoryItem } from "@/types";
import {
  Truck, CheckCircle2, Clock, Package, User, Calendar, MessageSquare,
  Inbox, Plus, X, Send, ClipboardCheck, AlertCircle
} from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  purchaseOrders: PurchaseOrder[];
  items: InventoryItem[];
  onRefresh: () => void;
}

export function PurchaseOrderView({ purchaseOrders, items, onRefresh }: Props) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [processingId, setProcessingId] = useState<number | null>(null);

  // === Modal: Admin buat PO baru ===
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [poNotes, setPoNotes] = useState("");
  const [poItems, setPoItems] = useState<{ itemId: number; itemName: string; unit: string; orderedQty: number }[]>([]);
  const [addItemId, setAddItemId] = useState<string>("");
  const [addQty, setAddQty] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === Modal: Tim Gudang validasi barang masuk ===
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveBy, setReceiveBy] = useState("Tim Gudang");
  const [isReceiving, setIsReceiving] = useState(false);

  const filteredPOs = purchaseOrders.filter(po =>
    filterStatus === "ALL" || po.status === filterStatus
  );

  const orderedCount = purchaseOrders.filter(po => po.status === "ORDERED").length;

  // Bahan baku yang berstok 0 di gudang (saran otomatis)
  const outOfStockItems = items.filter(i => i.gudangStock === 0);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("id-ID", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch { return dateStr; }
  };

  // === Logika Buat PO ===
  const handleAddItem = () => {
    const id = Number(addItemId);
    if (!id || poItems.find(p => p.itemId === id)) return;
    const found = items.find(i => i.id === id);
    if (!found) return;
    setPoItems([...poItems, { itemId: found.id, itemName: found.name, unit: found.unit, orderedQty: addQty }]);
    setAddItemId("");
    setAddQty(5);
  };

  const handleAutoFillHabis = () => {
    const newItems = outOfStockItems
      .filter(i => !poItems.find(p => p.itemId === i.id))
      .map(i => ({
        itemId: i.id,
        itemName: i.name,
        unit: i.unit,
        orderedQty: i.unit === "Botol" ? 6 : i.unit === "Pcs" ? 5 : 10,
      }));
    setPoItems([...poItems, ...newItems]);
  };

  const handleRemoveItem = (itemId: number) => {
    setPoItems(poItems.filter(p => p.itemId !== itemId));
  };

  const handleSubmitPO = async () => {
    if (poItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PO",
          payload: { items: poItems, notes: poNotes, orderedBy: "Admin / Owner" }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        setShowCreateModal(false);
        setPoItems([]);
        setPoNotes("");
        onRefresh();
      } else {
        alert("Gagal: " + data.message);
      }
    } catch { alert("Terjadi kesalahan koneksi."); }
    finally { setIsSubmitting(false); }
  };

  // === Logika Tim Gudang Terima Barang ===
  const openReceiveModal = (po: PurchaseOrder) => {
    setReceivePO(po);
    const initQtys: Record<number, number> = {};
    po.items.forEach(item => {
      initQtys[item.id!] = item.orderedQty; // default = terima semua
    });
    setReceiveQtys(initQtys);
    setReceiveNotes("");
    setReceiveBy("Tim Gudang");
  };

  const handleReceivePO = async () => {
    if (!receivePO) return;
    setIsReceiving(true);
    try {
      const receivedItems = receivePO.items.map(item => ({
        poItemId: item.id,
        itemId: item.itemId,
        orderedQty: item.orderedQty,
        receivedQty: receiveQtys[item.id!] ?? 0,
      }));

      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECEIVE_PO",
          payload: { poId: receivePO.id, receivedItems, receivedBy: receiveBy, receiveNotes }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        setReceivePO(null);
        onRefresh();
      } else {
        alert("Gagal: " + data.message);
      }
    } catch { alert("Terjadi kesalahan koneksi."); }
    finally { setIsReceiving(false); }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="bg-stone-900/90 border border-stone-800/80 p-6 sm:p-7 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 block mb-1">
              Pemesanan Bahan Baku ke Supplier
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Order Supplier & Barang Masuk
            </h2>
            <p className="text-stone-400 text-sm mt-1 max-w-2xl">
              Admin membuat PO (Purchase Order) ke supplier untuk bahan yang habis. Tim Gudang memvalidasi dan mencatat jumlah barang yang diterima saat kiriman tiba.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {orderedCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-3 rounded-xl flex items-center gap-3">
                <Truck className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-[11px] text-stone-400 font-semibold block">Dalam Pengiriman</span>
                  <span className="text-base font-extrabold text-amber-400">{orderedCount} PO Belum Tiba</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold px-5 py-3.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Buat PO Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-stone-900/80 border border-stone-800/80 p-3.5 sm:p-4 rounded-2xl shadow-sm flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {[
          { id: "ALL", label: "Semua PO", count: purchaseOrders.length },
          { id: "ORDERED", label: "📦 Menunggu Kiriman", count: orderedCount },
          { id: "PARTIAL", label: "⚠️ Diterima Sebagian", count: purchaseOrders.filter(p => p.status === "PARTIAL").length },
          { id: "RECEIVED", label: "✅ Diterima Lengkap", count: purchaseOrders.filter(p => p.status === "RECEIVED").length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              filterStatus === tab.id
                ? "bg-stone-800 text-white font-bold shadow-sm"
                : "text-stone-400 hover:bg-stone-800/50 hover:text-stone-200"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${filterStatus === tab.id ? "bg-stone-950 text-amber-400" : "bg-stone-950 text-stone-400"}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* PO List */}
      {filteredPOs.length === 0 ? (
        <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-12 text-center text-stone-400 my-6">
          <Inbox className="w-12 h-12 mx-auto mb-3 text-stone-600 stroke-1" />
          <h3 className="text-base font-bold text-white mb-1">Belum Ada Purchase Order</h3>
          <p className="text-xs max-w-xs mx-auto text-stone-500">
            Klik tombol &quot;Buat PO Baru&quot; untuk mulai memesan bahan baku ke supplier.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPOs.map((po) => {
            const isOrdered = po.status === "ORDERED";
            const isReceived = po.status === "RECEIVED";
            const isPartial = po.status === "PARTIAL";

            return (
              <div key={po.id} className={`bg-stone-900/90 border rounded-2xl p-5 md:p-6 shadow-sm transition-all ${
                isOrdered ? "border-amber-500/40" : isPartial ? "border-orange-500/40" : "border-stone-800/80"
              }`}>
                {/* PO Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800/80 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-extrabold text-white text-sm font-mono bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                        {po.poNumber}
                      </span>
                      {isOrdered && (
                        <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs border border-amber-500/20 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" /> Sudah Dipesan — Menunggu Kiriman
                        </span>
                      )}
                      {isPartial && (
                        <span className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-400 font-bold text-xs border border-orange-500/20 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> Diterima Sebagian
                        </span>
                      )}
                      {isReceived && (
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Diterima Lengkap
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-stone-400 mt-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-stone-500" />
                        Dipesan oleh: <strong className="text-stone-300">{po.orderedBy}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        {formatDate(po.createdAt)}
                      </span>
                      {po.receivedBy && (
                        <span className="text-emerald-400">
                          Divalidasi oleh: {po.receivedBy} {po.receivedAt ? `(${formatDate(po.receivedAt)})` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action: Tim Gudang validasi */}
                  {(isOrdered || isPartial) && (
                    <button
                      onClick={() => openReceiveModal(po)}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                      <ClipboardCheck className="w-4 h-4 text-stone-950" />
                      <span>Validasi Barang Masuk</span>
                    </button>
                  )}
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                    Daftar Bahan Dipesan ({po.items.length} jenis)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {po.items.map((item, idx) => {
                      const isFullyReceived = item.receivedQty >= item.orderedQty;
                      const isPartiallyReceived = item.receivedQty > 0 && item.receivedQty < item.orderedQty;

                      return (
                        <div key={idx} className="bg-stone-950/80 border border-stone-800/80 p-3.5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                              isFullyReceived ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : isPartiallyReceived ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                              : "bg-stone-900 border-stone-800 text-stone-400"
                            }`}>
                              {isFullyReceived ? "✓" : `#${idx + 1}`}
                            </div>
                            <div className="min-w-0">
                              <h6 className="font-bold text-white text-sm truncate">{item.itemName}</h6>
                              <span className="text-[11px] text-stone-400">{item.unit}</span>
                            </div>
                          </div>
                          <div className="text-right pl-3 shrink-0">
                            <span className="text-[11px] text-stone-500 block">Pesan / Terima:</span>
                            <span className="text-sm font-extrabold text-white">
                              {item.orderedQty}
                              {(isReceived || isPartial) && (
                                <span className={`ml-1 ${item.receivedQty >= item.orderedQty ? "text-emerald-400" : "text-orange-400"}`}>
                                  / {item.receivedQty}
                                </span>
                              )}
                              <span className="text-xs font-normal text-stone-400 ml-0.5">{item.unit}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                {(po.notes || po.receiveNotes) && (
                  <div className="mt-4 pt-3 border-t border-stone-800/80 space-y-2">
                    {po.notes && (
                      <div className="flex items-start gap-2 text-xs bg-stone-950/50 p-3 rounded-xl border border-stone-800">
                        <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div><span className="font-semibold block text-stone-300 text-[11px] uppercase">Catatan Admin:</span><p className="italic text-stone-400">{po.notes}</p></div>
                      </div>
                    )}
                    {po.receiveNotes && (
                      <div className="flex items-start gap-2 text-xs bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20">
                        <ClipboardCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div><span className="font-semibold block text-emerald-400 text-[11px] uppercase">Catatan Tim Gudang:</span><p className="italic text-stone-300">{po.receiveNotes}</p></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========== MODAL: ADMIN BUAT PO BARU ========== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <Truck className="w-5 h-5 text-amber-500" />
                  Buat Purchase Order ke Supplier
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Pilih bahan baku dan jumlah yang ingin dipesan ke supplier / roaster.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-xs font-bold">✕</button>
            </div>

            {/* Tombol Isi Otomatis */}
            {outOfStockItems.length > 0 && (
              <button
                onClick={handleAutoFillHabis}
                className="w-full py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <AlertCircle className="w-4 h-4" />
                Isi Otomatis Semua Bahan Habis di Gudang ({outOfStockItems.length} item)
              </button>
            )}

            {/* Tambah Item Manual */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">Pilih Bahan Baku</label>
                <select
                  value={addItemId}
                  onChange={(e) => setAddItemId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-3 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilih Bahan --</option>
                  {items.filter(i => !poItems.find(p => p.itemId === i.id)).map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.category}) — Gudang: {i.gudangStock} {i.unit}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">Jumlah</label>
                <input type="number" min="1" value={addQty} onChange={(e) => setAddQty(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-3 text-white font-bold text-sm focus:outline-none focus:border-amber-500 text-center" />
              </div>
              <button onClick={handleAddItem} disabled={!addItemId}
                className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Daftar Item di PO */}
            {poItems.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase text-stone-400">Item yang Akan Dipesan ({poItems.length})</h5>
                {poItems.map((item, idx) => (
                  <div key={idx} className="bg-stone-950 border border-stone-800 p-3 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">{idx + 1}</span>
                      <span className="text-sm font-bold text-white truncate">{item.itemName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <input type="number" min="1" value={item.orderedQty}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].orderedQty = Math.max(1, Number(e.target.value));
                          setPoItems(updated);
                        }}
                        className="w-16 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-white font-bold text-xs text-center focus:outline-none focus:border-amber-500" />
                      <span className="text-xs text-stone-400 w-10">{item.unit}</span>
                      <button onClick={() => handleRemoveItem(item.itemId)} className="w-7 h-7 rounded-lg bg-stone-900 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 flex items-center justify-center transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">Catatan untuk Supplier (Opsional)</label>
              <input type="text" value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder="Contoh: Kirim hari ini via ekspedisi biasa..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
            </div>

            <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold">Batal</button>
              <button onClick={handleSubmitPO} disabled={poItems.length === 0 || isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold transition-all shadow-sm active:scale-95 flex items-center gap-2 disabled:opacity-40">
                <Send className="w-4 h-4 text-stone-950" />
                {isSubmitting ? "Mengirim..." : `Buat PO (${poItems.length} item)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: TIM GUDANG VALIDASI BARANG MASUK ========== */}
      {receivePO && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                  Validasi Barang Masuk
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  PO <strong className="text-white">{receivePO.poNumber}</strong> — Masukkan jumlah barang yang benar-benar diterima di gudang.
                </p>
              </div>
              <button onClick={() => setReceivePO(null)} className="w-8 h-8 rounded-lg bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-xs font-bold">✕</button>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs text-amber-300 font-medium">
                💡 Isi jumlah yang diterima sesuai kondisi fisik. Jika ada barang yang kurang atau rusak, tulis jumlah yang benar-benar masuk. Stok gudang akan <strong>otomatis bertambah</strong> sesuai angka yang Anda input.
              </p>
            </div>

            {/* Item List with Receive Input */}
            <div className="space-y-3">
              {receivePO.items.map((item, idx) => (
                <div key={idx} className="bg-stone-950 border border-stone-800 p-4 rounded-xl">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <h6 className="font-bold text-white text-sm truncate">{item.itemName}</h6>
                        <span className="text-[11px] text-stone-400">Satuan: {item.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-stone-500 block">Jumlah Dipesan:</span>
                      <span className="text-base font-extrabold text-amber-400">{item.orderedQty} <span className="text-xs font-normal text-stone-400">{item.unit}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-stone-900/80 p-3 rounded-xl border border-stone-800">
                    <label className="text-xs text-stone-300 font-semibold whitespace-nowrap">Jumlah Diterima:</label>
                    <div className="flex items-center gap-2 flex-1">
                      <button onClick={() => setReceiveQtys(prev => ({ ...prev, [item.id!]: Math.max(0, (prev[item.id!] || 0) - 1) }))}
                        className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center font-bold text-lg transition-colors active:scale-90 border border-stone-700">−</button>
                      <input type="number" min="0" value={receiveQtys[item.id!] ?? 0}
                        onChange={(e) => setReceiveQtys(prev => ({ ...prev, [item.id!]: Math.max(0, Number(e.target.value)) }))}
                        className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-black text-xl text-center focus:outline-none focus:border-emerald-500" />
                      <button onClick={() => setReceiveQtys(prev => ({ ...prev, [item.id!]: (prev[item.id!] || 0) + 1 }))}
                        className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center font-bold text-lg transition-colors active:scale-90 border border-stone-700">+</button>
                    </div>
                    <span className="text-xs text-stone-400 font-medium w-10">{item.unit}</span>
                  </div>

                  {(receiveQtys[item.id!] ?? 0) < item.orderedQty && (
                    <p className="text-[11px] text-orange-400 mt-2 font-medium">
                      ⚠️ Diterima kurang {item.orderedQty - (receiveQtys[item.id!] ?? 0)} {item.unit} dari yang dipesan
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">Divalidasi Oleh</label>
                <input type="text" value={receiveBy} onChange={(e) => setReceiveBy(e.target.value)} placeholder="Nama penerima"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">Catatan Penerimaan</label>
                <input type="text" value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} placeholder="Contoh: 2 botol pecah..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
              <button onClick={() => setReceivePO(null)} className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold">Batal</button>
              <button onClick={handleReceivePO} disabled={isReceiving}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-extrabold transition-all shadow-sm active:scale-95 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-stone-950" />
                {isReceiving ? "Memproses..." : "Konfirmasi Barang Diterima"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
