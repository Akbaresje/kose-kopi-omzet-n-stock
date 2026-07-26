"use client";

import React, { useState } from "react";
import { RestockOrder, ActiveRole } from "@/types";
import { 
  CheckCircle2, XCircle, Clock, User, Calendar, MessageSquare, Inbox 
} from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  orders: RestockOrder[];
  role: ActiveRole;
  onRefresh: () => void;
}

export function OrderManagement({ orders, role, onRefresh }: Props) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState<string>("");

  const filteredOrders = orders.filter(o => 
    filterStatus === "ALL" || o.status === filterStatus
  );

  const pendingCount = orders.filter(o => o.status === "PENDING").length;

  const handleApprove = async (orderId: number) => {
    setProcessingId(orderId);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_ORDER",
          payload: {
            orderId,
            approvedBy: role === "ADMIN" ? "Owner / Admin Gudang" : "Kepala Barista"
          }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        onRefresh();
      } else {
        alert("Gagal menyetujui: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem saat memproses approve.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (orderId: number) => {
    setProcessingId(orderId);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT_ORDER",
          payload: {
            orderId,
            notes: rejectNote || "Ditolak oleh Admin (Stok Gudang Tidak Mencukupi)"
          }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setRejectingId(null);
        setRejectNote("");
        onRefresh();
      } else {
        alert("Gagal menolak pesanan: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem saat menolak pesanan.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("id-ID", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header Banner - Clean & Minimal */}
      <div className="bg-stone-900/90 border border-stone-800/80 p-6 sm:p-7 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 block mb-1">
              Restock Bar dari Gudang
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Permintaan Penambahan Stok Bar
            </h2>
            <p className="text-stone-400 text-sm mt-1 max-w-2xl">
              Daftar pesanan dari Barista untuk menambah sediaan di area Bar. Klik Setujui (Approve) agar stok Gudang otomatis dikurangi dan dikirim ke Bar.
            </p>
          </div>

          {pendingCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-3 rounded-xl flex items-center gap-3 shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[11px] text-stone-400 font-semibold block">Menunggu Persetujuan</span>
                <span className="text-base font-extrabold text-amber-400">{pendingCount} Pesanan Baru</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-stone-900/80 border border-stone-800/80 p-3 sm:p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {[
            { id: "ALL", label: "Semua Permintaan", count: orders.length },
            { id: "PENDING", label: "🕒 Menunggu Persetujuan", count: pendingCount },
            { id: "APPROVED", label: "✅ Disetujui", count: orders.filter(o => o.status === "APPROVED").length },
            { id: "REJECTED", label: "❌ Ditolak", count: orders.filter(o => o.status === "REJECTED").length },
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
              <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                filterStatus === tab.id ? "bg-stone-950 text-amber-400" : "bg-stone-950 text-stone-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-12 text-center text-stone-400 my-6">
          <Inbox className="w-12 h-12 mx-auto mb-3 text-stone-600 stroke-1" />
          <h3 className="text-base font-bold text-white mb-1">Belum Ada Permintaan</h3>
          <p className="text-xs max-w-xs mx-auto text-stone-500">
            Barista dapat menekan tombol &apos;Order ke Gudang&apos; di menu Stok Bar jika membutuhkan penambahan suplai.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === "PENDING";
            const isApproved = order.status === "APPROVED";
            const isRejected = order.status === "REJECTED";

            return (
              <div
                key={order.id}
                className={`bg-stone-900/90 border rounded-2xl p-5 md:p-6 shadow-sm transition-all ${
                  isPending ? "border-amber-500/40 bg-gradient-to-r from-stone-900 to-amber-950/10" : "border-stone-800/80"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800/80 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-extrabold text-white text-sm font-mono bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                        {order.orderNumber}
                      </span>
                      {isPending && (
                        <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs border border-amber-500/20 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Persetujuan
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui & Dikirim ke Bar
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 font-bold text-xs border border-rose-500/20 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" /> Pesanan Ditolak
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-stone-400 mt-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-stone-500" />
                        <span>Diajukan oleh: <strong className="text-stone-300">{order.requestedBy}</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span>{formatDate(order.createdAt)}</span>
                      </span>
                      {order.approvedBy && (
                        <span className="text-emerald-400">
                          Disetujui oleh: {order.approvedBy}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Approve / Reject Actions */}
                  {isPending && (
                    <div className="flex items-center gap-3 shrink-0">
                      {rejectingId === order.id ? (
                        <div className="flex items-center gap-2 bg-stone-950 p-1.5 rounded-xl border border-rose-500/40">
                          <input
                            type="text"
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Alasan penolakan..."
                            className="bg-transparent text-xs px-2 text-white focus:outline-none w-36"
                          />
                          <button
                            onClick={() => handleReject(order.id)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg"
                          >
                            Tolak
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="px-2 py-1.5 text-stone-400 text-xs hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setRejectingId(order.id)}
                            disabled={processingId === order.id}
                            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-rose-600/20 text-stone-300 hover:text-rose-300 text-xs font-bold transition-all border border-stone-700"
                          >
                            Tolak
                          </button>
                          <button
                            onClick={() => handleApprove(order.id)}
                            disabled={processingId === order.id}
                            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4 text-stone-950" />
                            <span>{processingId === order.id ? "Memproses..." : "Setujui & Kirim Stok"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Items list */}
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Item yang Diminta ({order.items.length} jenis)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="bg-stone-950/80 border border-stone-800/80 p-3.5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center font-bold text-stone-400 text-xs shrink-0">
                            #{idx + 1}
                          </div>
                          <div>
                            <h6 className="font-bold text-white text-sm">{item.itemName}</h6>
                            <span className="text-xs text-stone-400">Satuan {item.unit}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-stone-500 block">Jumlah Minta:</span>
                          <span className="text-base font-extrabold text-amber-400">
                            {item.requestedQty} <span className="text-xs font-normal text-stone-400">{item.unit}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes if present */}
                {order.notes && (
                  <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-start gap-2 text-xs bg-stone-950/50 p-3 rounded-xl border border-stone-800">
                    <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block text-stone-300 text-[11px] uppercase">Catatan:</span>
                      <p className="italic text-stone-400">{order.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
